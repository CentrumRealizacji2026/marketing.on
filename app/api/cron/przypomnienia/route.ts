import { NextResponse, type NextRequest } from "next/server";
import { and, eq, inArray, lt, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  dailyLogs,
  learningLogs,
  learningPlanWeek,
  learningPlanYear,
  medicationLogs,
  medications,
  pushSends,
  pushSubscriptions,
  reportSubmissions,
  settings as settingsTable,
  trainingLogs,
  trainingPlans,
  users,
} from "@/lib/db/schema";
import { safeEqual } from "@/lib/auth/session";
import { addDays, isoWeekday, minutesNowInTz, todayInTz } from "@/lib/domain/dates";
import { learningBlocksForDate } from "@/lib/domain/learning";
import { medicationScheduleForDate, type MedicationRow } from "@/lib/domain/medication";
import { dueReminders } from "@/lib/domain/reminders";
import { pushConfigured, sendPushToUser } from "@/lib/push/send";
import { getPaymentsInRange } from "@/lib/queries/obligations";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Tick przypomnień push — wywoływany co kwadrans przez harmonogram GitHub
 * Actions (Vercel Hobby umie crona tylko raz dziennie). Czysta logika „co jest
 * należne" siedzi w lib/domain/reminders.ts; tu tylko składamy dane per
 * użytkownik i pilnujemy, żeby nic nie wyszło dwa razy: wiersz w push_sends
 * wchodzi PRZED wysyłką (onConflictDoNothing) — wysyłamy tylko to, co weszło.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Brak CRON_SECRET w konfiguracji." }, { status: 500 });
  }

  const header = request.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!provided || !safeEqual(provided, secret)) {
    return NextResponse.json({ error: "Brak uprawnień." }, { status: 401 });
  }

  if (!pushConfigured()) {
    return NextResponse.json({ skipped: "Brak kluczy VAPID — wysyłka wyłączona." });
  }

  // Tylko użytkownicy z co najmniej jednym urządzeniem — reszty nie ma po co liczyć.
  const subscribedUsers = await db
    .selectDistinct({ userId: pushSubscriptions.userId })
    .from(pushSubscriptions);
  const userIds = subscribedUsers.map((row) => row.userId);
  if (userIds.length === 0) return NextResponse.json({ users: 0, sent: 0 });

  const rows = await db
    .select({ userId: users.id, settings: settingsTable })
    .from(users)
    .innerJoin(settingsTable, eq(settingsTable.userId, users.id))
    .where(inArray(users.id, userIds));

  let totalSent = 0;
  const results: Array<{ userId: string; due: number; sent: number; error?: string }> = [];

  for (const row of rows) {
    try {
      const timezone = row.settings.timezone;
      const today = todayInTz(timezone);
      const nowMin = minutesNowInTz(timezone);
      const weekday = isoWeekday(today);

      const [medRows, medLogRows, payments, planRows, trainingLogRows, weekPlans, yearPlans, learningLogRows, dailyRow, reportRow] =
        await Promise.all([
          db
            .select()
            .from(medications)
            .where(and(eq(medications.userId, row.userId), eq(medications.active, true))),
          db
            .select()
            .from(medicationLogs)
            .where(and(eq(medicationLogs.userId, row.userId), eq(medicationLogs.date, today))),
          getPaymentsInRange(row.userId, today, addDays(today, 3), today),
          db
            .select()
            .from(trainingPlans)
            .where(
              and(
                eq(trainingPlans.userId, row.userId),
                eq(trainingPlans.weekday, weekday),
                eq(trainingPlans.active, true),
              ),
            ),
          db
            .select()
            .from(trainingLogs)
            .where(and(eq(trainingLogs.userId, row.userId), eq(trainingLogs.date, today))),
          db
            .select()
            .from(learningPlanWeek)
            .where(and(eq(learningPlanWeek.userId, row.userId), eq(learningPlanWeek.active, true))),
          db.select().from(learningPlanYear).where(eq(learningPlanYear.userId, row.userId)),
          db
            .select()
            .from(learningLogs)
            .where(and(eq(learningLogs.userId, row.userId), eq(learningLogs.date, today))),
          db
            .select({ morningAt: dailyLogs.morningAt })
            .from(dailyLogs)
            .where(and(eq(dailyLogs.userId, row.userId), eq(dailyLogs.date, today)))
            .limit(1),
          db
            .select({ id: reportSubmissions.id })
            .from(reportSubmissions)
            .where(and(eq(reportSubmissions.userId, row.userId), eq(reportSubmissions.date, today)))
            .limit(1),
        ]);

      const schedule = medicationScheduleForDate(today, medRows as MedicationRow[], medLogRows);
      const blocks = learningBlocksForDate(today, weekPlans, yearPlans);

      const due = dueReminders(
        {
          doses: schedule.map((dose) => ({ slot: dose.slot, name: dose.name, taken: dose.taken })),
          payments,
          trainings: planRows.map((plan) => ({
            planId: plan.id,
            title: plan.title,
            discipline: plan.discipline,
            startTime: plan.startTime,
            durationMin: plan.durationMin,
            done: trainingLogRows.some((log) => log.planId === plan.id && log.done),
          })),
          learning: blocks.map((block) => ({
            planId: block.planId,
            skill: block.skill,
            startTime: block.startTime,
            durationMin: block.durationMin,
            done: learningLogRows.some((log) => log.planId === block.planId),
          })),
          morningFilled: Boolean(dailyRow[0]?.morningAt),
          reportSubmitted: reportRow.length > 0,
          currency: row.settings.currency,
          prefs: {
            leki: row.settings.pushMeds,
            raty: row.settings.pushBills,
            trening: row.settings.pushTraining,
            nauka: row.settings.pushLearning,
            poranek: row.settings.pushMorning,
            wieczor: row.settings.pushEvening,
          },
        },
        today,
        nowMin,
      );

      let sent = 0;
      for (const reminder of due) {
        // Dedupe odporny na równoległe ticki: kto pierwszy wstawi wiersz, ten wysyła.
        const inserted = await db
          .insert(pushSends)
          .values({ userId: row.userId, kind: reminder.kind, refKey: reminder.refKey })
          .onConflictDoNothing()
          .returning({ id: pushSends.id });
        if (inserted.length === 0) continue;

        const wynik = await sendPushToUser(row.userId, {
          title: reminder.title,
          body: reminder.body,
          url: reminder.url,
          tag: reminder.refKey,
        });
        sent += wynik.sent;
      }

      totalSent += sent;
      results.push({ userId: row.userId, due: due.length, sent });
    } catch (error) {
      results.push({ userId: row.userId, due: 0, sent: 0, error: error instanceof Error ? error.message : "?" });
    }
  }

  // Rejestr wysłanych nie musi rosnąć bez końca — klucze i tak zawierają datę.
  await db.delete(pushSends).where(lt(pushSends.sentAt, sql`now() - interval '14 days'`));

  return NextResponse.json({ users: rows.length, sent: totalSent, results });
}

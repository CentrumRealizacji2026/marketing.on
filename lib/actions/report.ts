"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  contracts,
  dailyLogs,
  learningLogs,
  learningPlanWeek,
  medicationLogs,
  medications,
  obligationPayments,
  obligations,
  personalRecords,
  reportSubmissions,
  salesDaily,
  savingsContributions,
  savingsGoals,
  tasks,
  trainingLogs,
  trainingPlans,
} from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { reportSchema } from "@/lib/validation/report";

export type ReportState = { error?: string } | undefined;

/**
 * Zapis raportu dziennego. Wszystko dotyczy jednego dnia, więc dane tego dnia są
 * zastępowane w całości — formularz jest wczytywany z aktualnymi wartościami, więc
 * to, co widać, jest tym, co zostanie zapisane.
 */
export async function submitReport(_prev: ReportState, formData: FormData): Promise<ReportState> {
  const user = await requireUser();

  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("payload") ?? "{}"));
  } catch {
    return { error: "Nie udało się odczytać formularza. Odśwież stronę i spróbuj ponownie." };
  }

  const parsed = reportSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Nieprawidłowe dane w formularzu." };
  }

  const report = parsed.data;
  const { date } = report;

  /* --------------------------------------------------- dzień: podstawowe */

  const dailyValues = {
    cashBalancePln: report.cashBalancePln,
    // Netto dnia w chwili wpisu stanu — raport zastępuje cały dzień, więc to netto
    // z tego samego payloadu; saldo na żywo doliczy tylko późniejsze przepływy.
    cashBalanceNetPln:
      report.cashBalancePln === null ? null : (report.incomePln ?? 0) - (report.expensesPln ?? 0),
    expensesPln: report.expensesPln,
    incomePln: report.incomePln,
    weightKg: report.weightKg,
    waterMl: report.waterMl === null ? null : Math.round(report.waterMl),
    sleepH: report.sleepH,
    mood: report.mood === null ? null : Math.round(report.mood),
    energy: report.energy === null ? null : Math.round(report.energy),
    stress: report.stress === null ? null : Math.round(report.stress),
    thoughts: report.thoughts,
    goodThings: report.goodThings,
    notes: report.notes,
    updatedAt: new Date(),
  };

  await db
    .insert(dailyLogs)
    .values({ userId: user.id, date, ...dailyValues })
    .onConflictDoUpdate({ target: [dailyLogs.userId, dailyLogs.date], set: dailyValues });

  /* -------------------------------------------------------- oszczędności */

  // Dzień jest zapisywany w całości, więc dopłaty z tej daty zastępujemy — kwota 0
  // albo puste pole znaczy „nic tego dnia nie odłożyłem".
  const ownedGoals = await db
    .select({ id: savingsGoals.id })
    .from(savingsGoals)
    .where(eq(savingsGoals.userId, user.id));
  const goalIds = new Set(ownedGoals.map((goal) => goal.id));

  await db
    .delete(savingsContributions)
    .where(and(eq(savingsContributions.userId, user.id), eq(savingsContributions.date, date)));

  const contributions = report.savings
    .filter((row) => goalIds.has(row.goalId) && row.amountPln !== null && row.amountPln > 0)
    .map((row) => ({ userId: user.id, goalId: row.goalId, date, amountPln: row.amountPln! }));

  if (contributions.length > 0) await db.insert(savingsContributions).values(contributions);

  /* ------------------------------------------------------------ rachunki */

  const ownedObligations = await db
    .select({ id: obligations.id })
    .from(obligations)
    .where(eq(obligations.userId, user.id));
  const obligationIds = new Set(ownedObligations.map((row) => row.id));

  for (const payment of report.payments) {
    if (!obligationIds.has(payment.obligationId)) continue;

    if (!payment.paid) {
      await db
        .delete(obligationPayments)
        .where(
          and(
            eq(obligationPayments.userId, user.id),
            eq(obligationPayments.obligationId, payment.obligationId),
            eq(obligationPayments.dueDate, payment.dueDate),
          ),
        );
      continue;
    }

    await db
      .insert(obligationPayments)
      .values({
        userId: user.id,
        obligationId: payment.obligationId,
        dueDate: payment.dueDate,
        paidOn: date,
        amountPln: payment.amountPln,
      })
      .onConflictDoUpdate({
        target: [obligationPayments.obligationId, obligationPayments.dueDate],
        set: { paidOn: date, amountPln: payment.amountPln },
      });
  }

  /* ------------------------------------------------------------ sprzedaż */

  const salesValues = {
    calls: report.sales.calls,
    meetingsScheduled: report.sales.meetingsScheduled,
    meetingsHeld: report.sales.meetingsHeld,
    updatedAt: new Date(),
  };

  await db
    .insert(salesDaily)
    .values({ userId: user.id, date, ...salesValues })
    .onConflictDoUpdate({ target: [salesDaily.userId, salesDaily.date], set: salesValues });

  await db.delete(contracts).where(and(eq(contracts.userId, user.id), eq(contracts.signedOn, date)));
  if (report.contracts.length > 0) {
    await db.insert(contracts).values(
      report.contracts.map((row) => ({
        userId: user.id,
        signedOn: date,
        clientName: row.clientName,
        valuePln: row.valuePln,
        status: row.status,
        note: row.note,
      })),
    );
  }

  /* ---------------------------------------------------------------- leki */

  for (const dose of report.doses) {
    const [owned] = await db
      .select({ id: medications.id })
      .from(medications)
      .where(and(eq(medications.id, dose.medicationId), eq(medications.userId, user.id)))
      .limit(1);
    if (!owned) continue;

    await db
      .insert(medicationLogs)
      .values({
        userId: user.id,
        medicationId: dose.medicationId,
        date,
        slot: dose.slot,
        taken: dose.taken,
        takenAt: dose.taken ? new Date() : null,
      })
      .onConflictDoUpdate({
        target: [medicationLogs.medicationId, medicationLogs.date, medicationLogs.slot],
        set: { taken: dose.taken, takenAt: dose.taken ? new Date() : null },
      });
  }

  /* ------------------------------------------------------------- zadania */

  await db.delete(tasks).where(and(eq(tasks.userId, user.id), eq(tasks.date, date)));

  const taskRows = [
    ...report.priorities
      .map((task, index) => ({ ...task, index }))
      .filter((task) => task.title.length > 0)
      .map((task) => ({
        userId: user.id,
        date,
        title: task.title,
        kind: "priorytet" as const,
        position: task.index + 1,
        done: task.done,
        doneAt: task.done ? new Date() : null,
      })),
    ...report.side
      .map((task, index) => ({ ...task, index }))
      .filter((task) => task.title.length > 0)
      .map((task) => ({
        userId: user.id,
        date,
        title: task.title,
        kind: "side" as const,
        position: task.index,
        done: task.done,
        doneAt: task.done ? new Date() : null,
      })),
  ];

  if (taskRows.length > 0) await db.insert(tasks).values(taskRows);

  /* ------------------------------------------------------------- trening */

  for (const entry of report.training) {
    const [plan] = await db
      .select({ id: trainingPlans.id })
      .from(trainingPlans)
      .where(and(eq(trainingPlans.id, entry.planId), eq(trainingPlans.userId, user.id)))
      .limit(1);
    if (!plan) continue;

    const [existing] = await db
      .select({ id: trainingLogs.id })
      .from(trainingLogs)
      .where(
        and(eq(trainingLogs.userId, user.id), eq(trainingLogs.date, date), eq(trainingLogs.planId, entry.planId)),
      )
      .limit(1);

    if (!entry.done) {
      if (existing) await db.delete(trainingLogs).where(eq(trainingLogs.id, existing.id));
      continue;
    }

    const values = {
      discipline: entry.discipline,
      title: entry.title,
      done: true,
      durationMin: entry.durationMin === null ? null : Math.round(entry.durationMin),
      distanceKm: entry.distanceKm,
      rpe: entry.rpe === null ? null : Math.round(entry.rpe),
      note: entry.note,
    };

    if (existing) {
      await db.update(trainingLogs).set(values).where(eq(trainingLogs.id, existing.id));
    } else {
      await db.insert(trainingLogs).values({ userId: user.id, date, planId: entry.planId, ...values });
    }
  }

  /* --------------------------------------------------------------- nauka */

  for (const entry of report.learning) {
    const [plan] = await db
      .select({ id: learningPlanWeek.id })
      .from(learningPlanWeek)
      .where(and(eq(learningPlanWeek.id, entry.planId), eq(learningPlanWeek.userId, user.id)))
      .limit(1);
    if (!plan) continue;

    const [existing] = await db
      .select({ id: learningLogs.id })
      .from(learningLogs)
      .where(and(eq(learningLogs.userId, user.id), eq(learningLogs.date, date), eq(learningLogs.planId, entry.planId)))
      .limit(1);

    /*
     * Odznaczony blok zapisujemy jako „nie zrobione", a nie kasujemy wpisu.
     * Kasowanie zrównywało świadome pominięcie z brakiem decyzji — i kasowało
     * oznaczenie ustawione wcześniej na kafelku, gdy wieczorem szedł raport.
     * Statystyki liczą tylko wpisy z done = true, więc nic się nie zawyża.
     */
    const values = {
      skill: entry.skill,
      done: entry.done,
      minutes: entry.done && entry.minutes !== null ? Math.round(entry.minutes) : null,
      note: entry.note,
    };

    if (existing) {
      await db.update(learningLogs).set(values).where(eq(learningLogs.id, existing.id));
    } else {
      await db.insert(learningLogs).values({ userId: user.id, date, planId: entry.planId, ...values });
    }
  }

  /* ------------------------------------------------------- nowe rekordy */

  if (report.newRecords.length > 0) {
    await db.insert(personalRecords).values(
      report.newRecords.map((record) => ({
        userId: user.id,
        discipline: record.discipline,
        metric: record.metric,
        unit: record.unit,
        value: record.value,
        higherIsBetter: record.higherIsBetter,
        achievedOn: date,
      })),
    );
  }

  /* ----------------------------------------------- surowa kopia raportu */

  await db.insert(reportSubmissions).values({ userId: user.id, date, payload: report });

  revalidatePath("/", "layout");
  redirect(`/?zapisano=${date}`);
}

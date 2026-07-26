import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  contracts,
  dailyLogs,
  learningLogs,
  learningPlanWeek,
  learningPlanYear,
  medicationLogs,
  medications,
  salesDaily,
  tasks,
  trainingLogs,
  trainingPlans,
} from "@/lib/db/schema";
import { isoWeekday } from "@/lib/domain/dates";
import { learningBlocksForDate } from "@/lib/domain/learning";
import { medicationScheduleForDate, type MedicationRow } from "@/lib/domain/medication";

/**
 * Formularz raportu jest budowany z konfiguracji użytkownika na wybrany dzień:
 * pokazuje dokładnie te leki, treningi i bloki nauki, które na ten dzień zaplanował,
 * wraz z tym, co już zostało zapisane.
 */
export async function getReportFormData(userId: string, date: string) {
  const weekday = isoWeekday(date);

  const [log, sales, contractRows, medRows, medLogs, taskRows, planRows, trainingLogRows, weekPlans, yearPlans, learningLogRows] =
    await Promise.all([
      db
        .select()
        .from(dailyLogs)
        .where(and(eq(dailyLogs.userId, userId), eq(dailyLogs.date, date)))
        .limit(1),

      db
        .select()
        .from(salesDaily)
        .where(and(eq(salesDaily.userId, userId), eq(salesDaily.date, date)))
        .limit(1),

      db
        .select()
        .from(contracts)
        .where(and(eq(contracts.userId, userId), eq(contracts.signedOn, date))),

      db
        .select()
        .from(medications)
        .where(and(eq(medications.userId, userId), eq(medications.active, true)))
        .orderBy(asc(medications.position)),

      db
        .select()
        .from(medicationLogs)
        .where(and(eq(medicationLogs.userId, userId), eq(medicationLogs.date, date))),

      db
        .select()
        .from(tasks)
        .where(and(eq(tasks.userId, userId), eq(tasks.date, date)))
        .orderBy(asc(tasks.position)),

      db
        .select()
        .from(trainingPlans)
        .where(
          and(
            eq(trainingPlans.userId, userId),
            eq(trainingPlans.weekday, weekday),
            eq(trainingPlans.active, true),
          ),
        )
        .orderBy(asc(trainingPlans.position)),

      db
        .select()
        .from(trainingLogs)
        .where(and(eq(trainingLogs.userId, userId), eq(trainingLogs.date, date))),

      db
        .select()
        .from(learningPlanWeek)
        .where(and(eq(learningPlanWeek.userId, userId), eq(learningPlanWeek.active, true))),

      db.select().from(learningPlanYear).where(eq(learningPlanYear.userId, userId)),

      db
        .select()
        .from(learningLogs)
        .where(and(eq(learningLogs.userId, userId), eq(learningLogs.date, date))),
    ]);

  const doses = medicationScheduleForDate(date, medRows as MedicationRow[], medLogs);
  const blocks = learningBlocksForDate(date, weekPlans, yearPlans);

  return {
    date,
    daily: log[0] ?? null,
    sales: sales[0] ?? null,
    contracts: contractRows,
    doses,
    hasMedications: medRows.length > 0,
    priorities: taskRows.filter((task) => task.kind === "priorytet"),
    side: taskRows.filter((task) => task.kind === "side"),
    training: planRows.map((plan) => ({
      plan,
      log: trainingLogRows.find((entry) => entry.planId === plan.id) ?? null,
    })),
    learning: blocks.map((block) => ({
      block,
      log: learningLogRows.find((entry) => entry.planId === block.planId) ?? null,
    })),
  };
}

export type ReportFormData = Awaited<ReturnType<typeof getReportFormData>>;

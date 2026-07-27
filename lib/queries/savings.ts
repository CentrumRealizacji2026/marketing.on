import "server-only";

import { and, asc, desc, eq, gte, inArray, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { savingsContributions, savingsGoals } from "@/lib/db/schema";
import { addDays } from "@/lib/domain/dates";
import { savingsPace, savingsProgress, summarizeSavings, type SavingsProgress } from "@/lib/domain/savings";

export type GoalOverview = SavingsProgress & {
  note: string | null;
  /** Ile odkładane jest tygodniowo — średnia z ostatnich 28 dni z dopłatami. */
  actualPerWeekPln: number | null;
  pace: ReturnType<typeof savingsPace>;
  lastContribution: { date: string; amountPln: number } | null;
};

const PACE_WINDOW_DAYS = 28;

/**
 * Stan wszystkich aktywnych celów: ile odłożone, ile brakuje i czy tempo domknie
 * cel w terminie. Sumy liczone są w bazie, żeby nie ściągać całej historii dopłat.
 */
export async function getSavingsOverview(userId: string, today: string) {
  const goals = await db
    .select()
    .from(savingsGoals)
    .where(and(eq(savingsGoals.userId, userId), eq(savingsGoals.active, true)))
    .orderBy(asc(savingsGoals.position));

  if (goals.length === 0) {
    return { goals: [] as GoalOverview[], total: summarizeSavings([]) };
  }

  const goalIds = goals.map((goal) => goal.id);
  const windowStart = addDays(today, -(PACE_WINDOW_DAYS - 1));

  const [totals, recent, lastRows] = await Promise.all([
    db
      .select({
        goalId: savingsContributions.goalId,
        sum: sql<number>`coalesce(sum(${savingsContributions.amountPln}), 0)::float`,
      })
      .from(savingsContributions)
      .where(and(eq(savingsContributions.userId, userId), inArray(savingsContributions.goalId, goalIds)))
      .groupBy(savingsContributions.goalId),

    db
      .select({
        goalId: savingsContributions.goalId,
        sum: sql<number>`coalesce(sum(${savingsContributions.amountPln}), 0)::float`,
      })
      .from(savingsContributions)
      .where(
        and(
          eq(savingsContributions.userId, userId),
          inArray(savingsContributions.goalId, goalIds),
          gte(savingsContributions.date, windowStart),
        ),
      )
      .groupBy(savingsContributions.goalId),

    db
      .select()
      .from(savingsContributions)
      .where(and(eq(savingsContributions.userId, userId), inArray(savingsContributions.goalId, goalIds)))
      .orderBy(desc(savingsContributions.date))
      .limit(goalIds.length * 4),
  ]);

  const sumByGoal = new Map(totals.map((row) => [row.goalId, Number(row.sum)]));
  const recentByGoal = new Map(recent.map((row) => [row.goalId, Number(row.sum)]));

  const overview: GoalOverview[] = goals.map((goal) => {
    const progress = savingsProgress(goal, sumByGoal.get(goal.id) ?? 0, today);
    const recentSum = recentByGoal.get(goal.id) ?? 0;
    const actualPerWeekPln = recentSum > 0 ? Math.round((recentSum / (PACE_WINDOW_DAYS / 7)) * 100) / 100 : null;
    const last = lastRows.find((row) => row.goalId === goal.id) ?? null;

    return {
      ...progress,
      note: goal.note,
      actualPerWeekPln,
      pace: savingsPace(progress, actualPerWeekPln),
      lastContribution: last ? { date: last.date, amountPln: last.amountPln } : null,
    };
  });

  return { goals: overview, total: summarizeSavings(overview) };
}

/** Dopłaty z jednego dnia — do raportu i do szczegółów dnia w kalendarzu. */
export async function getContributionsForDate(userId: string, date: string) {
  return db
    .select({
      goalId: savingsContributions.goalId,
      amountPln: savingsContributions.amountPln,
      name: savingsGoals.name,
    })
    .from(savingsContributions)
    .innerJoin(savingsGoals, eq(savingsGoals.id, savingsContributions.goalId))
    .where(and(eq(savingsContributions.userId, userId), eq(savingsContributions.date, date)))
    .orderBy(asc(savingsGoals.position));
}

/** Historia dopłat na potrzeby strony finansów. */
export async function getRecentContributions(userId: string, limit = 20) {
  return db
    .select({
      id: savingsContributions.id,
      date: savingsContributions.date,
      amountPln: savingsContributions.amountPln,
      goalName: savingsGoals.name,
    })
    .from(savingsContributions)
    .innerJoin(savingsGoals, eq(savingsGoals.id, savingsContributions.goalId))
    .where(eq(savingsContributions.userId, userId))
    .orderBy(desc(savingsContributions.date))
    .limit(limit);
}

/** Suma odłożona w zadanym przedziale — do podsumowań tygodnia i miesiąca. */
export async function getContributionsBetween(userId: string, from: string, to: string) {
  return db
    .select({
      date: savingsContributions.date,
      goalId: savingsContributions.goalId,
      amountPln: savingsContributions.amountPln,
      goalName: savingsGoals.name,
    })
    .from(savingsContributions)
    .innerJoin(savingsGoals, eq(savingsGoals.id, savingsContributions.goalId))
    .where(
      and(
        eq(savingsContributions.userId, userId),
        gte(savingsContributions.date, from),
        sql`${savingsContributions.date} <= ${to}`,
      ),
    )
    .orderBy(asc(savingsContributions.date));
}

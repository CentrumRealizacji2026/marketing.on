import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { mentalAssessments } from "@/lib/db/schema";
import {
  MENTAL_TESTS,
  MENTAL_TEST_IDS,
  compareScores,
  isDue,
  nextDueDate,
  scoreAssessment,
  type AssessmentResult,
  type MentalTestId,
} from "@/lib/domain/mental-tests";

export type TestState = {
  testId: MentalTestId;
  /** Ostatni wynik albo null, jeśli test nie był jeszcze wypełniany. */
  latest: (AssessmentResult & { date: string }) | null;
  previousScore: number | null;
  change: ReturnType<typeof compareScores>;
  /** Historia wyników do wykresu, od najstarszego. */
  history: Array<{ date: string; score: number }>;
  due: boolean;
  nextDue: string | null;
};

/**
 * Stan wszystkich testów przesiewowych. Punktacja liczona jest z zapisanych
 * odpowiedzi, więc korekta progów w kodzie od razu obejmuje całą historię.
 */
export async function getMentalState(userId: string, today: string): Promise<TestState[]> {
  const rows = await db
    .select()
    .from(mentalAssessments)
    .where(eq(mentalAssessments.userId, userId))
    .orderBy(desc(mentalAssessments.date));

  return MENTAL_TEST_IDS.map((testId) => {
    const forTest = rows.filter((row) => row.test === testId);
    const latestRow = forTest[0] ?? null;
    const latest = latestRow
      ? (() => {
          const result = scoreAssessment(testId, latestRow.answers);
          return result ? { ...result, date: latestRow.date } : null;
        })()
      : null;

    const previousScore = forTest[1] ? (scoreAssessment(testId, forTest[1].answers)?.score ?? null) : null;

    return {
      testId,
      latest,
      previousScore,
      change: compareScores(testId, latest?.score ?? 0, latest ? previousScore : null),
      history: forTest
        .slice(0, 26)
        .reverse()
        .map((row) => ({ date: row.date, score: scoreAssessment(testId, row.answers)?.score ?? row.score })),
      due: isDue(testId, latestRow?.date ?? null, today),
      nextDue: nextDueDate(testId, latestRow?.date ?? null),
    };
  });
}

/** Skrót dla kafelków: stan testu dobrostanu plus informacja, czy coś czeka. */
export async function getWellbeingSummary(userId: string, today: string) {
  const states = await getMentalState(userId, today);
  const who5 = states.find((state) => state.testId === "who5")!;
  const dueTests = states.filter((state) => state.due).map((state) => MENTAL_TESTS[state.testId].name);
  const riskFlag = states.some((state) => state.latest?.riskFlag);

  return { states, who5, dueTests, riskFlag };
}

/** Ostatnie wypełnienie danego testu. */
export async function getLatestAssessment(userId: string, testId: MentalTestId) {
  const [row] = await db
    .select()
    .from(mentalAssessments)
    .where(and(eq(mentalAssessments.userId, userId), eq(mentalAssessments.test, testId)))
    .orderBy(desc(mentalAssessments.date))
    .limit(1);
  return row ?? null;
}

/** Wypełnienie z konkretnego dnia — formularz otwiera się wtedy z odpowiedziami do poprawki. */
export async function getAssessmentForDate(userId: string, testId: MentalTestId, date: string) {
  const [row] = await db
    .select()
    .from(mentalAssessments)
    .where(
      and(
        eq(mentalAssessments.userId, userId),
        eq(mentalAssessments.test, testId),
        eq(mentalAssessments.date, date),
      ),
    )
    .limit(1);
  return row ?? null;
}

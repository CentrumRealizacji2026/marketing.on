"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { mentalAssessments } from "@/lib/db/schema";
import { getUserSettings, requireUser } from "@/lib/auth/session";
import { todayInTz } from "@/lib/domain/dates";
import { scoreAssessment, type MentalTestId } from "@/lib/domain/mental-tests";
import { assessmentSchema } from "@/lib/validation/mental";

export type AssessmentState = { error?: string } | undefined;

/**
 * Zapis wypełnionego kwestionariusza. Wynik liczymy na serwerze — z formularza
 * przychodzą wyłącznie odpowiedzi, więc punktacji nie da się podstawić z boku.
 *
 * Ten sam test wypełniony dwa razy tego samego dnia nadpisuje poprzedni wpis:
 * to poprawka pomyłki, a nie druga obserwacja.
 */
export async function saveAssessment(_prev: AssessmentState, formData: FormData): Promise<AssessmentState> {
  const user = await requireUser();
  const settings = await getUserSettings(user.id);

  const parsed = assessmentSchema.safeParse({
    test: formData.get("test"),
    date: formData.get("date") ?? todayInTz(settings.timezone),
    answers: formData.get("answers"),
    note: formData.get("note"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Nieprawidłowe dane." };
  }

  const { test, date, answers, note } = parsed.data;
  const result = scoreAssessment(test as MentalTestId, answers);
  if (!result) return { error: "Nie udało się policzyć wyniku — sprawdź odpowiedzi." };

  await db
    .insert(mentalAssessments)
    .values({ userId: user.id, date, test: test as MentalTestId, answers, score: result.score, note })
    .onConflictDoUpdate({
      target: [mentalAssessments.userId, mentalAssessments.date, mentalAssessments.test],
      set: { answers, score: result.score, note },
    });

  revalidatePath("/", "layout");
  redirect(`/zdrowie/test/${test}?zapisano=1`);
}

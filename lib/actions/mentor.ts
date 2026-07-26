"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { recommendations, type MentorMode, type RecommendationStatus } from "@/lib/db/schema";
import { getUserSettings, requireUser } from "@/lib/auth/session";
import { generateMentorAdvice, MentorConfigError } from "@/lib/ai/mentor";
import { todayInTz } from "@/lib/domain/dates";

export type MentorState = { error?: string; ok?: boolean } | undefined;

const MODES: MentorMode[] = ["mentor", "trener", "pm"];

export async function runMentor(_prev: MentorState, formData: FormData): Promise<MentorState> {
  const user = await requireUser();
  const settings = await getUserSettings(user.id);
  const today = todayInTz(settings.timezone);

  const raw = String(formData.get("mode") ?? "mentor");
  const mode = MODES.includes(raw as MentorMode) ? (raw as MentorMode) : "mentor";

  try {
    await generateMentorAdvice({ userId: user.id, settings, today, mode });
  } catch (error) {
    if (error instanceof MentorConfigError) return { error: error.message };
    const message = error instanceof Error ? error.message : "Nie udało się wygenerować rekomendacji.";
    return { error: message };
  }

  revalidatePath("/mentor");
  revalidatePath("/");
  return { ok: true };
}

const STATUSES: RecommendationStatus[] = ["nowa", "przyjeta", "zrobiona", "odrzucona"];

export async function setRecommendationStatus(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const raw = String(formData.get("status") ?? "");
  if (!id || !STATUSES.includes(raw as RecommendationStatus)) return;

  await db
    .update(recommendations)
    .set({ status: raw as RecommendationStatus })
    .where(and(eq(recommendations.id, id), eq(recommendations.userId, user.id)));

  revalidatePath("/mentor");
  revalidatePath("/");
}

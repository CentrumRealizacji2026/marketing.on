"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { dailyLogs } from "@/lib/db/schema";
import { getUserSettings, requireUser } from "@/lib/auth/session";
import { todayInTz } from "@/lib/domain/dates";
import type { QuickState } from "@/lib/actions/quick";

/**
 * Poranny rytuał: intencja dnia i nastrój na start — para dla wieczornego
 * raportu. Upsert ustawia WYŁĄCZNIE pola poranka, więc ani raport nie kasuje
 * poranka, ani poranek niczego z raportu.
 */
export async function saveMorning(_prev: QuickState, formData: FormData): Promise<QuickState> {
  const user = await requireUser();
  const settings = await getUserSettings(user.id);
  const today = todayInTz(settings.timezone);

  const intention = String(formData.get("intention") ?? "").trim().slice(0, 200);
  const moodRaw = Number(formData.get("mood"));
  const mood = Number.isInteger(moodRaw) && moodRaw >= 1 && moodRaw <= 5 ? moodRaw : null;

  if (!intention && mood === null) return { error: "Wpisz intencję albo zaznacz nastrój." };

  const values = {
    morningIntention: intention || null,
    morningMood: mood,
    morningAt: new Date(),
    updatedAt: new Date(),
  };

  await db
    .insert(dailyLogs)
    .values({ userId: user.id, date: today, ...values })
    .onConflictDoUpdate({ target: [dailyLogs.userId, dailyLogs.date], set: values });

  revalidatePath("/");
  revalidatePath("/tydzien");
  revalidatePath("/raport");
  revalidatePath("/zdrowie");

  return { ok: "Poranek zapisany — miłego dnia." };
}

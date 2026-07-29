"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { pushSubscriptions, settings } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import type { QuickState } from "@/lib/actions/quick";

/**
 * Subskrypcje push per urządzenie. Endpoint nadaje przeglądarka i jest
 * globalnie unikalny — upsert po nim sprawia, że ponowne włączenie na tym
 * samym urządzeniu nadpisuje wpis zamiast mnożyć duplikaty.
 */

export async function savePushSubscription(_prev: QuickState, formData: FormData): Promise<QuickState> {
  const user = await requireUser();

  const endpoint = String(formData.get("endpoint") ?? "");
  const p256dh = String(formData.get("p256dh") ?? "");
  const auth = String(formData.get("auth") ?? "");
  const userAgent = String(formData.get("userAgent") ?? "").slice(0, 300) || null;

  if (!endpoint.startsWith("https://") || !p256dh || !auth) {
    return { error: "Przeglądarka nie zwróciła poprawnej subskrypcji — spróbuj jeszcze raz." };
  }

  await db
    .insert(pushSubscriptions)
    .values({ userId: user.id, endpoint, p256dh, auth, userAgent })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { userId: user.id, p256dh, auth, userAgent, createdAt: new Date() },
    });

  revalidatePath("/ustawienia/powiadomienia");
  revalidatePath("/");
  return { ok: "Powiadomienia włączone na tym urządzeniu." };
}

export async function deletePushSubscription(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db
    .delete(pushSubscriptions)
    .where(and(eq(pushSubscriptions.id, id), eq(pushSubscriptions.userId, user.id)));

  revalidatePath("/ustawienia/powiadomienia");
  revalidatePath("/");
}

/** Sześć kategorii przypomnień — checkbox nieodhaczony nie przychodzi w FormData. */
export async function saveNotificationPrefs(_prev: QuickState, formData: FormData): Promise<QuickState> {
  const user = await requireUser();

  const values = {
    pushMeds: formData.get("pushMeds") === "1",
    pushBills: formData.get("pushBills") === "1",
    pushTraining: formData.get("pushTraining") === "1",
    pushLearning: formData.get("pushLearning") === "1",
    pushMorning: formData.get("pushMorning") === "1",
    pushEvening: formData.get("pushEvening") === "1",
    updatedAt: new Date(),
  };

  await db
    .insert(settings)
    .values({ userId: user.id, ...values })
    .onConflictDoUpdate({ target: settings.userId, set: values });

  revalidatePath("/ustawienia/powiadomienia");
  return { ok: "Zapisane — przypomnienia będą przychodzić tylko z włączonych kategorii." };
}

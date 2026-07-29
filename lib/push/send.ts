import "server-only";

import webpush from "web-push";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { pushSubscriptions } from "@/lib/db/schema";

/**
 * Wysyłka powiadomień push. Klucze VAPID identyfikują serwer wobec usług
 * push przeglądarek — bez nich funkcja mówi wprost, że jest wyłączona,
 * a strony pokazują instrukcję zamiast cicho nie działać (wzorzec mentora).
 */

export function pushConfigured(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export function pushPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY ?? null;
}

export type PushPayload = { title: string; body: string; url: string; tag: string };

/**
 * Wysyła payload na wszystkie urządzenia użytkownika. Subskrypcje martwe
 * (404/410 — użytkownik cofnął zgodę albo przeinstalował) są kasowane od ręki.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<{ sent: number; gone: number }> {
  if (!pushConfigured()) return { sent: 0, gone: 0 };

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:kokpit@example.com",
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );

  const subscriptions = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));

  let sent = 0;
  let gone = 0;

  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(
        { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
        JSON.stringify(payload),
        { TTL: 60 * 60 },
      );
      sent += 1;
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await db
          .delete(pushSubscriptions)
          .where(and(eq(pushSubscriptions.id, subscription.id), eq(pushSubscriptions.userId, userId)));
        gone += 1;
      }
      // Inne błędy (5xx usługi push) zostawiamy — następny tick spróbuje ponownie
      // tylko dla przypomnień, które nie weszły do rejestru wysłanych.
    }
  }

  return { sent, gone };
}

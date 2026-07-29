import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { BellRing, Smartphone } from "lucide-react";

import { NotificationPrefs } from "@/components/push/notification-prefs";
import { PushManager } from "@/components/push/push-manager";
import { Card, CardHeader } from "@/components/ui/card";
import { deletePushSubscription } from "@/lib/actions/push";
import { getUserSettings, requireOnboardedUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { pushSubscriptions } from "@/lib/db/schema";
import { formatDatePl } from "@/lib/domain/dates";
import { pushConfigured, pushPublicKey } from "@/lib/push/send";

export const metadata: Metadata = { title: "Powiadomienia" };
export const dynamic = "force-dynamic";

/** Krótki opis urządzenia z user agenta — pełny string nikomu nic nie mówi. */
function opisUrzadzenia(userAgent: string | null): string {
  if (!userAgent) return "Nieznane urządzenie";
  if (/iphone/i.test(userAgent)) return "iPhone";
  if (/ipad/i.test(userAgent)) return "iPad";
  if (/android/i.test(userAgent)) return "Android";
  if (/macintosh/i.test(userAgent)) return "Mac";
  if (/windows/i.test(userAgent)) return "Windows";
  return "Przeglądarka";
}

export default async function NotificationsPage() {
  const user = await requireOnboardedUser();
  const settings = await getUserSettings(user.id);

  const devices = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, user.id))
    .orderBy(asc(pushSubscriptions.createdAt));

  const configured = pushConfigured();
  const publicKey = pushPublicKey();

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <CardHeader
          title="Powiadomienia push"
          subtitle="Przypomnienia przychodzą na telefon nawet przy zamkniętej aplikacji."
          icon={BellRing}
        />
        {!configured || !publicKey ? (
          <p className="rounded-lg border border-edge bg-surface-2 p-3 text-sm text-ink-2">
            Wysyłka powiadomień nie jest jeszcze skonfigurowana na serwerze — brakuje kluczy VAPID
            w zmiennych środowiskowych (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY). Po ich dodaniu
            i ponownym wdrożeniu ta strona ożyje.
          </p>
        ) : (
          <PushManager vapidPublicKey={publicKey} subscribedCount={devices.length} />
        )}
      </Card>

      <Card>
        <CardHeader
          title="Kategorie przypomnień"
          subtitle="Wyłączona kategoria nie wysyła nic — na żadne urządzenie."
        />
        <NotificationPrefs
          initial={{
            pushMeds: settings.pushMeds,
            pushBills: settings.pushBills,
            pushTraining: settings.pushTraining,
            pushLearning: settings.pushLearning,
            pushMorning: settings.pushMorning,
            pushEvening: settings.pushEvening,
          }}
        />
      </Card>

      <Card>
        <CardHeader
          title="Urządzenia"
          subtitle={devices.length === 0 ? "Żadne urządzenie nie ma jeszcze włączonych powiadomień." : undefined}
          icon={Smartphone}
        />
        {devices.length === 0 ? (
          <p className="text-xs text-muted">
            Włącz powiadomienia powyżej — osobno na telefonie i na komputerze, jeśli używasz obu.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {devices.map((device) => (
              <li
                key={device.id}
                className="flex items-center justify-between gap-3 border-b border-line py-2 text-sm last:border-0"
              >
                <span className="min-w-0">
                  <span className="block text-ink">{opisUrzadzenia(device.userAgent)}</span>
                  <span className="block text-xs text-muted">
                    włączone {formatDatePl(device.createdAt.toISOString().slice(0, 10))}
                  </span>
                </span>
                <form action={deletePushSubscription}>
                  <input type="hidden" name="id" value={device.id} />
                  <button type="submit" className="shrink-0 text-xs text-muted hover:text-critical">
                    Usuń
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { BellRing } from "lucide-react";

import { savePushSubscription } from "@/lib/actions/push";
import type { QuickState } from "@/lib/actions/quick";

/**
 * Włącznik powiadomień na TYM urządzeniu: prosi o zgodę przeglądarki,
 * subskrybuje push u dostawcy (VAPID) i wysyła subskrypcję do bazy akcją
 * serwerową. Na iPhonie push działa wyłącznie w aplikacji dodanej do ekranu
 * początkowego (iOS 16.4+) — zamiast cichej porażki pokazujemy instrukcję.
 */

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

type Wsparcie = "sprawdzam" | "ok" | "ios-przegladarka" | "brak";

export function PushManager({ vapidPublicKey, subscribedCount }: { vapidPublicKey: string; subscribedCount: number }) {
  const [wsparcie, setWsparcie] = useState<Wsparcie>("sprawdzam");
  const [blad, setBlad] = useState<string | null>(null);
  const [zapis, setZapis] = useState<"nic" | "trwa" | "gotowe">("nic");
  const [state, formAction] = useActionState<QuickState, FormData>(savePushSubscription, undefined);

  const isIos = useMemo(
    () => typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent),
    [],
  );

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      const standalone = window.matchMedia("(display-mode: standalone)").matches;
      setWsparcie(isIos && !standalone ? "ios-przegladarka" : "brak");
      return;
    }
    // Na iOS push jest tylko w trybie zainstalowanej aplikacji.
    if (isIos && !window.matchMedia("(display-mode: standalone)").matches) {
      setWsparcie("ios-przegladarka");
      return;
    }
    setWsparcie("ok");
  }, [isIos]);

  async function wlacz() {
    setBlad(null);
    setZapis("trwa");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setBlad("Przeglądarka nie dostała zgody na powiadomienia — sprawdź ustawienia witryny.");
        setZapis("nic");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      const json = subscription.toJSON();
      const formData = new FormData();
      formData.set("endpoint", subscription.endpoint);
      formData.set("p256dh", json.keys?.p256dh ?? "");
      formData.set("auth", json.keys?.auth ?? "");
      formData.set("userAgent", navigator.userAgent);
      formAction(formData);
      setZapis("gotowe");
    } catch {
      setBlad("Nie udało się włączyć powiadomień na tym urządzeniu. Odśwież stronę i spróbuj ponownie.");
      setZapis("nic");
    }
  }

  if (wsparcie === "sprawdzam") {
    return <p className="text-xs text-muted">Sprawdzam możliwości tej przeglądarki…</p>;
  }

  if (wsparcie === "ios-przegladarka") {
    return (
      <div className="rounded-lg border border-edge bg-surface-2 p-3 text-sm text-ink">
        <p className="font-medium">Na iPhonie powiadomienia działają tylko z aplikacji na ekranie początkowym.</p>
        <ol className="mt-1.5 list-decimal pl-5 text-xs text-ink-2">
          <li>W Safari dotknij przycisku Udostępnij (kwadrat ze strzałką).</li>
          <li>Wybierz „Dodaj do ekranu początkowego” i potwierdź.</li>
          <li>Otwórz Kokpit z nowej ikony i wróć tutaj — przycisk będzie aktywny.</li>
        </ol>
        <p className="mt-1.5 text-xs text-muted">Wymaga iOS 16.4 lub nowszego.</p>
      </div>
    );
  }

  if (wsparcie === "brak") {
    return (
      <p className="rounded-lg border border-edge bg-surface-2 p-3 text-xs text-muted">
        Ta przeglądarka nie obsługuje powiadomień push — spróbuj w Chrome, Edge albo Safari.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {state?.ok || zapis === "gotowe" ? (
        <p className="rounded-lg border border-good/40 bg-good/10 px-3 py-2 text-sm text-ink">
          Powiadomienia włączone na tym urządzeniu.
        </p>
      ) : null}
      {state?.error ? (
        <p role="alert" className="rounded-lg border border-critical/40 bg-critical/10 px-3 py-2 text-sm text-ink">
          {state.error}
        </p>
      ) : null}
      {blad ? (
        <p role="alert" className="rounded-lg border border-critical/40 bg-critical/10 px-3 py-2 text-sm text-ink">
          {blad}
        </p>
      ) : null}

      <button
        type="button"
        onClick={wlacz}
        disabled={zapis === "trwa"}
        className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-lg bg-series-1 px-4 text-sm font-medium text-white hover:brightness-110 disabled:opacity-50"
      >
        <BellRing className="h-4 w-4" />
        {zapis === "trwa"
          ? "Włączam…"
          : subscribedCount > 0
            ? "Włącz także na tym urządzeniu"
            : "Włącz powiadomienia na tym urządzeniu"}
      </button>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BellRing, X } from "lucide-react";

/**
 * Zachęta do włączenia powiadomień — znika po zamknięciu (localStorage),
 * bo to podpowiedź, a nie stan aplikacji. Pokazywana tylko, gdy użytkownik
 * nie ma jeszcze żadnego urządzenia z powiadomieniami.
 */

const KLUCZ = "kokpit-push-banner-zamkniety";

export function PushBanner() {
  const [widoczny, setWidoczny] = useState(false);

  useEffect(() => {
    try {
      setWidoczny(localStorage.getItem(KLUCZ) !== "1");
    } catch {
      setWidoczny(true);
    }
  }, []);

  if (!widoczny) return null;

  return (
    <p className="flex items-center gap-2 rounded-lg border border-edge bg-surface px-3 py-2 text-sm text-ink md:col-span-2 xl:col-span-6">
      <BellRing className="h-4 w-4 shrink-0 text-series-1" />
      <span className="min-w-0 flex-1">
        Kokpit może przypominać o lekach, ratach i treningu wprost na telefonie.{" "}
        <Link href="/ustawienia/powiadomienia" className="font-medium underline underline-offset-2">
          Włącz powiadomienia
        </Link>
      </span>
      <button
        type="button"
        aria-label="Zamknij podpowiedź"
        onClick={() => {
          try {
            localStorage.setItem(KLUCZ, "1");
          } catch {
            // brak localStorage nie może wysypać strony
          }
          setWidoczny(false);
        }}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted hover:text-ink"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </p>
  );
}

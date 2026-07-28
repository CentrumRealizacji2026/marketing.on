"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Utrzymuje akcent „teraz" przy życiu bez udziału użytkownika.
 *
 * Stany czasowe liczy serwer przy renderze, więc otwarta karta powoli by się
 * starzała. router.refresh() ponawia wyłącznie render serwerowy — stan klienta
 * (zegar, przewinięcie) zostaje nietknięty. Odświeżamy co minutę, bo taka jest
 * rozdzielczość stanów, i tylko gdy karta jest widoczna; powrót do karty
 * odświeża natychmiast — po odblokowaniu telefonu rano linia „teraz" ma być
 * na właściwej wysokości od razu, łącznie z przejściem przez północ.
 */
export function AgendaRefresh({ intervalMs = 60_000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") router.refresh();
    };

    const interval = setInterval(tick, intervalMs);
    document.addEventListener("visibilitychange", tick);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [router, intervalMs]);

  return null;
}

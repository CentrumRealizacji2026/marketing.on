"use client";

import { useEffect, useMemo, useState } from "react";

import { DEFAULT_TIMEZONE } from "@/lib/domain/dates";

/**
 * Zegar w rogu panelu: data i godzina na żywo, w strefie z ustawień konta —
 * nie urządzenia, bo „teraz" na planie dnia liczy się w strefie użytkownika
 * i obie rzeczy mają pokazywać ten sam czas.
 *
 * Do pierwszego efektu renderuje pusty placeholder o stałej szerokości:
 * serwer nie zna czasu klienta, więc jakakolwiek godzina w SSR skończyłaby się
 * błędem hydracji. Klasa tabular trzyma stałą szerokość cyfr — zegar nie drga.
 */
export function Clock({ timezone }: { timezone: string }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const { timeFormat, dateFormat } = useMemo(() => {
    const build = (tz: string) => ({
      timeFormat: new Intl.DateTimeFormat("pl-PL", {
        timeZone: tz,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      }),
      dateFormat: new Intl.DateTimeFormat("pl-PL", {
        timeZone: tz,
        weekday: "short",
        day: "numeric",
        month: "short",
      }),
    });

    try {
      return build(timezone);
    } catch {
      return build(DEFAULT_TIMEZONE);
    }
  }, [timezone]);

  return (
    <div className="text-right" aria-live="off">
      <p className="tabular min-w-[4.5rem] text-sm leading-tight font-semibold text-ink" suppressHydrationWarning>
        {now ? timeFormat.format(now) : " "}
      </p>
      <p className="tabular hidden text-xs leading-tight text-muted sm:block" suppressHydrationWarning>
        {now ? dateFormat.format(now) : " "}
      </p>
    </div>
  );
}

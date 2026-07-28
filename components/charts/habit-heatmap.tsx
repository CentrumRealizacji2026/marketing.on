import { Flame } from "lucide-react";

import { formatDatePl, orderedWeekdays } from "@/lib/domain/dates";
import type { HabitDay, HabitDayStatus } from "@/lib/domain/habits";

/**
 * Heatmapa nawyku: tygodnie w wierszach, dni w kolumnach — jak siatka
 * kalendarza, ale z jedną informacją na komórkę: czy dzień był zaliczony.
 * Dni bez planu są neutralne, żeby urlop nie wyglądał jak porażka.
 */

const STATUS_LABEL: Record<HabitDayStatus, string> = {
  zaliczony: "zaliczony",
  czesciowy: "częściowo",
  pominiety: "pominięty",
  "brak-danych": "bez planu",
};

function cellStyle(status: HabitDayStatus, tone: string): { className: string; style?: React.CSSProperties } {
  if (status === "zaliczony") return { className: "", style: { backgroundColor: `color-mix(in oklab, ${tone} 85%, transparent)` } };
  if (status === "czesciowy") return { className: "", style: { backgroundColor: `color-mix(in oklab, ${tone} 40%, transparent)` } };
  if (status === "pominiety") return { className: "bg-critical/15" };
  return { className: "bg-surface-2" };
}

/** Płomyk z długością serii — pojedynczy dzień to jeszcze nie seria. */
export function StreakBadge({ length, label }: { length: number; label?: string }) {
  if (length < 2) return null;
  return (
    <span
      title={label ? `${label}: seria ${length} dni` : `Seria ${length} dni`}
      className="inline-flex shrink-0 items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-ink"
    >
      <Flame className="h-3.5 w-3.5 text-warning" />
      {length} dni
    </span>
  );
}

export function HabitHeatmap({
  days,
  weekStartsOn,
  label,
  tone = "var(--series-1)",
}: {
  /** Pełne tygodnie od poniedziałku (lub dnia startu tygodnia) — możliwie 7×n dni. */
  days: HabitDay[];
  weekStartsOn: number;
  label: string;
  tone?: string;
}) {
  const weeks: HabitDay[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  return (
    <div aria-label={label}>
      <div className="grid grid-cols-7 gap-1">
        {orderedWeekdays(weekStartsOn).map((day) => (
          <span key={day.value} className="text-center text-[10px] text-muted">
            {day.short}
          </span>
        ))}
        {weeks.flat().map((day) => {
          const { className, style } = cellStyle(day.status, tone);
          return (
            <span
              key={day.date}
              data-habit-day={day.status}
              title={`${formatDatePl(day.date)} — ${STATUS_LABEL[day.status]}`}
              className={`h-4 rounded-sm ${className}`}
              style={style}
            />
          );
        })}
      </div>
      <p className="mt-1.5 text-[10px] text-muted">
        Pełny kolor = dzień zaliczony, bledszy = częściowo, czerwonawy = pominięty, szary = bez planu.
      </p>
    </div>
  );
}

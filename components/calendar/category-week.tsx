import Link from "next/link";

import { CATEGORY_KEYS, type CalendarDay, type CategoryKey } from "@/lib/queries/calendar";
import { CATEGORY_COLOR } from "@/lib/domain/agenda";
import { WEEKDAYS } from "@/lib/domain/dates";
import { DOSE_DONE_THRESHOLD } from "@/lib/domain/medication";
import { cn, formatMoney, formatNumber } from "@/lib/utils";

type Tone = "good" | "warning" | "critical";
type CellPart = { text: string; tone?: Tone };
type Cell = { parts: CellPart[]; muted?: boolean; title?: string };

const EMPTY: Cell = { parts: [{ text: "—" }], muted: true };

/**
 * Jedna komórka siatki: krótka etykieta tego, co dzieje się w danej kategorii tego dnia.
 * Każda część niesie własny kolor, żeby ocena nawodnienia nie barwiła tekstu o dawkach.
 */
function cellFor(category: CategoryKey, day: CalendarDay, currency: string): Cell {
  switch (category) {
    case "finanse": {
      const { cashBalancePln, changePln } = day.finanse;
      if (cashBalancePln === null) return EMPTY;

      // Interesuje nas przede wszystkim, czy tego dnia wyszło na plus, czy na minus.
      if (changePln === null) {
        return {
          parts: [{ text: formatMoney(cashBalancePln, currency) }],
          title: "Stan środków — pierwszy wpis, brak porównania",
        };
      }
      const sign = changePln > 0 ? "+" : changePln < 0 ? "−" : "";
      return {
        parts: [
          {
            text: `${sign}${formatMoney(Math.abs(changePln), currency)}`,
            tone: changePln > 0 ? "good" : changePln < 0 ? "critical" : undefined,
          },
        ],
        title: `Stan środków: ${formatMoney(cashBalancePln, currency)}`,
      };
    }

    case "sprzedaz": {
      const { calls, meetingsScheduled, meetingsHeld, contracts, valuePln } = day.sprzedaz;
      if (calls + meetingsScheduled + meetingsHeld + contracts === 0) return EMPTY;

      const parts: CellPart[] = [
        { text: [`${calls} rozm.`, meetingsHeld > 0 ? `${meetingsHeld} spot.` : null].filter(Boolean).join(" · ") },
      ];
      if (contracts > 0) parts.push({ text: formatMoney(valuePln, currency), tone: "good" });
      return {
        parts,
        title: `${calls} rozmów · ${meetingsScheduled} umówionych · ${meetingsHeld} odbytych${
          contracts > 0 ? ` · ${contracts} umów` : ""
        }`,
      };
    }

    case "zdrowie": {
      const { dosesPlanned, dosesTaken, waterMl, waterStatus } = day.zdrowie;
      if (dosesPlanned === 0 && waterMl === null) return EMPTY;

      const parts: CellPart[] = [];
      if (dosesPlanned > 0) {
        // Plan uznajemy za zrobiony od 80 % przyjętych dawek — codzienna dyscyplina, nie perfekcja.
        const done = dosesTaken / dosesPlanned >= DOSE_DONE_THRESHOLD;
        parts.push({
          text: `${done ? "✓ " : ""}${dosesTaken}/${dosesPlanned} dawek`,
          tone: done ? "good" : undefined,
        });
      }
      if (waterMl !== null) {
        parts.push({
          text: `${formatNumber(waterMl)} ml`,
          tone: waterStatus === "dobrze" ? "good" : waterStatus === "norma" ? "warning" : waterStatus === "zle" ? "critical" : undefined,
        });
      }
      return { parts, title: waterStatus ? `Nawodnienie: ${waterStatus}` : undefined };
    }

    case "zadania":
      return day.zadania.total === 0
        ? EMPTY
        : {
            parts: [
              {
                text: `${day.zadania.done}/${day.zadania.total}`,
                tone: day.zadania.done === day.zadania.total ? "good" : undefined,
              },
            ],
          };

    case "trening":
    case "nauka":
    case "projekty": {
      const entries = day[category];
      if (entries.length === 0) return EMPTY;
      const extra = entries.length > 1 ? ` +${entries.length - 1}` : "";
      return {
        parts: [
          {
            text: entries[0].label + extra,
            tone: entries.every((entry) => entry.done) ? "good" : undefined,
          },
        ],
        title: entries.map((entry) => entry.label).join(", "),
      };
    }
  }
}

const TONE_CLASS = {
  good: "text-[var(--delta-up)]",
  warning: "text-warning",
  critical: "text-critical",
} as const;

/**
 * Pogląd całości: kategorie w wierszach, dni w kolumnach. Pokazuje, co w danym
 * dniu dzieje się w każdym obszarze naraz — plan na przyszłość, realizację wstecz.
 */
export function CategoryWeek({
  days,
  today,
  currency,
  categories = Object.keys(CATEGORY_KEYS) as CategoryKey[],
}: {
  days: CalendarDay[];
  today: string;
  currency: string;
  categories?: CategoryKey[];
}) {
  return (
    <div className="overflow-x-auto">
      <div
        className="grid min-w-[46rem] gap-px rounded-lg bg-line"
        style={{ gridTemplateColumns: `7.5rem repeat(${days.length}, minmax(0, 1fr))` }}
      >
        <div className="bg-surface px-2 py-1.5" />
        {days.map((day) => {
          const isToday = day.date === today;
          return (
            <Link
              key={day.date}
              href={`/kalendarz?dzien=${day.date}`}
              className={cn(
                "bg-surface px-2 py-1.5 text-center transition-colors hover:bg-surface-2",
                isToday && "bg-series-1/15",
              )}
            >
              <span className="block text-[10px] tracking-wide text-muted uppercase">
                {WEEKDAYS.find((w) => w.value === day.weekday)?.short}
              </span>
              <span className={cn("tabular block text-sm", isToday ? "font-semibold text-ink" : "text-ink-2")}>
                {Number(day.date.slice(8, 10))}
              </span>
            </Link>
          );
        })}

        {categories.map((category) => (
          <div key={category} className="contents">
            <div className="flex items-center gap-1.5 bg-surface px-2 py-1.5">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: CATEGORY_COLOR[category] }}
                aria-hidden
              />
              <span className="truncate text-xs text-ink-2">{CATEGORY_KEYS[category]}</span>
            </div>

            {days.map((day) => {
              const cell = cellFor(category, day, currency);
              return (
                <div
                  key={`${category}-${day.date}`}
                  title={cell.title}
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 bg-surface px-1.5 py-1.5 text-center",
                    day.date === today && "bg-series-1/5",
                  )}
                >
                  {cell.parts.map((part, index) => (
                    <span
                      key={index}
                      className={cn(
                        "max-w-full truncate text-[11px]",
                        cell.muted ? "text-muted" : part.tone ? TONE_CLASS[part.tone] : "text-ink",
                      )}
                    >
                      {part.text}
                    </span>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Podsumowanie tygodnia w liczbach — pod siatką kategorii. */
export function WeekTotals({ days, currency }: { days: CalendarDay[]; currency: string }) {
  const totals = days.reduce(
    (acc, day) => ({
      cashChange: acc.cashChange + (day.finanse.changePln ?? 0),
      calls: acc.calls + day.sprzedaz.calls,
      meetings: acc.meetings + day.sprzedaz.meetingsHeld,
      contractsValue: acc.contractsValue + day.sprzedaz.valuePln,
      tasksDone: acc.tasksDone + day.zadania.done,
      tasksTotal: acc.tasksTotal + day.zadania.total,
      trainingDone: acc.trainingDone + day.trening.filter((entry) => entry.done).length,
      trainingTotal: acc.trainingTotal + day.trening.length,
      learningDone: acc.learningDone + day.nauka.filter((entry) => entry.done).length,
      learningTotal: acc.learningTotal + day.nauka.length,
    }),
    {
      cashChange: 0,
      calls: 0,
      meetings: 0,
      contractsValue: 0,
      tasksDone: 0,
      tasksTotal: 0,
      trainingDone: 0,
      trainingTotal: 0,
      learningDone: 0,
      learningTotal: 0,
    },
  );

  const items: Array<{ label: string; value: string; tone?: Tone }> = [
    {
      label: "Zmiana środków",
      value: `${totals.cashChange > 0 ? "+" : totals.cashChange < 0 ? "−" : ""}${formatMoney(
        Math.abs(totals.cashChange),
        currency,
      )}`,
      tone: totals.cashChange > 0 ? "good" : totals.cashChange < 0 ? "critical" : undefined,
    },
    { label: "Rozmowy", value: formatNumber(totals.calls) },
    { label: "Spotkania odbyte", value: formatNumber(totals.meetings) },
    { label: "Wartość umów", value: formatMoney(totals.contractsValue, currency) },
    { label: "Zadania", value: `${totals.tasksDone}/${totals.tasksTotal}` },
    { label: "Treningi", value: `${totals.trainingDone}/${totals.trainingTotal}` },
    { label: "Bloki nauki", value: `${totals.learningDone}/${totals.learningTotal}` },
  ];

  return (
    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-line pt-3 sm:grid-cols-4 lg:grid-cols-7">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-xs text-muted">{item.label}</dt>
          <dd className={cn("tabular mt-0.5 text-sm font-medium", item.tone ? TONE_CLASS[item.tone] : "text-ink")}>
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

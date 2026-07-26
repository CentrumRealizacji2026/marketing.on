import Link from "next/link";

import { CATEGORY_KEYS, type CalendarDay, type CategoryKey } from "@/lib/queries/calendar";
import { CATEGORY_COLOR } from "@/lib/domain/agenda";
import { WEEKDAYS } from "@/lib/domain/dates";
import { DOSE_DONE_THRESHOLD } from "@/lib/domain/medication";
import { cn, formatMoney, formatNumber } from "@/lib/utils";

type Tone = "good" | "warning" | "critical" | "saving";
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
      const { cashBalancePln, changePln, changeSource, expensesPln, incomePln } = day.finanse;
      const savedPln = day.oszczednosci.reduce((sum, entry) => sum + entry.amountPln, 0);
      const savedPart: CellPart[] =
        savedPln > 0 ? [{ text: `→ ${formatMoney(savedPln, currency)}`, tone: "saving" }] : [];
      if (cashBalancePln === null && expensesPln === null && incomePln === null) {
        return savedPln > 0
          ? { parts: savedPart, title: `Odłożone na cele: ${formatMoney(savedPln, currency)}` }
          : EMPTY;
      }

      const title = [
        incomePln !== null ? `Wpłynęło: ${formatMoney(incomePln, currency)}` : null,
        savedPln > 0 ? `Odłożone na cele: ${formatMoney(savedPln, currency)}` : null,
        expensesPln !== null ? `Wydane: ${formatMoney(expensesPln, currency)}` : null,
        cashBalancePln !== null ? `Stan środków: ${formatMoney(cashBalancePln, currency)}` : null,
        changeSource === "saldo" ? "Zmiana wyliczona z różnicy sald" : null,
      ]
        .filter(Boolean)
        .join(" · ");

      // Wpisane kwoty pokazujemy osobno: wydatek zostaje widoczny nawet wtedy,
      // gdy tego samego dnia wpłynęło tyle samo i wynik netto wychodzi na zero.
      if (changeSource === "raport") {
        const parts: CellPart[] = [];
        if (incomePln !== null && incomePln > 0) {
          parts.push({ text: `+${formatMoney(incomePln, currency)}`, tone: "good" });
        }
        if (expensesPln !== null && expensesPln > 0) {
          parts.push({ text: `−${formatMoney(expensesPln, currency)}`, tone: "critical" });
        }
        if (parts.length === 0 && savedPart.length === 0) parts.push({ text: formatMoney(0, currency) });
        return { parts: [...parts, ...savedPart], title };
      }

      // Bez wpisanych kwot zostaje sam wynik dnia z różnicy sald.
      if (changePln === null) {
        return {
          parts: [{ text: formatMoney(cashBalancePln!, currency) }, ...savedPart],
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
          ...savedPart,
        ],
        title,
      };
    }

    case "platnosci": {
      const due = day.platnosci;
      if (due.length === 0) return EMPTY;

      const total = due.reduce((sum, payment) => sum + payment.amountPln, 0);
      const overdue = due.some((payment) => payment.status === "zalegle");
      const allPaid = due.every((payment) => payment.status === "zaplacone");

      return {
        parts: [
          {
            // Zaległość jest ostrzeżeniem, zapłacone — domknięciem, reszta to zwykły termin.
            text: `${allPaid ? "✓ " : ""}${formatMoney(total, currency)}`,
            tone: overdue ? "critical" : allPaid ? "good" : "warning",
          },
          ...(due.length === 1 ? [{ text: due[0].name }] : [{ text: `${due.length} płatności` }]),
        ],
        title: due
          .map(
            (payment) =>
              `${payment.name}: ${formatMoney(payment.amountPln, currency)}${
                payment.status === "zaplacone" ? " (zapłacone)" : payment.status === "zalegle" ? " (zaległa)" : ""
              }`,
          )
          .join(" · "),
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
  saving: "text-[var(--series-3)]",
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
      spent: acc.spent + (day.finanse.expensesPln ?? 0),
      earned: acc.earned + (day.finanse.incomePln ?? 0),
      saved: acc.saved + day.oszczednosci.reduce((sum, entry) => sum + entry.amountPln, 0),
      bills: acc.bills + day.platnosci.reduce((sum, payment) => sum + payment.amountPln, 0),
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
      spent: 0,
      earned: 0,
      saved: 0,
      bills: 0,
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
    // Wydane pokazujemy osobno tylko wtedy, gdy jest z czego — kolumna z zerem nic nie wnosi.
    ...(totals.earned > 0
      ? [{ label: "Wpłynęło", value: `+${formatMoney(totals.earned, currency)}`, tone: "good" as Tone }]
      : []),
    ...(totals.spent > 0
      ? [{ label: "Wydane", value: `−${formatMoney(totals.spent, currency)}`, tone: "critical" as Tone }]
      : []),
    ...(totals.saved > 0
      ? [{ label: "Odłożone na cele", value: `→ ${formatMoney(totals.saved, currency)}`, tone: "saving" as Tone }]
      : []),
    // Suma terminów tygodnia bez oceny — status pojedynczych rat widać w wierszu wyżej.
    ...(totals.bills > 0 ? [{ label: "Płatności", value: formatMoney(totals.bills, currency) }] : []),
    { label: "Rozmowy", value: formatNumber(totals.calls) },
    { label: "Spotkania odbyte", value: formatNumber(totals.meetings) },
    { label: "Wartość umów", value: formatMoney(totals.contractsValue, currency) },
    { label: "Zadania", value: `${totals.tasksDone}/${totals.tasksTotal}` },
    { label: "Treningi", value: `${totals.trainingDone}/${totals.trainingTotal}` },
    { label: "Bloki nauki", value: `${totals.learningDone}/${totals.learningTotal}` },
  ];

  return (
    // Liczba pozycji zmienia się z danymi, więc kolumny dobierają się same.
    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-line pt-3 sm:grid-cols-4 lg:[grid-template-columns:repeat(auto-fit,minmax(7rem,1fr))]">
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

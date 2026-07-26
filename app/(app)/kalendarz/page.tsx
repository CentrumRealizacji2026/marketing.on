import Link from "next/link";
import type { Metadata } from "next";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { CategoryWeek, WeekTotals } from "@/components/calendar/category-week";
import { Card, CardHeader, EmptyState, StatusPill } from "@/components/ui/card";
import { getUserSettings, requireOnboardedUser } from "@/lib/auth/session";
import { CATEGORY_COLOR } from "@/lib/domain/agenda";
import {
  addDays,
  addMonths,
  formatFullDatePl,
  formatMonthPl,
  monthGridDates,
  orderedWeekdays,
  startOfWeek,
  todayInTz,
} from "@/lib/domain/dates";
import { DOSE_DONE_THRESHOLD } from "@/lib/domain/medication";
import { CATEGORY_KEYS, getCalendarRange, hasActivity, type CategoryKey } from "@/lib/queries/calendar";
import { cn, formatMoney, formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Kalendarz" };
export const dynamic = "force-dynamic";

const CATEGORIES = Object.keys(CATEGORY_KEYS) as CategoryKey[];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_RE = /^\d{4}-\d{2}$/;

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ miesiac?: string; dzien?: string }>;
}) {
  const user = await requireOnboardedUser();
  const settings = await getUserSettings(user.id);
  const params = await searchParams;
  const today = todayInTz(settings.timezone);

  const selectedDay = DATE_RE.test(params.dzien ?? "") ? params.dzien! : today;
  const month = MONTH_RE.test(params.miesiac ?? "") ? params.miesiac! : selectedDay.slice(0, 7);

  const gridDates = monthGridDates(month, settings.weekStartsOn);
  const weekStart = startOfWeek(selectedDay, settings.weekStartsOn);
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Jedno zapytanie na cały zakres: siatka miesiąca zawiera zwykle też dni tygodnia wybranego dnia.
  const allDates = [...new Set([...gridDates, ...weekDates])].sort();
  const days = await getCalendarRange(user.id, settings, allDates);
  const byDate = new Map(days.map((day) => [day.date, day]));

  const monthDays = gridDates.map((date) => byDate.get(date)!);
  const weekDays = weekDates.map((date) => byDate.get(date)!);
  const detail = byDate.get(selectedDay);

  const prevMonth = addMonths(month, -1);
  const nextMonth = addMonths(month, 1);

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <CardHeader
          title="Kalendarz"
          subtitle="Wszystkie kategorie naraz. Dni w przód pokazują plan, dni wstecz — plan i realizację."
          icon={CalendarDays}
          action={
            <div className="flex items-center gap-1">
              <Link
                href={`/kalendarz?miesiac=${prevMonth}&dzien=${selectedDay}`}
                aria-label="Poprzedni miesiąc"
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-ink"
              >
                <ChevronLeft className="h-4 w-4" />
              </Link>
              <span className="min-w-32 text-center text-xs font-medium text-ink">{formatMonthPl(month)}</span>
              <Link
                href={`/kalendarz?miesiac=${nextMonth}&dzien=${selectedDay}`}
                aria-label="Następny miesiąc"
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-ink"
              >
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          }
        />

        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg bg-line">
          {orderedWeekdays(settings.weekStartsOn).map((day) => (
            <div key={day.value} className="bg-surface px-2 py-1.5 text-center text-[10px] tracking-wide text-muted uppercase">
              {day.short}
            </div>
          ))}

          {monthDays.map((day) => {
            const inMonth = day.date.slice(0, 7) === month;
            const isToday = day.date === today;
            const isSelected = day.date === selectedDay;
            const active = CATEGORIES.filter((category) => hasActivity(day, category));
            const headline = day.trening[0]?.label ?? day.nauka[0]?.label ?? day.projekty[0]?.label ?? null;

            return (
              <Link
                key={day.date}
                href={`/kalendarz?miesiac=${month}&dzien=${day.date}`}
                className={cn(
                  "flex min-h-20 flex-col gap-1 bg-surface p-1.5 transition-colors hover:bg-surface-2",
                  !inMonth && "opacity-40",
                  isSelected && "ring-2 ring-series-1 ring-inset",
                  isToday && !isSelected && "bg-series-1/10",
                )}
              >
                <span
                  className={cn(
                    "tabular text-xs",
                    isToday ? "font-semibold text-series-1" : inMonth ? "text-ink" : "text-muted",
                  )}
                >
                  {Number(day.date.slice(8, 10))}
                </span>

                <span className="flex flex-wrap gap-0.5" aria-hidden>
                  {active.map((category) => (
                    <span
                      key={category}
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: CATEGORY_COLOR[category] }}
                    />
                  ))}
                </span>

                {headline ? <span className="truncate text-[10px] leading-tight text-muted">{headline}</span> : null}

                {day.zadania.total > 0 ? (
                  <span className="tabular mt-auto text-[10px] text-muted">
                    zadania {day.zadania.done}/{day.zadania.total}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>

        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {CATEGORIES.map((category) => (
            <li key={category} className="flex items-center gap-1.5 text-xs text-muted">
              <span className="h-2 w-2 rounded-full" style={{ background: CATEGORY_COLOR[category] }} aria-hidden />
              {CATEGORY_KEYS[category]}
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardHeader title="Tydzień wybranego dnia" subtitle="Kategorie w wierszach, dni w kolumnach." />
        <CategoryWeek days={weekDays} today={today} currency={settings.currency} />
        <WeekTotals days={weekDays} currency={settings.currency} />
      </Card>

      {detail ? <DayDetail day={detail} today={today} currency={settings.currency} /> : null}
    </div>
  );
}

function DayDetail({
  day,
  today,
  currency,
}: {
  day: NonNullable<Awaited<ReturnType<typeof getCalendarRange>>[number]>;
  today: string;
  currency: string;
}) {
  const isFuture = day.date > today;

  // Sekcję dokładamy dopiero, gdy naprawdę ma treść — inaczej zostawałby sam nagłówek kategorii.
  const filled: Array<{ key: CategoryKey; content: React.ReactNode }> = [];

  const { cashBalancePln, changePln, changeSource, expensesPln, incomePln } = day.finanse;
  if (cashBalancePln !== null || expensesPln !== null || incomePln !== null) {
    filled.push({
      key: "finanse",
      content: (
        <div className="text-sm">
          {cashBalancePln !== null ? <p className="text-ink">{formatMoney(cashBalancePln, currency)}</p> : null}

          {/* Wpisane kwoty są konkretem: mówią, ile wyszło, a nie tylko jak zmieniło się saldo. */}
          {changeSource === "raport" ? (
            <ul className="mt-0.5 flex flex-col gap-0.5 text-xs">
              {incomePln !== null ? (
                <li className="text-[var(--delta-up)]">Wpłynęło +{formatMoney(incomePln, currency)}</li>
              ) : null}
              {expensesPln !== null ? (
                <li className="text-critical">Wydane −{formatMoney(expensesPln, currency)}</li>
              ) : null}
              {changePln !== null ? (
                <li className="text-muted">
                  Wynik dnia{" "}
                  <span
                    className={cn(
                      changePln > 0 ? "text-[var(--delta-up)]" : changePln < 0 ? "text-critical" : "text-ink-2",
                    )}
                  >
                    {changePln > 0 ? "+" : changePln < 0 ? "−" : ""}
                    {formatMoney(Math.abs(changePln), currency)}
                  </span>
                </li>
              ) : null}
            </ul>
          ) : changePln !== null ? (
            <p
              className={cn(
                "mt-0.5 text-xs",
                changePln > 0 ? "text-[var(--delta-up)]" : changePln < 0 ? "text-critical" : "text-muted",
              )}
            >
              {changePln > 0 ? "Zarobione" : changePln < 0 ? "Wydane" : "Bez zmiany"}{" "}
              {changePln !== 0 ? formatMoney(Math.abs(changePln), currency) : ""} od poprzedniego wpisu
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-muted">Pierwszy wpis — brak porównania</p>
          )}
        </div>
      ),
    });
  }

  if (day.oszczednosci.length > 0) {
    const total = day.oszczednosci.reduce((sum, entry) => sum + entry.amountPln, 0);
    filled.push({
      key: "finanse",
      content: (
        <ul className="flex flex-col gap-0.5 text-sm">
          {day.oszczednosci.map((entry) => (
            <li key={entry.name} className="flex items-center justify-between gap-3">
              <span className="truncate text-ink-2">→ {entry.name}</span>
              <span className="tabular text-[var(--series-3)]">{formatMoney(entry.amountPln, currency)}</span>
            </li>
          ))}
          {day.oszczednosci.length > 1 ? (
            <li className="mt-0.5 text-xs text-muted">
              Odłożone tego dnia: {formatMoney(total, currency)}
            </li>
          ) : null}
        </ul>
      ),
    });
  }

  if (day.platnosci.length > 0) {
    filled.push({
      key: "platnosci",
      content: (
        <ul className="flex flex-col gap-0.5 text-sm">
          {day.platnosci.map((payment) => (
            <li key={payment.name} className="flex items-center justify-between gap-3">
              <span className="truncate text-ink-2">
                {payment.status === "zaplacone" ? "✓ " : ""}
                {payment.name}
              </span>
              <span
                className={cn(
                  "tabular",
                  payment.status === "zalegle"
                    ? "text-critical"
                    : payment.status === "zaplacone"
                      ? "text-[var(--delta-up)]"
                      : "text-ink",
                )}
              >
                {formatMoney(payment.amountPln, currency)}
                {payment.status === "zalegle" ? " · zaległa" : ""}
              </span>
            </li>
          ))}
        </ul>
      ),
    });
  }

  if (day.sprzedaz.calls + day.sprzedaz.meetingsScheduled + day.sprzedaz.meetingsHeld + day.sprzedaz.contracts > 0) {
    filled.push({
      key: "sprzedaz",
      content: (
        <ul className="flex flex-col gap-0.5 text-sm text-ink-2">
          <li>{formatNumber(day.sprzedaz.calls)} rozmów</li>
          <li>
            {formatNumber(day.sprzedaz.meetingsScheduled)} spotkań umówionych ·{" "}
            {formatNumber(day.sprzedaz.meetingsHeld)} odbytych
          </li>
          {day.sprzedaz.contracts > 0 ? (
            <li className="text-ink">
              {formatNumber(day.sprzedaz.contracts)} umów na {formatMoney(day.sprzedaz.valuePln, currency)}
            </li>
          ) : null}
        </ul>
      ),
    });
  }

  if (
    day.zdrowie.dosesPlanned > 0 ||
    day.zdrowie.waterMl !== null ||
    day.zdrowie.weightKg !== null ||
    day.zdrowie.mood !== null ||
    day.zdrowie.goodThings ||
    day.zdrowie.thoughts
  ) {
    const dosesDone =
      day.zdrowie.dosesPlanned > 0 && day.zdrowie.dosesTaken / day.zdrowie.dosesPlanned >= DOSE_DONE_THRESHOLD;

    filled.push({
      key: "zdrowie",
      content: (
        <ul className="flex flex-col gap-0.5 text-sm text-ink-2">
          {day.zdrowie.dosesPlanned > 0 ? (
            <li className={dosesDone ? "text-[var(--delta-up)]" : undefined}>
              {isFuture
                ? `Zaplanowane dawki: ${day.zdrowie.dosesPlanned}`
                : `${dosesDone ? "✓ " : ""}Dawki: ${day.zdrowie.dosesTaken} z ${day.zdrowie.dosesPlanned}`}
            </li>
          ) : null}
          {day.zdrowie.waterMl !== null ? (
            <li className="flex items-center gap-2">
              Woda: {formatNumber(day.zdrowie.waterMl)} ml
              {day.zdrowie.waterStatus ? (
                <StatusPill
                  tone={
                    day.zdrowie.waterStatus === "dobrze"
                      ? "good"
                      : day.zdrowie.waterStatus === "norma"
                        ? "warning"
                        : "critical"
                  }
                >
                  {day.zdrowie.waterStatus === "norma"
                    ? "W normie"
                    : day.zdrowie.waterStatus === "dobrze"
                      ? "Dobrze"
                      : "Źle"}
                </StatusPill>
              ) : null}
            </li>
          ) : null}
          {day.zdrowie.weightKg !== null ? <li>Waga: {formatNumber(day.zdrowie.weightKg, 1)} kg</li> : null}
          {day.zdrowie.mood !== null || day.zdrowie.stress !== null ? (
            <li>
              {[
                day.zdrowie.mood !== null ? `samopoczucie ${day.zdrowie.mood}/5` : null,
                day.zdrowie.stress !== null ? `stres ${day.zdrowie.stress}/5` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </li>
          ) : null}
          {day.zdrowie.goodThings ? (
            <li className="text-ink">
              <span className="text-good">Dobrego:</span> {day.zdrowie.goodThings}
            </li>
          ) : null}
          {day.zdrowie.thoughts ? <li className="text-muted">{day.zdrowie.thoughts}</li> : null}
        </ul>
      ),
    });
  }

  for (const [key, entries] of [
    ["zadania", day.zadania.entries],
    ["trening", day.trening],
    ["nauka", day.nauka],
    ["projekty", day.projekty],
  ] as const) {
    if (entries.length > 0) filled.push({ key, content: <EntryList entries={entries} /> });
  }

  return (
    <Card id="dzien">
      <CardHeader
        title={formatFullDatePl(day.date)}
        subtitle={day.date === today ? "Dzisiaj" : isFuture ? "Plan na ten dzień" : "Zapis tego dnia"}
        action={
          <Link href={`/raport?data=${day.date}`} className="text-series-1 hover:underline">
            {isFuture ? "Zaplanuj w raporcie" : "Otwórz raport"}
          </Link>
        }
      />

      {filled.length === 0 ? (
        <EmptyState
          message={isFuture ? "Na ten dzień nic nie jest zaplanowane." : "Z tego dnia nie ma żadnego wpisu."}
          href={`/raport?data=${day.date}`}
          cta="Uzupełnij raport"
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filled.map((section) => (
            <section key={section.key}>
              <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted uppercase">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: CATEGORY_COLOR[section.key] }}
                  aria-hidden
                />
                {CATEGORY_KEYS[section.key]}
              </h3>
              {section.content}
            </section>
          ))}
        </div>
      )}
    </Card>
  );
}

function EntryList({ entries }: { entries: Array<{ label: string; detail?: string | null; done?: boolean }> }) {
  if (entries.length === 0) return null;
  return (
    <ul className="flex flex-col gap-1">
      {entries.map((entry, index) => (
        <li key={`${entry.label}-${index}`} className="flex items-start gap-2 text-sm">
          <span
            className={cn(
              "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
              entry.done ? "bg-good" : "bg-muted",
            )}
            aria-hidden
          />
          <span className="min-w-0">
            <span className={cn("block", entry.done ? "text-muted line-through" : "text-ink")}>{entry.label}</span>
            {entry.detail ? <span className="block text-xs text-muted">{entry.detail}</span> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

import Link from "next/link";
import type { Metadata } from "next";
import { and, asc, eq, gte, lt, lte } from "drizzle-orm";
import { ArchiveRestore, CalendarRange, Sparkles, Trophy } from "lucide-react";

import { HabitHeatmap, StreakBadge } from "@/components/charts/habit-heatmap";
import { Sparkline } from "@/components/charts/sparkline";
import { Card, CardHeader, EmptyState } from "@/components/ui/card";
import { carryOverTasks } from "@/lib/actions/quick";
import { getUserSettings, requireOnboardedUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { dailyLogs, tasks } from "@/lib/db/schema";
import { addDays, formatDatePl, startOfWeek, todayInTz } from "@/lib/domain/dates";
import { liveBalanceSeries } from "@/lib/domain/finance";
import { currentStreak, habitDaysFromCalendar, habitStrength, type HabitKey } from "@/lib/domain/habits";
import { summarizeWeek, weekRatio } from "@/lib/domain/week";
import { getBalanceRowsBefore } from "@/lib/queries/finance";
import { getCalendarRange } from "@/lib/queries/calendar";
import { formatMoney } from "@/lib/utils";

export const metadata: Metadata = { title: "Przegląd tygodnia" };
export const dynamic = "force-dynamic";

const HABIT_LABEL: Record<HabitKey, string> = {
  leki: "Leki i suplementy",
  woda: "Nawodnienie",
  trening: "Trening",
  nauka: "Nauka",
};

const HABIT_TONE: Record<HabitKey, string> = {
  leki: "var(--good)",
  woda: "var(--series-1)",
  trening: "var(--series-2)",
  nauka: "var(--series-3)",
};

export default async function WeekPage() {
  const user = await requireOnboardedUser();
  const settings = await getUserSettings(user.id);
  const today = todayInTz(settings.timezone);

  const weekStart = startOfWeek(today, settings.weekStartsOn);
  const prevWeekStart = addDays(weekStart, -7);
  const heatStart = startOfWeek(addDays(today, -55), settings.weekStartsOn);

  const heatDates: string[] = [];
  for (let date = heatStart; date <= today; date = addDays(date, 1)) heatDates.push(date);

  const [days, balancePre, balanceLogs, overdue] = await Promise.all([
    getCalendarRange(user.id, settings, heatDates),
    getBalanceRowsBefore(user.id, prevWeekStart),
    db
      .select()
      .from(dailyLogs)
      .where(and(eq(dailyLogs.userId, user.id), gte(dailyLogs.date, prevWeekStart), lte(dailyLogs.date, today)))
      .orderBy(asc(dailyLogs.date)),
    db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, user.id),
          eq(tasks.done, false),
          lt(tasks.date, today),
          gte(tasks.date, addDays(today, -30)),
        ),
      )
      .orderBy(asc(tasks.date), asc(tasks.position)),
  ]);

  const currentDays = days.filter((day) => day.date >= weekStart);
  const prevDays = days.filter((day) => day.date >= prevWeekStart && day.date < weekStart);
  const stats = summarizeWeek(currentDays);
  const prev = summarizeWeek(prevDays);

  // Saldo tygodnia: jedna seria na oba tygodnie, delta liczona z jej punktów.
  const balanceDates: string[] = [];
  for (let date = prevWeekStart; date <= today; date = addDays(date, 1)) balanceDates.push(date);
  const series = liveBalanceSeries([...balancePre, ...balanceLogs], balanceDates);
  const weekStartIdx = balanceDates.indexOf(weekStart);
  const wartoscNaStart = series[Math.max(weekStartIdx - 1, 0)] ?? series[weekStartIdx] ?? null;
  const wartoscTeraz = series.at(-1) ?? null;
  const saldoTygodnia = wartoscTeraz !== null && wartoscNaStart !== null ? wartoscTeraz - wartoscNaStart : null;
  const seriaTygodnia = series.slice(weekStartIdx);

  const habitDays = habitDaysFromCalendar(days);

  const metryki: Array<{ label: string; now: string; delta: number | null }> = [
    { label: "Zadania domknięte", now: `${stats.tasksDone} z ${stats.tasksTotal}`, delta: stats.tasksDone - prev.tasksDone },
    { label: "Treningi", now: `${stats.trainingDone} z ${stats.trainingPlanned}`, delta: stats.trainingDone - prev.trainingDone },
    { label: "Bloki nauki", now: `${stats.learningDone} z ${stats.learningPlanned}`, delta: stats.learningDone - prev.learningDone },
    {
      label: "Leki",
      now: weekRatio(stats.dosesTaken, stats.dosesPlanned) === null ? "—" : `${weekRatio(stats.dosesTaken, stats.dosesPlanned)}%`,
      delta: null,
    },
    { label: "Dni z wodą w normie", now: `${stats.waterDaysOk} z 7`, delta: stats.waterDaysOk - prev.waterDaysOk },
    { label: "Rozmowy", now: `${stats.calls}`, delta: stats.calls - prev.calls },
    { label: "Spotkania odbyte", now: `${stats.meetingsHeld}`, delta: stats.meetingsHeld - prev.meetingsHeld },
    {
      label: "Umowy",
      now: `${stats.contracts} · ${formatMoney(stats.contractsValuePln, settings.currency)}`,
      delta: stats.contracts - prev.contracts,
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <Card id="liczby">
        <CardHeader
          title="Przegląd tygodnia"
          subtitle={`Od ${formatDatePl(weekStart)} do dziś, porównanie z poprzednim tygodniem`}
          icon={CalendarRange}
          action={
            <Link href="/mentor" className="text-muted hover:text-ink">
              Mentor
            </Link>
          }
        />
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-4">
          {metryki.map((metryka) => (
            <div key={metryka.label}>
              <dt className="text-xs text-muted">{metryka.label}</dt>
              <dd className="tabular mt-0.5 text-lg font-semibold text-ink">{metryka.now}</dd>
              {metryka.delta !== null && metryka.delta !== 0 ? (
                <dd className={`text-xs ${metryka.delta > 0 ? "text-[var(--delta-up)]" : "text-critical"}`}>
                  {metryka.delta > 0 ? "▲" : "▼"} {Math.abs(metryka.delta)} vs poprzedni
                </dd>
              ) : null}
            </div>
          ))}
        </dl>
      </Card>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card id="saldo">
          <CardHeader title="Saldo tygodnia" subtitle="Zmiana stanu środków od początku tygodnia" />
          {saldoTygodnia === null ? (
            <EmptyState message="Brak wpisów o stanie środków." href="/finanse" cta="Zobacz finanse" />
          ) : (
            <>
              <p
                className={`tabular text-3xl leading-none font-semibold ${
                  saldoTygodnia >= 0 ? "text-[var(--delta-up)]" : "text-critical"
                }`}
              >
                {saldoTygodnia >= 0 ? "+" : "−"}
                {formatMoney(Math.abs(saldoTygodnia), settings.currency)}
              </p>
              <div className="mt-4">
                <Sparkline values={seriaTygodnia} height={56} label="Saldo w tym tygodniu" />
              </div>
            </>
          )}
        </Card>

        <Card id="wygrane">
          <CardHeader title="Wygrane tygodnia" subtitle="Z pola „co dobrego się wydarzyło”" icon={Trophy} />
          {stats.goodThings.length === 0 ? (
            <EmptyState
              message="Brak wpisów w tym tygodniu — wieczorny raport ma na to miejsce."
              href="/raport"
              cta="Wypełnij raport"
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {stats.goodThings.map((entry) => (
                <li key={entry.date} className="rounded-lg border border-edge p-3">
                  <p className="text-xs text-muted">{formatDatePl(entry.date)}</p>
                  <p className="mt-0.5 text-sm text-ink">{entry.text}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card id="serie">
        <CardHeader
          title="Serie nawyków"
          subtitle="Ostatnie 8 tygodni — jeden gorszy dzień nie zeruje serii, dwa z rzędu tak"
          icon={Sparkles}
        />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {(Object.keys(HABIT_LABEL) as HabitKey[]).map((key) => {
            const seria = currentStreak(habitDays[key], today);
            const sila = habitStrength(habitDays[key]);
            return (
              <div key={key}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-ink">
                    {HABIT_LABEL[key]} <span className="text-xs text-muted">· siła {sila}%</span>
                  </p>
                  <StreakBadge length={seria.length} label={HABIT_LABEL[key]} />
                </div>
                <HabitHeatmap
                  days={habitDays[key]}
                  weekStartsOn={settings.weekStartsOn}
                  label={`Regularność: ${HABIT_LABEL[key]}`}
                  tone={HABIT_TONE[key]}
                />
              </div>
            );
          })}
        </div>
      </Card>

      <Card id="zalegle">
        <CardHeader
          title="Zaległe zadania"
          subtitle="Niedokończone z ostatnich 30 dni"
          icon={ArchiveRestore}
          action={
            overdue.length > 0 ? (
              <form action={carryOverTasks}>
                <button
                  type="submit"
                  className="inline-flex h-8 items-center rounded-lg bg-series-1 px-3 text-xs font-medium text-white hover:brightness-110"
                >
                  Przenieś zaległe na dziś
                </button>
              </form>
            ) : undefined
          }
        />
        {overdue.length === 0 ? (
          <p className="rounded-lg border border-good/40 bg-good/10 px-3 py-2.5 text-sm text-ink">
            Nic nie zalega — czysty tydzień.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {overdue.map((task) => (
              <li
                key={task.id}
                className="flex items-center justify-between gap-3 border-b border-line py-1.5 text-sm last:border-0"
              >
                <span className="text-ink">{task.title}</span>
                <span className="shrink-0 text-xs text-muted">{formatDatePl(task.date)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

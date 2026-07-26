import Link from "next/link";
import {
  AlertTriangle,
  Brain,
  CalendarDays,
  CheckCircle2,
  Droplets,
  Dumbbell,
  FolderKanban,
  GraduationCap,
  HeartPulse,
  ListChecks,
  ListTodo,
  Scale,
  Smile,
  Trophy,
  TrendingUp,
  Wallet,
  XCircle,
} from "lucide-react";

import { CategoryWeek, WeekTotals } from "@/components/calendar/category-week";
import { Meter, Sparkline } from "@/components/charts/sparkline";
import { Card, CardHeader, EmptyState, StatTile, StatusPill } from "@/components/ui/card";
import { addWater, toggleDose, toggleLearning, toggleTask, toggleTraining } from "@/lib/actions/quick";
import { getUserSettings, requireOnboardedUser } from "@/lib/auth/session";
import { cn, formatTime, formatMoney, formatNumber } from "@/lib/utils";
import { AGENDA_CATEGORY_LABEL, CATEGORY_COLOR, buildAgenda } from "@/lib/domain/agenda";
import { addDays, diffDays, startOfWeek, todayInTz } from "@/lib/domain/dates";
import { formatDose, groupDosesBySlot } from "@/lib/domain/medication";
import { formatRecordValue } from "@/lib/domain/records";
import { conversionRates, formatPercent, goalProgress } from "@/lib/domain/sales";
import { WATER_STATUS_LABEL, waterPercent, waterStatus } from "@/lib/domain/water";
import { WEIGHT_STATUS_LABEL, describeWeightProgress, weightPlanProgress } from "@/lib/domain/weight";
import { getCalendarRange } from "@/lib/queries/calendar";
import { getDashboardData } from "@/lib/queries/dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ zapisano?: string }>;
}) {
  const user = await requireOnboardedUser();
  const settings = await getUserSettings(user.id);
  const today = todayInTz(settings.timezone);
  const weekStart = startOfWeek(today, settings.weekStartsOn);
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const [data, weekDays, params] = await Promise.all([
    getDashboardData(user.id, settings, today),
    getCalendarRange(user.id, settings, weekDates),
    searchParams,
  ]);

  return (
    // items-start: krótki kafelek nie rozciąga się do wysokości najwyższego w rzędzie.
    <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 xl:grid-cols-6">
      {params.zapisano ? (
        <p className="rounded-lg border border-good/40 bg-good/10 px-3 py-2 text-sm text-ink md:col-span-2 xl:col-span-6">
          Raport z dnia {params.zapisano} zapisany.
        </p>
      ) : null}
      <Finanse data={data} currency={settings.currency} />
      <Sprzedaz data={data} settings={settings} currency={settings.currency} />
      <PlanDnia data={data} />
      <Leki data={data} today={today} />
      <Priorytety data={data} />
      <Trening data={data} today={today} />
      <Nauka data={data} today={today} />
      <Nawodnienie data={data} settings={settings} today={today} />
      <Waga data={data} settings={settings} today={today} />
      <Psychika data={data} />
      <Rekordy data={data} />
      <Projekty data={data} today={today} />
      <Tydzien days={weekDays} today={today} currency={settings.currency} />
      <Mentor data={data} />
    </div>
  );
}

type Data = Awaited<ReturnType<typeof getDashboardData>>;
type Ustawienia = Awaited<ReturnType<typeof getUserSettings>>;

/* --------------------------------------------------------------- finanse */

function Finanse({ data, currency }: { data: Data; currency: string }) {
  const { current, previous, series, todayFlow, weekSpentPln, weekEarnedPln } = data.finanse;
  const delta = current && previous ? current.cashBalancePln! - previous.cashBalancePln! : null;
  const hasBalance = current?.cashBalancePln !== undefined && current?.cashBalancePln !== null;
  const hasFlow = todayFlow.expensesPln !== null || todayFlow.incomePln !== null;

  // Przepływy dnia i tygodnia: wydatki zawsze z minusem, wpływy z plusem.
  const flowLines: Array<{ label: string; value: string; className: string }> = [];
  if (todayFlow.incomePln !== null) {
    flowLines.push({
      label: "Dziś wpłynęło",
      value: `+${formatMoney(todayFlow.incomePln, currency)}`,
      className: "text-[var(--delta-up)]",
    });
  }
  if (todayFlow.expensesPln !== null) {
    flowLines.push({
      label: "Dziś wydane",
      value: `−${formatMoney(todayFlow.expensesPln, currency)}`,
      className: "text-critical",
    });
  }
  if (weekEarnedPln !== null) {
    flowLines.push({
      label: "Wpłynęło w tym tygodniu",
      value: `+${formatMoney(weekEarnedPln, currency)}`,
      className: "text-[var(--delta-up)]",
    });
  }
  if (weekSpentPln !== null) {
    flowLines.push({
      label: "Wydane w tym tygodniu",
      value: `−${formatMoney(weekSpentPln, currency)}`,
      className: "text-critical",
    });
  }

  return (
    <Card className="xl:col-span-2">
      <CardHeader
        title="Stan środków"
        subtitle={current ? `Ostatni wpis: ${current.date}` : undefined}
        icon={Wallet}
        action={
          <Link href="/finanse" className="text-muted hover:text-ink">
            Szczegóły
          </Link>
        }
      />
      {hasBalance || hasFlow ? (
        <>
          {/* Jedna liczba wiodąca na całym widoku. */}
          {hasBalance ? (
            <p className="text-[2.75rem] leading-none font-semibold text-ink">
              {formatMoney(current!.cashBalancePln!, currency)}
            </p>
          ) : (
            <p className="text-sm text-muted">Brak wpisu o stanie środków — poniżej same przepływy.</p>
          )}
          {delta !== null ? (
            <p className={`mt-1.5 text-xs ${delta >= 0 ? "text-[var(--delta-up)]" : "text-critical"}`}>
              {delta >= 0 ? "▲" : "▼"} {formatMoney(Math.abs(delta), currency)}
              <span className="text-muted"> od poprzedniego wpisu</span>
            </p>
          ) : null}

          {flowLines.length > 0 ? (
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-line pt-3">
              {flowLines.map((line) => (
                <div key={line.label}>
                  <dt className="text-xs text-muted">{line.label}</dt>
                  <dd className={`tabular mt-0.5 text-sm font-medium ${line.className}`}>{line.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          {hasBalance ? (
            <div className="mt-3">
              <Sparkline values={series} label="Stan środków w ostatnich 30 dniach" />
              <p className="mt-1 text-xs text-muted">Ostatnie 30 dni</p>
            </div>
          ) : null}
        </>
      ) : (
        <EmptyState message="Brak wpisu o stanie środków." href="/raport" cta="Wypełnij raport" />
      )}
    </Card>
  );
}

/* -------------------------------------------------------------- sprzedaż */

function Sprzedaz({ data, settings, currency }: { data: Data; settings: Ustawienia; currency: string }) {
  const today = data.sprzedaz.today;
  const week = data.sprzedaz.week;
  const rates = conversionRates(week);

  const liczniki = [
    { label: "Rozmowy", value: today?.calls ?? 0, week: week.calls, goal: settings.goalCallsPerDay },
    {
      label: "Spotkania umówione",
      value: today?.meetingsScheduled ?? 0,
      week: week.meetingsScheduled,
      goal: settings.goalMeetingsScheduledPerDay,
    },
    {
      label: "Spotkania odbyte",
      value: today?.meetingsHeld ?? 0,
      week: week.meetingsHeld,
      goal: settings.goalMeetingsHeldPerDay,
    },
    { label: "Umowy (tydzień)", value: week.contracts, week: week.contracts, goal: settings.goalContractsPerWeek },
  ];

  return (
    <Card className="md:col-span-2 xl:col-span-4">
      <CardHeader
        title="Sprzedaż"
        subtitle="Dziś oraz narastająco w tym tygodniu"
        icon={TrendingUp}
        action={
          <Link href="/sprzedaz" className="text-muted hover:text-ink">
            Szczegóły
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {liczniki.map((item) => {
          const progress = goalProgress(item.value, item.goal);
          return (
            <StatTile
              key={item.label}
              label={item.label}
              value={formatNumber(item.value)}
              footer={`${formatNumber(item.week)} w tygodniu`}
            >
              {progress ? (
                <div className="mt-1">
                  <Meter
                    value={progress.actual}
                    max={progress.goal}
                    tone={progress.pct >= 100 ? "var(--good)" : "var(--series-1)"}
                    label={`${item.label}: ${progress.pct}% celu`}
                  />
                  <p className="mt-1 text-xs text-muted">
                    cel {formatNumber(progress.goal)} · {progress.pct}%
                  </p>
                </div>
              ) : null}
            </StatTile>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 border-t border-line pt-3 sm:grid-cols-2">
        <div>
          <p className="text-xs text-muted">Wartość kontraktów w tym tygodniu</p>
          <p className="mt-0.5 text-xl font-semibold text-ink">{formatMoney(week.valuePln, currency)}</p>
          <p className="mt-0.5 text-xs text-muted">
            W tym miesiącu: {formatMoney(data.sprzedaz.month.valuePln, currency)} ·{" "}
            {formatNumber(data.sprzedaz.month.contracts)} umów
          </p>
        </div>
        <dl className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <dt className="text-muted">Rozmowa → spotkanie</dt>
            <dd className="tabular mt-0.5 text-sm font-medium text-ink">{formatPercent(rates.callToScheduled)}</dd>
          </div>
          <div>
            <dt className="text-muted">Umówione → odbyte</dt>
            <dd className="tabular mt-0.5 text-sm font-medium text-ink">{formatPercent(rates.scheduledToHeld)}</dd>
          </div>
          <div>
            <dt className="text-muted">Odbyte → umowa</dt>
            <dd className="tabular mt-0.5 text-sm font-medium text-ink">{formatPercent(rates.heldToContract)}</dd>
          </div>
        </dl>
      </div>
    </Card>
  );
}

/* --------------------------------------------------------- plan na dziś */

/**
 * Jedna oś czasu dnia złożona ze wszystkich kategorii — żeby po wejściu na stronę
 * główną było widać cały plan, a nie trzeba go składać z osobnych kafelków.
 */
function PlanDnia({ data }: { data: Data }) {
  const agenda = buildAgenda({
    doses: data.zdrowie.doses,
    training: data.trening.planned.map(({ plan, log }) => ({
      id: plan.id,
      discipline: plan.discipline,
      title: plan.title,
      startTime: plan.startTime,
      durationMin: plan.durationMin,
      done: Boolean(log?.done),
    })),
    learning: data.nauka.blocks.map(({ block, log }) => ({
      id: block.planId,
      skill: block.skill,
      startTime: block.startTime,
      durationMin: block.durationMin,
      focus: block.focus,
      done: Boolean(log?.done),
    })),
    tasks: [...data.zadania.priorytety, ...data.zadania.side],
  });

  const done = agenda.filter((item) => item.done).length;

  return (
    <Card className="xl:col-span-2">
      <CardHeader
        title="Plan na dziś"
        subtitle={agenda.length > 0 ? `Zrobione ${done} z ${agenda.length}` : undefined}
        icon={ListChecks}
        action={
          <Link href="/kalendarz" className="text-muted hover:text-ink">
            Kalendarz
          </Link>
        }
      />

      {agenda.length === 0 ? (
        <EmptyState
          message="Na dziś nic nie jest zaplanowane — ani leków, ani treningu, ani nauki, ani zadań."
          href="/raport"
          cta="Wypełnij raport"
        />
      ) : (
        <>
          <Meter value={done} max={agenda.length} tone="var(--good)" label="Realizacja planu dnia" />
          <ul className="mt-3 flex flex-col gap-0.5">
            {agenda.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className="flex items-baseline gap-2.5 rounded-lg px-2 py-1.5 hover:bg-surface-2"
                >
                  <span className="tabular w-14 shrink-0 text-xs text-muted">{item.when ?? "—"}</span>
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: CATEGORY_COLOR[item.category] }}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className={cn("block truncate text-sm", item.done ? "text-muted line-through" : "text-ink")}>
                      {item.title}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {AGENDA_CATEGORY_LABEL[item.category]}
                      {item.detail ? ` · ${item.detail}` : ""}
                    </span>
                  </span>
                  {item.done ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-good" /> : null}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

/* ------------------------------------------------------ leki i suplementy */

function Leki({ data, today }: { data: Data; today: string }) {
  const { doses, hasMedications } = data.zdrowie;
  const taken = doses.filter((dose) => dose.taken).length;

  return (
    <Card className="xl:col-span-2">
      <CardHeader
        title="Leki i suplementy"
        subtitle={doses.length > 0 ? `Przyjęte ${taken} z ${doses.length}` : undefined}
        icon={HeartPulse}
      />

      {doses.length === 0 ? (
        <EmptyState
          message={
            hasMedications
              ? "Na dziś nie zaplanowano żadnej dawki."
              : "Nie masz jeszcze dodanych leków ani suplementów."
          }
          href="/ustawienia/leki"
        />
      ) : (
        <>
          <Meter value={taken} max={doses.length} tone="var(--good)" label="Postęp przyjmowania dawek" />
          <div className="mt-3 flex flex-col gap-3">
            {groupDosesBySlot(doses).map(({ slot, doses: slotDoses }) => (
              <div key={slot}>
                <p className="mb-1 text-xs font-medium tracking-wide text-muted uppercase">{slot}</p>
                <ul className="flex flex-col gap-1">
                  {slotDoses.map((dose) => (
                    <li key={`${dose.medicationId}-${dose.slot}`}>
                      <form action={toggleDose}>
                        <input type="hidden" name="medicationId" value={dose.medicationId} />
                        <input type="hidden" name="slot" value={dose.slot} />
                        <input type="hidden" name="date" value={today} />
                        <input type="hidden" name="taken" value={dose.taken ? "0" : "1"} />
                        <button
                          type="submit"
                          className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-surface-2"
                        >
                          <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                              dose.taken ? "border-good bg-good text-white" : "border-edge"
                            }`}
                            aria-hidden
                          >
                            {dose.taken ? <CheckCircle2 className="h-3 w-3" /> : null}
                          </span>
                          <span className={`flex-1 truncate text-sm ${dose.taken ? "text-muted line-through" : "text-ink"}`}>
                            {dose.name}
                          </span>
                          <span className="shrink-0 text-xs text-muted">{formatDose(dose)}</span>
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}

/* -------------------------------------------------------------- zadania */

function Priorytety({ data }: { data: Data }) {
  const { priorytety, side } = data.zadania;

  return (
    <Card className="xl:col-span-2">
      <CardHeader
        title="Zadania na dziś"
        subtitle="3 priorytety i side questy"
        icon={ListTodo}
        action={
          <Link href="/zadania" className="text-muted hover:text-ink">
            Wszystkie
          </Link>
        }
      />

      {priorytety.length === 0 && side.length === 0 ? (
        <EmptyState message="Nie masz zadań na dziś." href="/raport" cta="Dodaj w raporcie" />
      ) : (
        <div className="flex flex-col gap-3">
          <ul className="flex flex-col gap-1.5">
            {priorytety.map((task, index) => (
              <li key={task.id}>
                <form action={toggleTask}>
                  <input type="hidden" name="taskId" value={task.id} />
                  <button
                    type="submit"
                    className="flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-surface-2"
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs font-semibold ${
                        task.done ? "border-good bg-good text-white" : "border-edge text-muted"
                      }`}
                    >
                      {task.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : index + 1}
                    </span>
                    <span className={`flex-1 text-sm ${task.done ? "text-muted line-through" : "text-ink"}`}>
                      {task.title}
                    </span>
                  </button>
                </form>
              </li>
            ))}
          </ul>

          {side.length > 0 ? (
            <div className="border-t border-line pt-2">
              <p className="mb-1 text-xs font-medium tracking-wide text-muted uppercase">Side questy</p>
              <ul className="flex flex-col gap-0.5">
                {side.map((task) => (
                  <li key={task.id}>
                    <form action={toggleTask}>
                      <input type="hidden" name="taskId" value={task.id} />
                      <button
                        type="submit"
                        className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-surface-2"
                      >
                        <span
                          className={`h-3.5 w-3.5 shrink-0 rounded border ${
                            task.done ? "border-good bg-good" : "border-edge"
                          }`}
                          aria-hidden
                        />
                        <span className={`flex-1 truncate text-xs ${task.done ? "text-muted line-through" : "text-ink-2"}`}>
                          {task.title}
                        </span>
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </Card>
  );
}

/* --------------------------------------------------------------- trening */

function Trening({ data, today }: { data: Data; today: string }) {
  const { planned, extra, hasPlan } = data.trening;

  return (
    <Card className="xl:col-span-2">
      <CardHeader title="Trening dziś" icon={Dumbbell} action={<Link href="/trening" className="text-muted hover:text-ink">Plan</Link>} />

      {planned.length === 0 ? (
        <EmptyState
          message={hasPlan ? "Dziś dzień bez treningu w planie." : "Nie masz jeszcze planu treningowego."}
          href={hasPlan ? undefined : "/ustawienia/trening"}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {planned.map(({ plan, log }) => (
            <li key={plan.id} className="rounded-lg border border-edge p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{plan.title || plan.discipline}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {plan.discipline}
                    {plan.startTime ? ` · ${formatTime(plan.startTime)}` : ""}
                    {plan.durationMin ? ` · ${plan.durationMin} min` : ""}
                  </p>
                  {plan.note ? <p className="mt-1 text-xs text-ink-2">{plan.note}</p> : null}
                </div>
                <form action={toggleTraining} className="shrink-0">
                  <input type="hidden" name="planId" value={plan.id} />
                  <input type="hidden" name="date" value={today} />
                  <input type="hidden" name="done" value={log?.done ? "0" : "1"} />
                  <button
                    type="submit"
                    className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${
                      log?.done ? "border-good bg-good/10 text-ink" : "border-edge text-ink-2 hover:bg-surface-2"
                    }`}
                  >
                    {log?.done ? "Odbyty" : "Odhacz"}
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      {extra.length > 0 ? (
        <p className="mt-2 text-xs text-muted">
          Poza planem: {extra.map((log) => log.title || log.discipline).join(", ")}
        </p>
      ) : null}
    </Card>
  );
}

/* ----------------------------------------------------------------- nauka */

function Nauka({ data, today }: { data: Data; today: string }) {
  const { blocks, hasPlan } = data.nauka;

  return (
    <Card className="xl:col-span-2">
      <CardHeader title="Blok nauki" icon={GraduationCap} action={<Link href="/nauka" className="text-muted hover:text-ink">Plan</Link>} />

      {blocks.length === 0 ? (
        <EmptyState
          message={hasPlan ? "Dziś nie masz zaplanowanego bloku nauki." : "Nie masz jeszcze planu nauki."}
          href={hasPlan ? undefined : "/ustawienia/nauka"}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {blocks.map(({ block, log }) => (
            <li key={block.planId} className="rounded-lg border border-edge p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-baseline gap-2">
                    {block.startTime ? (
                      <span className="tabular text-lg font-semibold text-ink">{formatTime(block.startTime)}</span>
                    ) : null}
                    <span className="truncate text-sm font-medium text-ink">{block.skill}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {block.durationMin ? `${block.durationMin} min` : "czas nieokreślony"}
                  </p>
                  {block.focus ? (
                    <p className="mt-1 text-xs text-ink-2">
                      Zakres z planu rocznego: <span className="text-ink">{block.focus}</span>
                    </p>
                  ) : null}
                  {block.target ? <p className="mt-0.5 text-xs text-muted">Cel: {block.target}</p> : null}
                </div>
                <form action={toggleLearning} className="shrink-0">
                  <input type="hidden" name="planId" value={block.planId} />
                  <input type="hidden" name="date" value={today} />
                  <input type="hidden" name="done" value={log?.done ? "0" : "1"} />
                  <button
                    type="submit"
                    className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${
                      log?.done ? "border-good bg-good/10 text-ink" : "border-edge text-ink-2 hover:bg-surface-2"
                    }`}
                  >
                    {log?.done ? "Zrobione" : "Odhacz"}
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* ----------------------------------------------------------- nawodnienie */

const WATER_TONE = { dobrze: "var(--good)", norma: "var(--warning)", zle: "var(--critical)" } as const;
const WATER_PILL = { dobrze: "good", norma: "warning", zle: "critical" } as const;
const WATER_ICON = { dobrze: CheckCircle2, norma: AlertTriangle, zle: XCircle } as const;

function Nawodnienie({ data, settings, today }: { data: Data; settings: Ustawienia; today: string }) {
  const { water } = data.zdrowie;
  const goal = settings.waterGoalMl;
  const avgStatus = waterStatus(water.weekAverage, goal, settings.waterGoodPct, settings.waterOkPct);
  const todayPct = waterPercent(water.today, goal);

  return (
    <Card className="xl:col-span-2">
      <CardHeader title="Nawodnienie" icon={Droplets} />

      {!goal ? (
        <EmptyState message="Nie masz ustawionego dziennego celu picia wody." href="/ustawienia/cele" />
      ) : (
        <>
          <StatTile
            label="Dzisiaj"
            value={formatNumber(water.today ?? 0)}
            unit={`ml z ${formatNumber(goal)} ml`}
            footer={todayPct !== null ? `${todayPct}% celu` : undefined}
          >
            <div className="mt-1.5">
              <Meter
                value={water.today ?? 0}
                max={goal}
                tone={WATER_TONE[waterStatus(water.today, goal, settings.waterGoodPct, settings.waterOkPct) ?? "zle"]}
                label="Nawodnienie dziś"
              />
            </div>
          </StatTile>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {[250, 500, 750].map((amount) => (
              <form action={addWater} key={amount}>
                <input type="hidden" name="date" value={today} />
                <input type="hidden" name="amount" value={amount} />
                <button
                  type="submit"
                  className="rounded-lg border border-edge px-2.5 py-1 text-xs font-medium text-ink-2 hover:bg-surface-2 hover:text-ink"
                >
                  +{amount} ml
                </button>
              </form>
            ))}
          </div>

          <div className="mt-3 border-t border-line pt-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted">Średnia tygodniowa</p>
                <p className="tabular mt-0.5 text-lg font-semibold text-ink">
                  {water.weekAverage === null ? "—" : `${formatNumber(Math.round(water.weekAverage))} ml`}
                </p>
              </div>
              {avgStatus ? (
                <StatusPill tone={WATER_PILL[avgStatus]} icon={WATER_ICON[avgStatus]}>
                  {WATER_STATUS_LABEL[avgStatus]}
                </StatusPill>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-muted">
              Liczona z dni, w których cokolwiek zapisałeś — dzień bez raportu nie zaniża wyniku.
            </p>
          </div>
        </>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ waga */

const WEIGHT_PILL = { przed: "good", zgodnie: "good", za: "warning" } as const;

function Waga({ data, settings, today }: { data: Data; settings: Ustawienia; today: string }) {
  const { weight } = data.zdrowie;
  const current = weight.current?.weightKg ?? null;
  const previous = weight.previous?.weightKg ?? null;
  const delta = current !== null && previous !== null ? current - previous : null;

  const plan = weightPlanProgress({
    startKg: settings.weightStartKg,
    startDate: settings.weightStartDate,
    targetKg: settings.weightTargetKg,
    targetDate: settings.weightTargetDate,
    currentKg: current,
    currentDate: weight.current?.date ?? today,
  });

  return (
    <Card className="xl:col-span-2">
      <CardHeader title="Waga" icon={Scale} />
      {current === null ? (
        <EmptyState message="Brak wpisu o wadze." href="/raport" cta="Wypełnij raport" />
      ) : (
        <>
          <StatTile
            label={weight.current ? `Ostatni pomiar: ${weight.current.date}` : "Ostatni pomiar"}
            value={formatNumber(current, 1)}
            unit="kg"
            delta={
              delta !== null && Math.abs(delta) > 0.001
                ? {
                    value: `${formatNumber(Math.abs(delta), 1)} kg`,
                    direction: delta > 0 ? "up" : "down",
                    goodDirection:
                      settings.weightTargetKg === null || settings.weightTargetKg === undefined
                        ? undefined
                        : settings.weightTargetKg < current
                          ? "down"
                          : "up",
                    period: "od poprzedniego pomiaru",
                  }
                : undefined
            }
          >
            <div className="mt-2">
              <Sparkline values={weight.series} label="Waga w ostatnich 30 dniach" />
              <p className="mt-1 text-xs text-muted">Ostatnie 30 dni</p>
            </div>
          </StatTile>

          <div className="mt-3 border-t border-line pt-3">
            {settings.weightTargetKg === null ? (
              <EmptyState message="Nie masz ustawionej wagi docelowej." href="/ustawienia/cele" />
            ) : (
              <>
                <div className="flex items-baseline justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted">Waga docelowa</p>
                    <p className="tabular mt-0.5 text-lg font-semibold text-ink">
                      {formatNumber(settings.weightTargetKg, 1)} kg
                    </p>
                  </div>
                  {plan ? (
                    <StatusPill tone={WEIGHT_PILL[plan.status]} icon={plan.status === "za" ? AlertTriangle : CheckCircle2}>
                      {WEIGHT_STATUS_LABEL[plan.status]}
                    </StatusPill>
                  ) : null}
                </div>

                {plan ? (
                  <>
                    <div className="mt-2">
                      <Meter
                        value={Math.min(Math.max(plan.progressPct, 0), 100)}
                        max={100}
                        tone={plan.status === "za" ? "var(--warning)" : "var(--good)"}
                        label="Postęp planu wagowego"
                      />
                      <p className="mt-1 flex justify-between text-xs text-muted">
                        <span>
                          {formatNumber(Math.max(plan.progressPct, 0), 0)}% celu · {formatNumber(plan.elapsedPct, 0)}%
                          czasu
                        </span>
                        <span>{plan.daysLeft >= 0 ? `${plan.daysLeft} dni do terminu` : "po terminie"}</span>
                      </p>
                    </div>
                    <p className="mt-2 text-xs text-ink-2">{describeWeightProgress(plan)}</p>
                    <p className="mt-1 text-xs text-muted">
                      Tempo: {formatNumber(plan.actualPacePerWeek ?? 0, 2)} kg/tydz. przy planowanych{" "}
                      {formatNumber(plan.plannedPacePerWeek, 2)} kg/tydz.
                    </p>
                  </>
                ) : (
                  <p className="mt-1.5 text-xs text-muted">
                    Do celu {formatNumber(Math.abs(current - settings.weightTargetKg), 1)} kg.{" "}
                    <Link href="/ustawienia/cele" className="text-series-1 hover:underline">
                      Dodaj termin
                    </Link>
                    , żeby zobaczyć, czy idziesz zgodnie z planem.
                  </p>
                )}
              </>
            )}
          </div>
        </>
      )}
    </Card>
  );
}

/* --------------------------------------------------- zdrowie psychiczne */

function Psychika({ data }: { data: Data }) {
  const { dzis, srednieTygodnia, ostatnieDobre } = data.psychika;
  const hasToday =
    dzis.mood !== null || dzis.energy !== null || dzis.stress !== null || dzis.thoughts || dzis.goodThings;

  const scores = [
    { label: "Samopoczucie", value: dzis.mood, avg: srednieTygodnia.mood, goodHigh: true },
    { label: "Energia", value: dzis.energy, avg: srednieTygodnia.energy, goodHigh: true },
    { label: "Stres", value: dzis.stress, avg: srednieTygodnia.stress, goodHigh: false },
  ];

  return (
    <Card className="xl:col-span-2">
      <CardHeader
        title="Zdrowie psychiczne"
        subtitle={dzis.sleepH !== null ? `Sen: ${formatNumber(dzis.sleepH, 1)} h` : undefined}
        icon={Smile}
        action={
          <Link href="/zdrowie#psychika" className="text-muted hover:text-ink">
            Szczegóły
          </Link>
        }
      />

      {!hasToday ? (
        <EmptyState message="Dziś nie wypełniłeś jeszcze tej części raportu." href="/raport" cta="Wypełnij raport" />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            {scores.map((score) => (
              <div key={score.label}>
                <p className="text-xs text-muted">{score.label}</p>
                <p className="tabular mt-0.5 text-xl font-semibold text-ink">
                  {score.value === null ? "—" : score.value}
                  {score.value === null ? "" : <span className="text-sm font-normal text-muted"> / 5</span>}
                </p>
                <p className="text-xs text-muted">
                  {score.avg === null ? "—" : `śr. ${formatNumber(score.avg, 1)}`}
                </p>
              </div>
            ))}
          </div>

          {dzis.goodThings ? (
            <div className="mt-3 rounded-lg border border-good/40 bg-good/10 px-3 py-2">
              <p className="text-xs font-medium tracking-wide text-muted uppercase">Co dobrego</p>
              <p className="mt-0.5 text-sm text-ink">{dzis.goodThings}</p>
            </div>
          ) : null}

          {dzis.thoughts ? (
            <div className="mt-2 rounded-lg border border-edge px-3 py-2">
              <p className="text-xs font-medium tracking-wide text-muted uppercase">Myśli</p>
              <p className="mt-0.5 text-sm text-ink-2">{dzis.thoughts}</p>
            </div>
          ) : null}
        </>
      )}

      {ostatnieDobre.length > 0 && !dzis.goodThings ? (
        <div className="mt-3 border-t border-line pt-3">
          <p className="mb-1 text-xs font-medium tracking-wide text-muted uppercase">Ostatnio dobrego</p>
          <ul className="flex flex-col gap-1">
            {ostatnieDobre.map((entry) => (
              <li key={entry.date} className="text-xs text-ink-2">
                <span className="text-muted">{entry.date}</span> · {entry.text}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}

/* --------------------------------------------------------------- rekordy */

function Rekordy({ data }: { data: Data }) {
  return (
    <Card className="xl:col-span-2">
      <CardHeader
        title="Rekordy"
        subtitle="Najlepsze wyniki wg dyscyplin"
        icon={Trophy}
        action={
          <Link href="/trening#rekordy" className="text-muted hover:text-ink">
            Wszystkie
          </Link>
        }
      />
      {data.rekordy.length === 0 ? (
        <EmptyState message="Nie masz jeszcze zapisanych rekordów." href="/ustawienia/rekordy" />
      ) : (
        <ul className="flex flex-col gap-2">
          {data.rekordy.slice(0, 5).map((group) => (
            <li key={`${group.discipline}-${group.metric}`} className="flex items-baseline justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm text-ink">{group.discipline}</p>
                <p className="truncate text-xs text-muted">{group.metric}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="tabular text-sm font-semibold text-ink">
                  {formatRecordValue({ unit: group.unit, value: group.best.value })}
                </p>
                <p className="text-xs text-muted">{group.best.achievedOn}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* -------------------------------------------------------------- projekty */

function Projekty({ data, today }: { data: Data; today: string }) {
  return (
    <Card className="xl:col-span-2">
      <CardHeader
        title="Projekty"
        subtitle={data.projekty.length > 0 ? `${data.projekty.length} aktywnych` : undefined}
        icon={FolderKanban}
        action={
          <Link href="/projekty" className="text-muted hover:text-ink">
            Wszystkie
          </Link>
        }
      />
      {data.projekty.length === 0 ? (
        <EmptyState message="Nie masz aktywnych projektów." href="/ustawienia/projekty" />
      ) : (
        <ul className="flex flex-col gap-2">
          {data.projekty.map((project) => {
            const daysLeft = project.deadline ? diffDays(today, project.deadline) : null;
            return (
              <li key={project.id}>
                <p className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium text-ink">{project.name}</span>
                  {daysLeft !== null ? (
                    <span
                      className={cn(
                        "shrink-0 text-xs",
                        daysLeft < 0 ? "text-critical" : daysLeft <= 7 ? "text-warning" : "text-muted",
                      )}
                    >
                      {daysLeft < 0 ? `${Math.abs(daysLeft)} dni po terminie` : `${daysLeft} dni`}
                    </span>
                  ) : null}
                </p>
                {project.nextAction ? (
                  <p className="mt-0.5 truncate text-xs text-ink-2">→ {project.nextAction}</p>
                ) : (
                  <p className="mt-0.5 text-xs text-critical">Brak następnego kroku</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/* ------------------------------------------------------ tydzień w całości */

function Tydzien({
  days,
  today,
  currency,
}: {
  days: Awaited<ReturnType<typeof getCalendarRange>>;
  today: string;
  currency: string;
}) {
  return (
    <Card id="tydzien" className="md:col-span-2 xl:col-span-6">
      <CardHeader
        title="Ten tydzień"
        subtitle="Wszystkie kategorie naraz — plan w przód, realizacja wstecz."
        icon={CalendarDays}
        action={
          <Link href="/kalendarz" className="text-muted hover:text-ink">
            Pełny kalendarz
          </Link>
        }
      />
      <CategoryWeek days={days} today={today} currency={currency} />
      <WeekTotals days={days} currency={currency} />
    </Card>
  );
}

/* ---------------------------------------------------------------- mentor */

function Mentor({ data }: { data: Data }) {
  return (
    <Card className="md:col-span-2 xl:col-span-6">
      <CardHeader
        title="Mentor"
        subtitle="Obserwacje i konkretne działania na dziś"
        icon={Brain}
        action={
          <Link href="/mentor" className="text-muted hover:text-ink">
            Wszystkie
          </Link>
        }
      />
      {data.mentor.length === 0 ? (
        <EmptyState message="Brak rekomendacji. Wygeneruj je na podstawie zebranych danych." href="/mentor" cta="Przejdź do mentora" />
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {data.mentor.map((rec) => (
            <li key={rec.id} className="rounded-lg border border-edge p-3">
              <p className="text-xs font-medium tracking-wide text-muted uppercase">{rec.category}</p>
              <p className="mt-1.5 text-sm text-ink-2">{rec.observation}</p>
              <p className="mt-2 text-sm font-medium text-ink">→ {rec.action}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

import Link from "next/link";
import type { Metadata } from "next";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { AlertTriangle, CheckCircle2, ClipboardCheck, Droplets, HeartPulse, Scale, Smile, XCircle } from "lucide-react";

import { DayBars } from "@/components/charts/day-bars";
import { Meter, Sparkline } from "@/components/charts/sparkline";
import { CrisisBox, TestScore } from "@/components/health/mental-panels";
import { Card, CardHeader, EmptyState, StatTile, StatusPill } from "@/components/ui/card";
import { toggleDose } from "@/lib/actions/quick";
import { getUserSettings, requireOnboardedUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { dailyLogs, medicationLogs, medications } from "@/lib/db/schema";
import { addDays, formatDatePl, formatDateShortPl, lastNDays, todayInTz } from "@/lib/domain/dates";
import { WEIGHT_STATUS_LABEL, describeWeightProgress, weightPlanProgress } from "@/lib/domain/weight";
import { formatDose, medicationScheduleForDate, type MedicationRow } from "@/lib/domain/medication";
import { WATER_STATUS_LABEL, averageOfReportedDays, waterStatus } from "@/lib/domain/water";
import { getWellbeingSummary } from "@/lib/queries/mental";
import { formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Zdrowie" };
export const dynamic = "force-dynamic";

const RANGE = 30;
const TONE = { dobrze: "var(--good)", norma: "var(--warning)", zle: "var(--critical)" } as const;
const PILL = { dobrze: "good", norma: "warning", zle: "critical" } as const;
const ICON = { dobrze: CheckCircle2, norma: AlertTriangle, zle: XCircle } as const;

export default async function HealthPage() {
  const user = await requireOnboardedUser();
  const settings = await getUserSettings(user.id);
  const today = todayInTz(settings.timezone);
  const from = addDays(today, -(RANGE - 1));

  const [logs, medRows, medLogRows, wellbeing] = await Promise.all([
    db
      .select()
      .from(dailyLogs)
      .where(and(eq(dailyLogs.userId, user.id), gte(dailyLogs.date, from), lte(dailyLogs.date, today)))
      .orderBy(asc(dailyLogs.date)),
    db
      .select()
      .from(medications)
      .where(and(eq(medications.userId, user.id), eq(medications.active, true)))
      .orderBy(asc(medications.position)),
    db
      .select()
      .from(medicationLogs)
      .where(and(eq(medicationLogs.userId, user.id), gte(medicationLogs.date, from))),
    getWellbeingSummary(user.id, today),
  ]);

  const byDate = new Map(logs.map((log) => [log.date, log]));
  const days30 = lastNDays(today, RANGE);
  const days7 = lastNDays(today, 7);

  const todayDoses = medicationScheduleForDate(
    today,
    medRows as MedicationRow[],
    medLogRows.filter((entry) => entry.date === today),
  );

  const leki = todayDoses.filter((dose) => dose.kind === "lek");
  const suple = todayDoses.filter((dose) => dose.kind === "suplement");

  // Realizacja przyjmowania w ostatnim tygodniu.
  const adherence = days7.map((date) => {
    const schedule = medicationScheduleForDate(
      date,
      medRows as MedicationRow[],
      medLogRows.filter((entry) => entry.date === date),
    );
    return { date, planned: schedule.length, taken: schedule.filter((d) => d.taken).length };
  });
  const plannedWeek = adherence.reduce((sum, d) => sum + d.planned, 0);
  const takenWeek = adherence.reduce((sum, d) => sum + d.taken, 0);

  const waterValues = days7.map((date) => byDate.get(date)?.waterMl ?? null);
  const waterAvg = averageOfReportedDays(waterValues);
  const avgStatus = waterStatus(waterAvg, settings.waterGoalMl, settings.waterGoodPct, settings.waterOkPct);

  const weightSeries = days30.map((date) => byDate.get(date)?.weightKg ?? null);
  const weightReported = logs.filter((log) => log.weightKg !== null);
  const currentWeight = weightReported.at(-1)?.weightKg ?? null;

  const sleepAvg = averageOfReportedDays(days7.map((d) => byDate.get(d)?.sleepH ?? null));
  const energyAvg = averageOfReportedDays(days7.map((d) => byDate.get(d)?.energy ?? null));
  const moodAvg = averageOfReportedDays(days7.map((d) => byDate.get(d)?.mood ?? null));
  const stressAvg = averageOfReportedDays(days7.map((d) => byDate.get(d)?.stress ?? null));

  const weightPlan = weightPlanProgress({
    startKg: settings.weightStartKg,
    startDate: settings.weightStartDate,
    targetKg: settings.weightTargetKg,
    targetDate: settings.weightTargetDate,
    currentKg: currentWeight,
    currentDate: weightReported.at(-1)?.date ?? today,
  });

  // Wpisy o myślach i dobrych rzeczach — od najnowszego.
  const mentalEntries = logs
    .filter((log) => log.thoughts || log.goodThings)
    .slice(-10)
    .reverse();


  return (
    <div className="flex flex-col gap-3">
      {[
        { id: "leki", title: "Leki", doses: leki, empty: "Nie masz dodanych leków." },
        { id: "suplementy", title: "Suplementy", doses: suple, empty: "Nie masz dodanych suplementów." },
      ].map((section) => (
        <Card key={section.id} id={section.id}>
          <CardHeader
            title={`${section.title} na dziś`}
            subtitle={section.doses.length > 0 ? `Przyjęte ${section.doses.filter((d) => d.taken).length} z ${section.doses.length}` : undefined}
            icon={HeartPulse}
          />
          {section.doses.length === 0 ? (
            <EmptyState message={section.empty} href="/ustawienia/leki" />
          ) : (
            <ul className="flex flex-col gap-1">
              {section.doses.map((dose) => (
                <li key={`${dose.medicationId}-${dose.slot}`}>
                  <form action={toggleDose}>
                    <input type="hidden" name="medicationId" value={dose.medicationId} />
                    <input type="hidden" name="slot" value={dose.slot} />
                    <input type="hidden" name="date" value={today} />
                    <input type="hidden" name="taken" value={dose.taken ? "0" : "1"} />
                    <button
                      type="submit"
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-surface-2"
                    >
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          dose.taken ? "border-good bg-good text-white" : "border-edge"
                        }`}
                        aria-hidden
                      >
                        {dose.taken ? <CheckCircle2 className="h-3 w-3" /> : null}
                      </span>
                      <span className={`flex-1 text-sm ${dose.taken ? "text-muted line-through" : "text-ink"}`}>
                        {dose.name}
                      </span>
                      <span className="text-xs text-muted">{dose.slot}</span>
                      <span className="w-24 text-right text-xs text-muted">{formatDose(dose)}</span>
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}

          {section.id === "leki" && plannedWeek > 0 ? (
            <div className="mt-4 border-t border-line pt-3">
              <p className="mb-1.5 text-xs text-muted">
                Realizacja z ostatnich 7 dni: {takenWeek} z {plannedWeek} dawek
              </p>
              <Meter value={takenWeek} max={plannedWeek} tone="var(--good)" label="Realizacja przyjmowania" />
            </div>
          ) : null}
        </Card>
      ))}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card id="nawodnienie">
          <CardHeader title="Nawodnienie" subtitle="Ostatnie 7 dni" icon={Droplets} />
          {!settings.waterGoalMl ? (
            <EmptyState message="Nie masz ustawionego celu picia wody." href="/ustawienia/cele" />
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs text-muted">Średnia tygodniowa</p>
                  <p className="tabular mt-0.5 text-xl font-semibold text-ink">
                    {waterAvg === null ? "—" : `${formatNumber(Math.round(waterAvg))} ml`}
                  </p>
                </div>
                {avgStatus ? (
                  <StatusPill tone={PILL[avgStatus]} icon={ICON[avgStatus]}>
                    {WATER_STATUS_LABEL[avgStatus]}
                  </StatusPill>
                ) : null}
              </div>

              <DayBars
                bars={days7.map((date, index) => {
                  const value = waterValues[index];
                  const status = waterStatus(
                    value,
                    settings.waterGoalMl,
                    settings.waterGoodPct,
                    settings.waterOkPct,
                  );
                  return {
                    date,
                    value,
                    label: formatDateShortPl(date),
                    tone: status ? TONE[status] : undefined,
                  };
                })}
                today={today}
                goal={settings.waterGoalMl}
                unit="ml"
              />

              <p className="mt-2 text-xs text-muted">
                Cel: {formatNumber(settings.waterGoalMl)} ml. Progi: dobrze ≥ {settings.waterGoodPct}%, w normie ≥{" "}
                {settings.waterOkPct}%.
              </p>
            </>
          )}
        </Card>

        <Card id="waga">
          <CardHeader title="Waga" subtitle={`Ostatnie ${RANGE} dni`} icon={Scale} />
          {currentWeight === null ? (
            <EmptyState message="Brak pomiarów wagi." href="/raport" cta="Wypełnij raport" />
          ) : (
            <>
              <StatTile
                label="Ostatni pomiar"
                value={formatNumber(currentWeight, 1)}
                unit="kg"
                footer={
                  settings.weightTargetKg
                    ? `Cel: ${formatNumber(settings.weightTargetKg, 1)} kg · do celu ${formatNumber(
                        Math.abs(currentWeight - settings.weightTargetKg),
                        1,
                      )} kg`
                    : "Nie masz ustawionej wagi docelowej."
                }
              >
                <div className="mt-2">
                  <Sparkline values={weightSeries} height={56} label="Waga" />
                </div>
              </StatTile>

              {weightPlan ? (
                <div className="mt-3 border-t border-line pt-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-xs text-muted">Plan wagowy</p>
                    <StatusPill
                      tone={weightPlan.status === "za" ? "warning" : "good"}
                      icon={weightPlan.status === "za" ? AlertTriangle : CheckCircle2}
                    >
                      {WEIGHT_STATUS_LABEL[weightPlan.status]}
                    </StatusPill>
                  </div>
                  <div className="mt-2">
                    <Meter
                      value={Math.min(Math.max(weightPlan.progressPct, 0), 100)}
                      max={100}
                      tone={weightPlan.status === "za" ? "var(--warning)" : "var(--good)"}
                      label="Postęp planu wagowego"
                    />
                  </div>
                  <p className="mt-2 text-xs text-ink-2">{describeWeightProgress(weightPlan)}</p>
                  <p className="mt-1 text-xs text-muted">
                    Z {formatNumber(weightPlan.startKg, 1)} kg do {formatNumber(weightPlan.targetKg, 1)} kg ·{" "}
                    {weightPlan.daysLeft >= 0 ? `${weightPlan.daysLeft} dni do terminu` : "termin minął"} · tempo{" "}
                    {formatNumber(weightPlan.actualPacePerWeek ?? 0, 2)} kg/tydz. przy planowanych{" "}
                    {formatNumber(weightPlan.plannedPacePerWeek, 2)}
                  </p>
                </div>
              ) : settings.weightTargetKg !== null ? (
                <p className="mt-3 border-t border-line pt-3 text-xs text-muted">
                  Dodaj termin celu w{" "}
                  <Link href="/ustawienia/cele" className="text-series-1 hover:underline">
                    celach i normach
                  </Link>
                  , żeby zobaczyć, czy tempo jest zgodne z planem.
                </p>
              ) : null}
            </>
          )}
        </Card>
      </div>

      <Card id="testy">
        <CardHeader
          title="Zdrowie psychiczne — ocena z testów"
          subtitle="Wynik z kwestionariuszy przesiewowych — porównywalny w czasie, w odróżnieniu od codziennej oceny 1–5."
          icon={ClipboardCheck}
        />

        {wellbeing.riskFlag ? (
          <div className="mb-3">
            <CrisisBox urgent />
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {wellbeing.states.map((state) => (
            <Link
              key={state.testId}
              href={`/zdrowie/test/${state.testId}`}
              className="rounded-lg border border-edge p-3 hover:bg-surface-2"
            >
              <TestScore state={state} compact />
            </Link>
          ))}
        </div>

        {wellbeing.dueTests.length > 0 ? (
          <p className="mt-3 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-ink">
            Czeka na wypełnienie: {wellbeing.dueTests.join(", ")}.
          </p>
        ) : null}

        <p className="mt-3 text-xs text-muted">
          WHO-5 powtarzaj co tydzień, GAD-7 i PHQ-9 co miesiąc. Żaden wynik nie jest diagnozą — to wskaźnik do
          obserwacji i rozmowy ze specjalistą.
        </p>
      </Card>

      <Card id="psychika">
        <CardHeader
          title="Puls dnia"
          subtitle="Samopoczucie, energia i stres z ostatnich 7 dni oraz Twoje wpisy."
          icon={Smile}
        />

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatTile label="Samopoczucie" value={moodAvg === null ? "—" : formatNumber(moodAvg, 1)} unit={moodAvg === null ? undefined : "/ 5"} />
          <StatTile label="Energia" value={energyAvg === null ? "—" : formatNumber(energyAvg, 1)} unit={energyAvg === null ? undefined : "/ 5"} />
          <StatTile label="Stres" value={stressAvg === null ? "—" : formatNumber(stressAvg, 1)} unit={stressAvg === null ? undefined : "/ 5"} />
          <StatTile label="Sen" value={sleepAvg === null ? "—" : formatNumber(sleepAvg, 1)} unit={sleepAvg === null ? undefined : "h"} />
        </div>

        {mentalEntries.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              message="Nie masz jeszcze wpisów o myślach ani o tym, co dobrego się wydarzyło."
              href="/raport"
              cta="Wypełnij raport"
            />
          </div>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {mentalEntries.map((entry) => (
              <li key={entry.date} className="rounded-lg border border-edge p-3">
                <p className="text-xs font-medium tracking-wide text-muted uppercase">{formatDatePl(entry.date)}</p>
                {entry.goodThings ? (
                  <p className="mt-1.5 text-sm text-ink">
                    <span className="text-good">Dobrego:</span> {entry.goodThings}
                  </p>
                ) : null}
                {entry.thoughts ? <p className="mt-1 text-sm text-ink-2">{entry.thoughts}</p> : null}
                <p className="mt-1.5 text-xs text-muted">
                  {[
                    entry.mood !== null ? `samopoczucie ${entry.mood}/5` : null,
                    entry.energy !== null ? `energia ${entry.energy}/5` : null,
                    entry.stress !== null ? `stres ${entry.stress}/5` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4">
          <CrisisBox />
        </div>
      </Card>

    </div>
  );
}

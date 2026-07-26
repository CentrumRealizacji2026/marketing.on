import type { Metadata } from "next";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { AlertTriangle, CheckCircle2, Droplets, HeartPulse, Moon, Scale, XCircle } from "lucide-react";

import { Meter, Sparkline } from "@/components/charts/sparkline";
import { Card, CardHeader, EmptyState, StatTile, StatusPill } from "@/components/ui/card";
import { toggleDose } from "@/lib/actions/quick";
import { getUserSettings, requireOnboardedUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { dailyLogs, medicationLogs, medications } from "@/lib/db/schema";
import { addDays, formatDateShortPl, lastNDays, todayInTz } from "@/lib/domain/dates";
import { formatDose, medicationScheduleForDate, type MedicationRow } from "@/lib/domain/medication";
import { WATER_STATUS_LABEL, averageOfReportedDays, waterStatus } from "@/lib/domain/water";
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

  const [logs, medRows, medLogRows] = await Promise.all([
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

  const maxWater = Math.max(...waterValues.map((v) => v ?? 0), settings.waterGoalMl ?? 0, 1);

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

              <div className="flex items-end gap-2" style={{ height: 96 }}>
                {days7.map((date, index) => {
                  const value = waterValues[index];
                  const status = waterStatus(value, settings.waterGoalMl, settings.waterGoodPct, settings.waterOkPct);
                  const height = value === null ? 2 : Math.max((value / maxWater) * 100, 6);
                  return (
                    <div key={date} className="flex flex-1 flex-col items-center gap-1">
                      <div
                        className="w-full max-w-8 rounded-t-[4px]"
                        style={{
                          height: `${height}%`,
                          background: status ? TONE[status] : "var(--line)",
                        }}
                        title={`${date}: ${value ?? "brak wpisu"}`}
                      />
                      <span className="text-[10px] text-muted">{formatDateShortPl(date)}</span>
                    </div>
                  );
                })}
              </div>
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
            <StatTile
              label="Ostatni pomiar"
              value={formatNumber(currentWeight, 1)}
              unit="kg"
              footer={
                settings.weightTargetKg
                  ? `Cel: ${formatNumber(settings.weightTargetKg, 1)} kg · różnica ${formatNumber(
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
          )}
        </Card>
      </div>

      <Card id="sen">
        <CardHeader title="Sen i energia" subtitle="Średnie z ostatnich 7 dni" icon={Moon} />
        <div className="grid grid-cols-3 gap-4">
          <StatTile label="Sen" value={sleepAvg === null ? "—" : formatNumber(sleepAvg, 1)} unit={sleepAvg === null ? undefined : "h"} />
          <StatTile label="Energia" value={energyAvg === null ? "—" : formatNumber(energyAvg, 1)} unit={energyAvg === null ? undefined : "/ 5"} />
          <StatTile label="Nastrój" value={moodAvg === null ? "—" : formatNumber(moodAvg, 1)} unit={moodAvg === null ? undefined : "/ 5"} />
        </div>
      </Card>
    </div>
  );
}

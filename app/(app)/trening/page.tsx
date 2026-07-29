import type { Metadata } from "next";
import { and, asc, desc, eq, gte } from "drizzle-orm";
import { Dumbbell, Trophy } from "lucide-react";

import { HabitHeatmap, StreakBadge } from "@/components/charts/habit-heatmap";
import { Card, CardHeader, EmptyState } from "@/components/ui/card";
import { toggleTraining } from "@/lib/actions/quick";
import { getUserSettings, requireOnboardedUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { personalRecords, trainingLogs, trainingPlans } from "@/lib/db/schema";
import { WEEKDAYS, addDays, formatDateShortPl, isoWeekday, startOfWeek, todayInTz } from "@/lib/domain/dates";
import { currentStreak, trainingDayStatus, type HabitDay } from "@/lib/domain/habits";
import { currentRecords, formatRecordValue } from "@/lib/domain/records";
import { formatNumber, formatTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Trening" };
export const dynamic = "force-dynamic";

export default async function TrainingPage() {
  const user = await requireOnboardedUser();
  const settings = await getUserSettings(user.id);
  const today = todayInTz(settings.timezone);
  const weekday = isoWeekday(today);

  // Dziennik pokazuje 30 dni, ale heatmapa serii sięga 8 pełnych tygodni.
  const heatStart = startOfWeek(addDays(today, -55), settings.weekStartsOn);

  const [plans, logs, records] = await Promise.all([
    db
      .select()
      .from(trainingPlans)
      .where(and(eq(trainingPlans.userId, user.id), eq(trainingPlans.active, true)))
      .orderBy(asc(trainingPlans.weekday), asc(trainingPlans.position)),
    db
      .select()
      .from(trainingLogs)
      .where(and(eq(trainingLogs.userId, user.id), gte(trainingLogs.date, heatStart)))
      .orderBy(desc(trainingLogs.date)),
    db.select().from(personalRecords).where(eq(personalRecords.userId, user.id)),
  ]);

  const groups = currentRecords(records);

  // Data każdego dnia tygodnia w BIEŻĄCYM tygodniu — dni do dziś włącznie da się
  // odhaczyć wstecz (zapomniany poniedziałek nie przepada), przyszłych nie.
  const weekStart = startOfWeek(today, settings.weekStartsOn);
  const datyTygodnia = new Map(
    Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)).map((date) => [isoWeekday(date), date]),
  );

  // Seria treningowa: dzień liczy się względem planu na ten dzień tygodnia.
  const treningDni: HabitDay[] = [];
  for (let date = heatStart; date <= today; date = addDays(date, 1)) {
    const planned = plans.filter((plan) => plan.weekday === isoWeekday(date)).length;
    const done = logs.filter((log) => log.date === date && log.done).length;
    treningDni.push({ date, status: trainingDayStatus(planned, done) });
  }
  const seria = currentStreak(treningDni, today);

  return (
    <div className="flex flex-col gap-3">
      <Card id="plan">
        <CardHeader title="Plan tygodnia" subtitle="Zmienisz go w panelu zarządzania." icon={Dumbbell} />
        {plans.length === 0 ? (
          <EmptyState message="Nie masz jeszcze planu treningowego." href="/ustawienia/trening" />
        ) : (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
            {WEEKDAYS.map((day) => {
              const dayPlans = plans.filter((plan) => plan.weekday === day.value);
              const isToday = day.value === weekday;
              const dayDate = datyTygodnia.get(day.value)!;
              const editable = dayDate <= today;
              return (
                <div
                  key={day.value}
                  className={`rounded-lg border p-3 ${isToday ? "border-series-1 bg-series-1/5" : "border-edge"}`}
                >
                  <p className="mb-1.5 text-xs font-semibold tracking-wide text-muted uppercase">
                    {day.label}
                    {isToday ? " · dziś" : ` · ${formatDateShortPl(dayDate)}`}
                  </p>
                  {dayPlans.length === 0 ? (
                    <p className="text-xs text-muted">wolne</p>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {dayPlans.map((plan) => {
                        const log = editable
                          ? logs.find((entry) => entry.date === dayDate && entry.planId === plan.id)
                          : null;
                        return (
                          <li key={plan.id}>
                            <p className="text-sm text-ink">{plan.title || plan.discipline}</p>
                            <p className="text-xs text-muted">
                              {plan.discipline}
                              {plan.startTime ? ` · ${formatTime(plan.startTime)}` : ""}
                              {plan.durationMin ? ` · ${plan.durationMin} min` : ""}
                            </p>
                            {editable ? (
                              <form action={toggleTraining} className="mt-1.5">
                                <input type="hidden" name="planId" value={plan.id} />
                                <input type="hidden" name="date" value={dayDate} />
                                <input type="hidden" name="done" value={log?.done ? "0" : "1"} />
                                <button
                                  type="submit"
                                  className={`rounded-lg border px-2 py-0.5 text-xs font-medium ${
                                    log?.done
                                      ? "border-good bg-good/10 text-ink"
                                      : "border-edge text-ink-2 hover:bg-surface-2"
                                  }`}
                                >
                                  {log?.done ? "Odbyty" : "Odhacz"}
                                </button>
                              </form>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card id="serie">
        <CardHeader
          title="Seria treningowa"
          subtitle="Ostatnie 8 tygodni — dni bez planu nie przerywają serii"
          icon={Dumbbell}
          action={<StreakBadge length={seria.length} label="Trening" />}
        />
        <HabitHeatmap
          days={treningDni}
          weekStartsOn={settings.weekStartsOn}
          label="Regularność treningów, 8 tygodni"
          tone="var(--series-2)"
        />
      </Card>

      <Card id="rekordy">
        <CardHeader
          title="Rekordy"
          subtitle="Aktualny rekord to najlepszy wynik w danej dyscyplinie i metryce."
          icon={Trophy}
          action={
            <a href="/ustawienia/rekordy" className="text-muted hover:text-ink">
              Edytuj
            </a>
          }
        />
        {groups.length === 0 ? (
          <EmptyState message="Nie masz jeszcze zapisanych rekordów." href="/ustawienia/rekordy" />
        ) : (
          <ul className="flex flex-col gap-3">
            {groups.map((group) => (
              <li key={`${group.discipline}-${group.metric}`} className="rounded-lg border border-edge p-3">
                <div className="flex items-baseline justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-ink">{group.discipline}</p>
                    <p className="text-xs text-muted">
                      {group.metric} · {group.higherIsBetter ? "więcej = lepiej" : "mniej = lepiej"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="tabular text-lg font-semibold text-ink">
                      {formatRecordValue({ unit: group.unit, value: group.best.value })}
                    </p>
                    <p className="text-xs text-muted">{group.best.achievedOn}</p>
                  </div>
                </div>
                {group.previousBest ? (
                  <p className="mt-1.5 text-xs text-muted">
                    Poprzedni najlepszy: {formatRecordValue({ unit: group.unit, value: group.previousBest.value })} (
                    {group.previousBest.achievedOn})
                  </p>
                ) : null}
                {group.history.length > 1 ? (
                  <p className="mt-1 text-xs text-muted">Wyników w historii: {group.history.length}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card id="dziennik">
        <CardHeader title="Dziennik" subtitle="Ostatnie 30 dni" />
        {logs.length === 0 ? (
          <EmptyState message="Brak odbytych treningów w tym okresie." href="/raport" cta="Zapisz w raporcie" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th className="pb-2 font-medium">Data</th>
                  <th className="pb-2 font-medium">Dyscyplina</th>
                  <th className="pb-2 text-right font-medium">Czas</th>
                  <th className="pb-2 text-right font-medium">Dystans</th>
                  <th className="pb-2 text-right font-medium">Wysiłek</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-line last:border-0">
                    <td className="py-2 text-muted">{log.date}</td>
                    <td className="py-2 text-ink">{log.title || log.discipline}</td>
                    <td className="tabular py-2 text-right text-ink-2">
                      {log.durationMin ? `${log.durationMin} min` : "—"}
                    </td>
                    <td className="tabular py-2 text-right text-ink-2">
                      {log.distanceKm ? `${formatNumber(log.distanceKm, 2)} km` : "—"}
                    </td>
                    <td className="tabular py-2 text-right text-ink-2">{log.rpe ? `${log.rpe}/10` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

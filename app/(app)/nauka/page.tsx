import type { Metadata } from "next";
import { and, asc, desc, eq, gte } from "drizzle-orm";
import { BookOpen, GraduationCap } from "lucide-react";

import { Meter } from "@/components/charts/sparkline";
import { Card, CardHeader, EmptyState } from "@/components/ui/card";
import { LearningBlockStatus } from "@/components/learning/block-status";
import { getUserSettings, requireOnboardedUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { learningLogs, learningPlanWeek, learningPlanYear, materials } from "@/lib/db/schema";
import { WEEKDAYS, addDays, formatDatePl, isoWeekday, todayInTz } from "@/lib/domain/dates";
import { learningBlocksForDate } from "@/lib/domain/learning";
import { formatTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Nauka" };
export const dynamic = "force-dynamic";

export default async function LearningPage() {
  const user = await requireOnboardedUser();
  const settings = await getUserSettings(user.id);
  const today = todayInTz(settings.timezone);
  const from = addDays(today, -30);
  const weekday = isoWeekday(today);

  const [weekPlans, yearPlans, logs, materialRows] = await Promise.all([
    db
      .select()
      .from(learningPlanWeek)
      .where(and(eq(learningPlanWeek.userId, user.id), eq(learningPlanWeek.active, true)))
      .orderBy(asc(learningPlanWeek.weekday), asc(learningPlanWeek.position)),
    db
      .select()
      .from(learningPlanYear)
      .where(eq(learningPlanYear.userId, user.id))
      .orderBy(asc(learningPlanYear.periodStart)),
    db
      .select()
      .from(learningLogs)
      .where(and(eq(learningLogs.userId, user.id), gte(learningLogs.date, from)))
      .orderBy(desc(learningLogs.date)),
    db.select().from(materials).where(eq(materials.userId, user.id)).orderBy(asc(materials.position)),
  ]);

  const todayBlocks = learningBlocksForDate(today, weekPlans, yearPlans);
  const todayLogs = logs.filter((log) => log.date === today);

  const minutesBySkill = new Map<string, number>();
  for (const log of logs) {
    if (!log.done) continue;
    minutesBySkill.set(log.skill, (minutesBySkill.get(log.skill) ?? 0) + (log.minutes ?? 0));
  }
  const maxMinutes = Math.max(...minutesBySkill.values(), 1);

  const activePeriods = yearPlans.filter((p) => p.periodStart <= today && today <= p.periodEnd);

  return (
    <div className="flex flex-col gap-3">
      <Card id="dzis">
        <CardHeader title="Blok dnia" subtitle={formatDatePl(today)} icon={GraduationCap} />
        {todayBlocks.length === 0 ? (
          <EmptyState
            message={weekPlans.length > 0 ? "Dziś nie masz zaplanowanego bloku nauki." : "Nie masz jeszcze planu nauki."}
            href={weekPlans.length > 0 ? undefined : "/ustawienia/nauka"}
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {todayBlocks.map((block) => {
              const log = todayLogs.find((entry) => entry.planId === block.planId);
              return (
                <li key={block.planId} className="rounded-lg border border-edge p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-[11rem] flex-1">
                      <p className="flex items-baseline gap-2">
                        {block.startTime ? (
                          <span className="tabular text-xl font-semibold text-ink">{formatTime(block.startTime)}</span>
                        ) : null}
                        <span className="text-sm font-medium text-ink">{block.skill}</span>
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {block.durationMin ? `${block.durationMin} min` : "czas nieokreślony"}
                      </p>
                      {block.focus ? (
                        <p className="mt-1.5 text-sm text-ink-2">
                          Zakres: <span className="text-ink">{block.focus}</span>
                        </p>
                      ) : null}
                      {block.target ? <p className="mt-0.5 text-xs text-muted">Cel: {block.target}</p> : null}
                    </div>
                    <LearningBlockStatus planId={block.planId} date={today} done={log ? log.done : null} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card id="tydzien">
        <CardHeader title="Plan tygodnia" subtitle="Dzień bez wpisu jest wolny." />
        {weekPlans.length === 0 ? (
          <EmptyState message="Nie masz jeszcze bloków nauki." href="/ustawienia/nauka" />
        ) : (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
            {WEEKDAYS.map((day) => {
              const dayPlans = weekPlans.filter((plan) => plan.weekday === day.value);
              const isToday = day.value === weekday;
              return (
                <div
                  key={day.value}
                  className={`rounded-lg border p-3 ${isToday ? "border-series-1 bg-series-1/5" : "border-edge"}`}
                >
                  <p className="mb-1.5 text-xs font-semibold tracking-wide text-muted uppercase">
                    {day.label}
                    {isToday ? " · dziś" : ""}
                  </p>
                  {dayPlans.length === 0 ? (
                    <p className="text-xs text-muted">wolne</p>
                  ) : (
                    <ul className="flex flex-col gap-1.5">
                      {dayPlans.map((plan) => (
                        <li key={plan.id}>
                          <p className="text-sm text-ink">{plan.skill}</p>
                          <p className="text-xs text-muted">
                            {plan.startTime ? formatTime(plan.startTime) : "bez godziny"}
                            {plan.durationMin ? ` · ${plan.durationMin} min` : ""}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card id="rok">
        <CardHeader
          title="Plan roczny"
          subtitle="Okresy zawężają temat bloków tygodniowych."
          action={
            activePeriods.length > 0 ? <span className="text-muted">{activePeriods.length} aktywnych</span> : null
          }
        />
        {yearPlans.length === 0 ? (
          <EmptyState message="Nie masz okresów w planie rocznym. Bloki tygodniowe działają i bez nich." href="/ustawienia/nauka" />
        ) : (
          <ul className="flex flex-col gap-2">
            {yearPlans.map((period) => {
              const active = period.periodStart <= today && today <= period.periodEnd;
              return (
                <li
                  key={period.id}
                  className={`rounded-lg border p-3 ${active ? "border-series-1 bg-series-1/5" : "border-edge"}`}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-medium text-ink">{period.skill}</p>
                    <p className="text-xs text-muted">
                      {period.periodStart} – {period.periodEnd}
                      {active ? " · trwa" : ""}
                    </p>
                  </div>
                  {period.focus ? <p className="mt-1 text-sm text-ink-2">{period.focus}</p> : null}
                  {period.target ? <p className="mt-0.5 text-xs text-muted">Cel: {period.target}</p> : null}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader title="Czas nauki" subtitle="Minuty wg dziedziny, ostatnie 30 dni" />
        {minutesBySkill.size === 0 ? (
          <p className="text-xs text-muted">Brak zrealizowanych bloków w tym okresie.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {[...minutesBySkill.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([skill, minutes]) => (
                <div key={skill}>
                  <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                    <span className="text-ink-2">{skill}</span>
                    <span className="tabular font-medium text-ink">{minutes} min</span>
                  </div>
                  <Meter value={minutes} max={maxMinutes} label={`${skill}: ${minutes} minut`} />
                </div>
              ))}
          </div>
        )}
      </Card>

      <Card id="materialy">
        <CardHeader
          title="Materiały"
          subtitle="Szkolenia, kursy i książki przypisane do dziedzin."
          icon={BookOpen}
          action={
            <a href="/ustawienia/materialy" className="text-muted hover:text-ink">
              Edytuj
            </a>
          }
        />
        {materialRows.length === 0 ? (
          <EmptyState message="Nie masz jeszcze materiałów. Dodasz je w dowolnym momencie." href="/ustawienia/materialy" />
        ) : (
          <ul className="flex flex-col gap-2">
            {materialRows.map((material) => (
              <li key={material.id} className="rounded-lg border border-edge p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-ink">
                    {material.url ? (
                      <a href={material.url} target="_blank" rel="noreferrer" className="hover:underline">
                        {material.title}
                      </a>
                    ) : (
                      material.title
                    )}
                  </p>
                  <p className="text-xs text-muted">
                    {material.skill} · {material.type}
                  </p>
                </div>
                <div className="mt-2">
                  <Meter value={material.progressPct} max={100} label={`${material.title}: ${material.progressPct}%`} />
                  <p className="mt-1 text-xs text-muted">{material.progressPct}% ukończone</p>
                </div>
                {material.note ? <p className="mt-1.5 text-xs text-ink-2">{material.note}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

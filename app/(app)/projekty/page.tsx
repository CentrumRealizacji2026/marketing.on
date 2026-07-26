import type { Metadata } from "next";
import { and, asc, desc, eq, gte } from "drizzle-orm";
import { FolderKanban } from "lucide-react";

import { Meter } from "@/components/charts/sparkline";
import { Card, CardHeader, EmptyState, StatusPill } from "@/components/ui/card";
import { requireOnboardedUser, getUserSettings } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { projectMilestones, projects, tasks } from "@/lib/db/schema";
import { addDays, diffDays, todayInTz } from "@/lib/domain/dates";
import { pluralPl } from "@/lib/utils";

export const metadata: Metadata = { title: "Projekty" };
export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const user = await requireOnboardedUser();
  const settings = await getUserSettings(user.id);
  const today = todayInTz(settings.timezone);

  const [projectRows, milestones, recentTasks] = await Promise.all([
    db.select().from(projects).where(eq(projects.userId, user.id)).orderBy(asc(projects.position)),
    db
      .select()
      .from(projectMilestones)
      .where(eq(projectMilestones.userId, user.id))
      .orderBy(asc(projectMilestones.position)),
    db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, user.id), gte(tasks.date, addDays(today, -30))))
      .orderBy(desc(tasks.date)),
  ]);

  const active = projectRows.filter((p) => p.status === "aktywny");
  const paused = projectRows.filter((p) => p.status === "wstrzymany");
  const done = projectRows.filter((p) => p.status === "zakonczony");

  function projectStats(projectId: string) {
    const own = recentTasks.filter((task) => task.projectId === projectId);
    return { total: own.length, done: own.filter((task) => task.done).length };
  }

  function deadlineTone(deadline: string | null) {
    if (!deadline) return null;
    const days = diffDays(today, deadline);
    if (days < 0) return { tone: "critical" as const, label: `${Math.abs(days)} dni po terminie` };
    if (days <= 7) return { tone: "warning" as const, label: `${days} dni do terminu` };
    return { tone: "neutral" as const, label: `${days} dni do terminu` };
  }

  return (
    <div className="flex flex-col gap-3">
      <Card id="aktywne">
        <CardHeader
          title="Aktywne projekty"
          subtitle="Pole „następny krok” jest tym, o co pyta mentor w trybie kierownika projektów."
          icon={FolderKanban}
          action={
            <a href="/ustawienia/projekty" className="text-muted hover:text-ink">
              Edytuj
            </a>
          }
        />
        {active.length === 0 ? (
          <EmptyState message="Nie masz aktywnych projektów." href="/ustawienia/projekty" />
        ) : (
          <ul className="flex flex-col gap-3">
            {active.map((project) => {
              const stats = projectStats(project.id);
              const deadline = deadlineTone(project.deadline);
              const own = milestones.filter((m) => m.projectId === project.id);
              const doneMilestones = own.filter((m) => m.done).length;

              return (
                <li key={project.id} className="rounded-lg border border-edge p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">{project.name}</p>
                      {project.goal ? <p className="mt-0.5 text-xs text-muted">{project.goal}</p> : null}
                    </div>
                    {deadline ? <StatusPill tone={deadline.tone}>{deadline.label}</StatusPill> : null}
                  </div>

                  {project.nextAction ? (
                    <p className="mt-2 text-sm text-ink">→ {project.nextAction}</p>
                  ) : (
                    <p className="mt-2 text-sm text-critical">Brak zdefiniowanego następnego kroku.</p>
                  )}

                  {own.length > 0 ? (
                    <div className="mt-3">
                      <div className="mb-1 flex items-baseline justify-between text-xs">
                        <span className="text-muted">Kamienie milowe</span>
                        <span className="tabular text-ink">
                          {doneMilestones}/{own.length}
                        </span>
                      </div>
                      <Meter value={doneMilestones} max={own.length} tone="var(--good)" label="Kamienie milowe" />
                    </div>
                  ) : null}

                  {stats.total > 0 ? (
                    <p className="mt-2 text-xs text-muted">
                      Zadania z 30 dni: {stats.done} z {stats.total} domkniętych
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card id="kamienie">
        <CardHeader title="Kamienie milowe" subtitle="Wszystkie projekty" />
        {milestones.length === 0 ? (
          <p className="text-xs text-muted">
            Nie masz jeszcze kamieni milowych. Dodasz je przy projektach w panelu zarządzania.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {milestones.map((milestone) => {
              const project = projectRows.find((p) => p.id === milestone.projectId);
              return (
                <li key={milestone.id} className="flex items-center justify-between gap-3 border-b border-line py-2 text-sm last:border-0">
                  <div className="min-w-0">
                    <p className={`truncate ${milestone.done ? "text-muted line-through" : "text-ink"}`}>
                      {milestone.title}
                    </p>
                    <p className="text-xs text-muted">{project?.name ?? "—"}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted">{milestone.dueDate ?? "bez terminu"}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card id="backlog">
        <CardHeader
          title="Backlog"
          subtitle={`${paused.length} wstrzymanych · ${done.length} ${pluralPl(done.length, "zakończony", "zakończone", "zakończonych")}`}
        />
        {paused.length === 0 && done.length === 0 ? (
          <p className="text-xs text-muted">Nic tu nie leży.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {[...paused, ...done].map((project) => (
              <li key={project.id} className="flex items-center justify-between gap-3 border-b border-line py-2 text-sm last:border-0">
                <span className={project.status === "zakonczony" ? "text-muted line-through" : "text-ink-2"}>
                  {project.name}
                </span>
                <span className="shrink-0 text-xs text-muted">{project.status}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

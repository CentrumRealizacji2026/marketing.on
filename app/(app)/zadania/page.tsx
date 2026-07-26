import type { Metadata } from "next";
import { and, asc, desc, eq, gte, lt } from "drizzle-orm";
import { CheckCircle2, ListTodo } from "lucide-react";

import { Meter } from "@/components/charts/sparkline";
import { Card, CardHeader, EmptyState } from "@/components/ui/card";
import { toggleTask } from "@/lib/actions/quick";
import { getUserSettings, requireOnboardedUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { addDays, formatFullDatePl, todayInTz } from "@/lib/domain/dates";
import { pluralPl } from "@/lib/utils";

export const metadata: Metadata = { title: "Zadania" };
export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const user = await requireOnboardedUser();
  const settings = await getUserSettings(user.id);
  const today = todayInTz(settings.timezone);
  const from = addDays(today, -30);

  const [todayRows, overdue, history] = await Promise.all([
    db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, user.id), eq(tasks.date, today)))
      .orderBy(asc(tasks.kind), asc(tasks.position)),
    db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, user.id), lt(tasks.date, today), gte(tasks.date, from), eq(tasks.done, false)))
      .orderBy(desc(tasks.date)),
    db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, user.id), lt(tasks.date, today), gte(tasks.date, from), eq(tasks.done, true)))
      .orderBy(desc(tasks.date))
      .limit(60),
  ]);

  const priorities = todayRows.filter((task) => task.kind === "priorytet");
  const side = todayRows.filter((task) => task.kind === "side");
  const donePriorities = priorities.filter((task) => task.done).length;

  const byDay = new Map<string, typeof history>();
  for (const task of history) {
    const list = byDay.get(task.date);
    if (list) list.push(task);
    else byDay.set(task.date, [task]);
  }

  return (
    <div className="flex flex-col gap-3">
      <Card id="priorytety">
        <CardHeader
          title="3 priorytety na dziś"
          subtitle={formatFullDatePl(today)}
          icon={ListTodo}
          action={priorities.length > 0 ? <span className="text-muted">{donePriorities}/{priorities.length}</span> : null}
        />
        {priorities.length === 0 ? (
          <EmptyState message="Nie masz jeszcze priorytetów na dziś." href="/raport" cta="Ustaw w raporcie" />
        ) : (
          <>
            <Meter value={donePriorities} max={priorities.length} tone="var(--good)" label="Domknięte priorytety" />
            <ul className="mt-3 flex flex-col gap-1.5">
              {priorities.map((task, index) => (
                <li key={task.id}>
                  <form action={toggleTask}>
                    <input type="hidden" name="taskId" value={task.id} />
                    <button
                      type="submit"
                      className="flex w-full items-start gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-surface-2"
                    >
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-xs font-semibold ${
                          task.done ? "border-good bg-good text-white" : "border-edge text-muted"
                        }`}
                      >
                        {task.done ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                      </span>
                      <span className={`flex-1 text-sm ${task.done ? "text-muted line-through" : "text-ink"}`}>
                        {task.title}
                      </span>
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <Card id="side">
        <CardHeader title="Side questy" subtitle="Zadania poboczne na dziś" />
        {side.length === 0 ? (
          <EmptyState message="Brak side questów na dziś." href="/raport" cta="Dodaj w raporcie" />
        ) : (
          <ul className="flex flex-col gap-0.5">
            {side.map((task) => (
              <li key={task.id}>
                <form action={toggleTask}>
                  <input type="hidden" name="taskId" value={task.id} />
                  <button
                    type="submit"
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-surface-2"
                  >
                    <span
                      className={`h-4 w-4 shrink-0 rounded border ${task.done ? "border-good bg-good" : "border-edge"}`}
                      aria-hidden
                    />
                    <span className={`flex-1 text-sm ${task.done ? "text-muted line-through" : "text-ink-2"}`}>
                      {task.title}
                    </span>
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card id="zalegle">
        <CardHeader
          title="Zaległe"
          subtitle="Niedokończone z ostatnich 30 dni"
          action={
            overdue.length > 0 ? (
              <span className="text-muted">
                {overdue.length} {pluralPl(overdue.length, "zadanie", "zadania", "zadań")}
              </span>
            ) : null
          }
        />
        {overdue.length === 0 ? (
          <p className="text-xs text-muted">Nic nie zostało z tyłu.</p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {overdue.map((task) => (
              <li key={task.id}>
                <form action={toggleTask}>
                  <input type="hidden" name="taskId" value={task.id} />
                  <button
                    type="submit"
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-surface-2"
                  >
                    <span className="h-4 w-4 shrink-0 rounded border border-edge" aria-hidden />
                    <span className="flex-1 truncate text-sm text-ink-2">{task.title}</span>
                    <span className="shrink-0 text-xs text-muted">{task.date}</span>
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card id="archiwum">
        <CardHeader title="Archiwum" subtitle="Domknięte zadania z ostatnich 30 dni" />
        {byDay.size === 0 ? (
          <p className="text-xs text-muted">Jeszcze nic tu nie ma.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {[...byDay.entries()].map(([date, list]) => (
              <div key={date}>
                <p className="mb-1 text-xs font-medium tracking-wide text-muted uppercase">{date}</p>
                <ul className="flex flex-col gap-0.5">
                  {list.map((task) => (
                    <li key={task.id} className="flex items-center gap-2 text-xs text-muted">
                      <CheckCircle2 className="h-3 w-3 shrink-0 text-good" />
                      <span className="truncate">{task.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

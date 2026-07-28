import Link from "next/link";
import { AlertTriangle, ListChecks } from "lucide-react";

import { AgendaCheck } from "@/components/agenda/agenda-check";
import { AgendaRefresh } from "@/components/agenda/agenda-refresh";
import { Meter } from "@/components/charts/sparkline";
import { Card, CardHeader, EmptyState } from "@/components/ui/card";
import {
  AGENDA_CATEGORY_LABEL,
  CATEGORY_COLOR,
  DAY_END_MIN,
  annotateAgenda,
  dayLoad,
  nowLineIndex,
  selectSpotlight,
  type AgendaItem,
  type TimedAgendaItem,
} from "@/lib/domain/agenda";
import { formatMinutes } from "@/lib/domain/dates";
import { cn } from "@/lib/utils";

/**
 * Plan dnia jako główny element strony — cały dzień na jednej osi, z akcentem
 * na to, co dzieje się teraz i zaraz.
 *
 * Trzy zasady widoku:
 * — przeszłość jest wyciszona, nie ukryta: zaległość ma być widoczna,
 * — „teraz" świeci kolorem swojej kategorii; linia „teraz GG:MM" stoi na osi
 *   dokładnie między tym, co się zaczęło, a tym, co dopiero będzie,
 * — każda pozycja ma odhaczenie na miejscu — plan dnia jest też miejscem
 *   domykania dnia, nie tylko jego podglądem.
 */
export function TodayHero({ items, today, nowMin }: { items: AgendaItem[]; today: string; nowMin: number }) {
  const annotated = annotateAgenda(items, nowMin);
  const timed = annotated.filter((item) => item.state !== null);
  const anytime = annotated.filter((item) => item.state === null);
  const spotlight = selectSpotlight(annotated);
  const lineIndex = nowLineIndex(timed, nowMin);

  const done = annotated.filter((item) => item.done).length;
  const total = annotated.length;
  const left = total - done;

  // Budżet dnia: minuty planu vs czas do 22:00 — sygnał „coś przełóż", zanim wieczór to obnaży.
  const load = dayLoad(annotated, nowMin);
  const godziny = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h > 0 ? `${h} h${m > 0 ? ` ${m} min` : ""}` : `${m} min`;
  };

  return (
    <Card id="plan-dnia" className="md:col-span-2 xl:col-span-6">
      <AgendaRefresh />
      <CardHeader
        title="Plan na dziś"
        subtitle={
          total > 0
            ? left === 0
              ? `Zrobione wszystkie ${total} — dzień domknięty`
              : `Zrobione ${done} z ${total} · zostało ${left}`
            : undefined
        }
        icon={ListChecks}
        action={
          <Link href="/kalendarz" className="text-muted hover:text-ink">
            Kalendarz
          </Link>
        }
      />

      {total === 0 ? (
        <EmptyState
          message="Na dziś nic nie jest zaplanowane — ani leków, ani treningu, ani nauki, ani zadań."
          href="/raport"
          cta="Wypełnij raport"
        />
      ) : (
        <>
          {load.overloaded ? (
            <p
              data-overload
              className="mb-3 flex items-center gap-2 rounded-lg bg-warning/10 px-3 py-2 text-xs text-ink"
            >
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning" />
              Plan wymaga jeszcze {godziny(load.plannedMin)}, a do {formatMinutes(DAY_END_MIN)} zostało{" "}
              {godziny(load.leftMin)} — coś przełóż albo skróć.
            </p>
          ) : null}

          <Meter value={done} max={total} tone="var(--good)" label="Realizacja planu dnia" />

          <div className="mt-4 flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-8">
            {/* Spotlight w źródle pierwszy — na telefonie ma być nad osią. */}
            <section aria-label="Teraz i następne">
              <p className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Teraz / Następne</p>

              {spotlight.length === 0 ? (
                <p className="rounded-lg border border-good/40 bg-good/10 px-3 py-2.5 text-sm text-ink">
                  Nic nie czeka — wszystko na dziś odhaczone albo za Tobą.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {spotlight.map((item) => (
                    <div
                      key={item.key}
                      data-state={item.state}
                      className="rounded-xl border border-edge p-3"
                      style={
                        item.state === "teraz"
                          ? {
                              borderColor: CATEGORY_COLOR[item.category],
                              background: `color-mix(in oklab, ${CATEGORY_COLOR[item.category]} 8%, transparent)`,
                              boxShadow: `0 0 0 1px ${CATEGORY_COLOR[item.category]}`,
                            }
                          : undefined
                      }
                    >
                      <p className="flex items-baseline gap-2 text-xs text-muted">
                        {item.when ? <span className="tabular font-medium text-ink-2">{item.when}</span> : null}
                        <span>{AGENDA_CATEGORY_LABEL[item.category]}</span>
                        {item.state === "teraz" ? (
                          <span className="font-semibold" style={{ color: CATEGORY_COLOR[item.category] }}>
                            teraz
                          </span>
                        ) : item.state === "wkrotce" ? (
                          <span className="font-medium text-ink-2">wkrótce</span>
                        ) : null}
                      </p>
                      <p className="mt-1 text-base leading-snug font-semibold text-ink">{item.title}</p>
                      {item.detail ? <p className="mt-0.5 text-xs text-muted">{item.detail}</p> : null}
                      <div className="mt-2.5">
                        <AgendaCheck action={item.action} date={today} size="lg" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Oś całego dnia. */}
            <section aria-label="Cały dzień">
              <ul className="flex flex-col gap-0.5">
                {timed.slice(0, lineIndex).map((item) => (
                  <AgendaRow key={item.key} item={item} today={today} />
                ))}

                <li aria-hidden className="flex items-center gap-2 py-0.5">
                  <span className="tabular shrink-0 text-[11px] leading-none font-semibold text-critical">
                    {formatMinutes(nowMin)}
                  </span>
                  <span className="h-px flex-1 bg-critical/60" />
                </li>

                {timed.slice(lineIndex).map((item) => (
                  <AgendaRow key={item.key} item={item} today={today} />
                ))}
              </ul>

              {anytime.length > 0 ? (
                <div className="mt-3 border-t border-line pt-2">
                  <p className="mb-1 text-xs font-semibold tracking-wide text-muted uppercase">W dowolnej chwili</p>
                  <ul className="flex flex-col gap-0.5">
                    {anytime.map((item) => (
                      <AgendaRow key={item.key} item={item} today={today} />
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          </div>
        </>
      )}
    </Card>
  );
}

/**
 * Wiersz osi: [odhaczenie][link do kafelka]. Formularz nie może siedzieć
 * w Linku, więc wiersz jest flexem z dwoma niezależnymi elementami.
 */
function AgendaRow({ item, today }: { item: TimedAgendaItem; today: string }) {
  return (
    <li
      data-state={item.state ?? "bez-pory"}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-2 py-1.5",
        item.state === "przeszle" && !item.done && "opacity-55",
        item.done && "opacity-70",
        item.state === "wkrotce" && !item.done && "bg-surface-2/60",
      )}
      style={
        item.state === "teraz" && !item.done
          ? {
              boxShadow: `inset 2px 0 0 ${CATEGORY_COLOR[item.category]}`,
              background: `color-mix(in oklab, ${CATEGORY_COLOR[item.category]} 7%, transparent)`,
            }
          : undefined
      }
    >
      <AgendaCheck action={item.action} date={today} size="sm" />

      <Link href={item.href} className="flex min-w-0 flex-1 items-baseline gap-2.5 rounded-md hover:bg-surface-2">
        <span className="tabular w-14 shrink-0 text-xs text-muted">{item.when ?? "—"}</span>
        <span
          className="mt-1.5 h-1.5 w-1.5 shrink-0 self-start rounded-full"
          style={{ background: CATEGORY_COLOR[item.category] }}
          aria-hidden
        />
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              "block truncate text-sm",
              item.done ? "text-muted line-through" : "text-ink",
              item.state === "wkrotce" && !item.done && "font-medium",
            )}
          >
            {item.title}
          </span>
          <span className="block truncate text-xs text-muted">
            {AGENDA_CATEGORY_LABEL[item.category]}
            {item.detail ? ` · ${item.detail}` : ""}
          </span>
        </span>
      </Link>
    </li>
  );
}

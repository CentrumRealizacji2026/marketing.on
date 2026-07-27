import type { Metadata } from "next";
import Link from "next/link";
import { CalendarHeart, Gift, Heart, Sparkles } from "lucide-react";

import { Card, CardHeader, EmptyState } from "@/components/ui/card";
import { toggleGesture } from "@/lib/actions/config";
import { getUserSettings, requireOnboardedUser } from "@/lib/auth/session";
import { formatDatePl, todayInTz, WEEKDAYS, isoWeekday } from "@/lib/domain/dates";
import { describeFamilyDate, FAMILY_KIND_LABEL } from "@/lib/domain/family";
import { GESTURES_DISCLAIMER, GESTURE_SOURCES, MECHANISM_LABEL } from "@/lib/domain/gestures";
import { getFamilyOverview } from "@/lib/queries/family";
import { cn, pluralPl } from "@/lib/utils";

export const metadata: Metadata = { title: "Rodzina" };
export const dynamic = "force-dynamic";

export default async function FamilyPage() {
  const user = await requireOnboardedUser();
  const settings = await getUserSettings(user.id);
  const today = todayInTz(settings.timezone);
  const { members, events, upcoming, gestures } = await getFamilyOverview(user.id, settings, today);

  const usedSources = [...new Set(gestures.map((entry) => entry.gesture.source))];

  return (
    <div className="flex flex-col gap-3">
      <Card id="daty">
        <CardHeader
          title="Najbliższe daty"
          subtitle="Urodziny, rocznice i zaplanowane wydarzenia — do 120 dni w przód"
          icon={CalendarHeart}
        />
        {upcoming.length === 0 ? (
          <EmptyState
            message="Nie masz jeszcze żadnych dat rodzinnych."
            href="/ustawienia/rodzina"
            cta="Dodaj osoby i wydarzenia"
          />
        ) : (
          <ul className="flex flex-col gap-1">
            {upcoming.slice(0, 12).map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-line py-2 last:border-0"
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium text-ink">
                    {entry.label}
                    {entry.ordinal ? <span className="text-muted"> · {entry.ordinal}.</span> : null}
                  </span>
                  <span className="text-xs text-muted">
                    {FAMILY_KIND_LABEL[entry.kind]} · {formatDatePl(entry.date)}
                    {entry.note ? ` · ${entry.note}` : ""}
                  </span>
                </span>
                <span
                  className={cn(
                    "tabular shrink-0 text-sm font-medium",
                    entry.daysUntil <= 7 ? "text-warning" : "text-ink",
                  )}
                >
                  {describeFamilyDate(entry)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card id="gesty">
        <CardHeader
          title="Drobne gesty na ten tydzień"
          subtitle={
            settings.familyGesturesPerWeek > 0
              ? `${settings.familyGesturesPerWeek} ${pluralPl(settings.familyGesturesPerWeek, "gest", "gesty", "gestów")} tygodniowo · zmienisz w Celach i normach`
              : "Podpowiedzi są wyłączone"
          }
          icon={Sparkles}
        />
        {gestures.length === 0 ? (
          <EmptyState
            message="Planowanie gestów jest wyłączone. Włączysz je, ustawiając liczbę większą od zera."
            href="/ustawienia/cele"
            cta="Ustaw liczbę"
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {gestures.map((entry) => (
              <li
                key={`${entry.date}-${entry.gesture.id}`}
                className={cn(
                  "rounded-lg border p-3",
                  entry.done ? "border-good/40 bg-good/5" : "border-edge",
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <span className="text-xs font-medium tracking-wide text-muted uppercase">
                    {WEEKDAYS.find((day) => day.value === isoWeekday(entry.date))?.label} ·{" "}
                    {MECHANISM_LABEL[entry.gesture.mechanism]} · {entry.gesture.minutes} min
                  </span>
                  <form action={toggleGesture}>
                    <input type="hidden" name="date" value={entry.date} />
                    <input type="hidden" name="gestureId" value={entry.gesture.id} />
                    <button
                      type="submit"
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs transition-colors",
                        entry.done
                          ? "bg-good/15 text-good"
                          : "border border-edge text-muted hover:bg-surface-2 hover:text-ink",
                      )}
                    >
                      {entry.done ? "✓ zrobione" : "oznacz jako zrobione"}
                    </button>
                  </form>
                </div>
                <p className={cn("mt-1.5 text-sm", entry.done ? "text-muted line-through" : "text-ink")}>
                  {entry.gesture.text}
                </p>
                <p className="mt-1 text-xs text-muted">{entry.gesture.why}</p>
              </li>
            ))}
          </ul>
        )}

        {usedSources.length > 0 ? (
          <div className="mt-4 border-t border-line pt-3">
            <p className="mb-1.5 text-xs font-medium tracking-wide text-muted uppercase">Na czym to oparte</p>
            <ul className="flex flex-col gap-1">
              {usedSources.map((key) => (
                <li key={key} className="text-xs text-muted">
                  <a
                    href={GESTURE_SOURCES[key].url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-series-1 hover:underline"
                  >
                    {GESTURE_SOURCES[key].label}
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted">{GESTURES_DISCLAIMER}</p>
          </div>
        ) : null}
      </Card>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card id="osoby">
          <CardHeader title="Osoby" subtitle="Imiona i daty urodzin" icon={Heart} />
          {members.length === 0 ? (
            <EmptyState message="Nie masz jeszcze wpisanych osób." href="/ustawienia/rodzina" cta="Dodaj osoby" />
          ) : (
            <ul className="flex flex-col gap-1">
              {members.map((member) => (
                <li key={member.id} className="flex items-center justify-between gap-3 border-b border-line py-1.5 last:border-0">
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm text-ink">{member.name}</span>
                    {member.relation ? <span className="text-xs text-muted">{member.relation}</span> : null}
                  </span>
                  <span className="tabular shrink-0 text-sm text-muted">
                    {member.birthDate ? formatDatePl(member.birthDate) : "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/ustawienia/rodzina" className="mt-3 inline-block text-xs text-series-1 hover:underline">
            Zarządzaj osobami →
          </Link>
        </Card>

        <Card>
          <CardHeader title="Wydarzenia" subtitle="Rocznice, randki, wspólne wyjazdy" icon={Gift} />
          {events.length === 0 ? (
            <EmptyState
              message="Nie masz jeszcze wydarzeń. Randkę albo wyjazd dodasz tak samo jak rocznicę."
              href="/ustawienia/rodzina"
              cta="Dodaj wydarzenie"
            />
          ) : (
            <ul className="flex flex-col gap-1">
              {events.map((event) => (
                <li key={event.id} className="flex items-center justify-between gap-3 border-b border-line py-1.5 last:border-0">
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm text-ink">{event.name}</span>
                    <span className="text-xs text-muted">
                      {FAMILY_KIND_LABEL[event.kind]}
                      {event.recurring ? " · co roku" : ""}
                    </span>
                  </span>
                  <span className="tabular shrink-0 text-sm text-muted">{formatDatePl(event.date)}</span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/ustawienia/rodzina" className="mt-3 inline-block text-xs text-series-1 hover:underline">
            Zarządzaj wydarzeniami →
          </Link>
        </Card>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { Brain, Target } from "lucide-react";

import { MentorRunner } from "./mentor-runner";
import { Card, CardHeader, EmptyState, StatusPill } from "@/components/ui/card";
import { setRecommendationStatus } from "@/lib/actions/mentor";
import { mentorConfigured } from "@/lib/ai/mentor";
import { getUserSettings, requireOnboardedUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { mentorRuns, recommendations, type RecommendationStatus } from "@/lib/db/schema";
import { formatDatePl, todayInTz } from "@/lib/domain/dates";
import { formatMoney, formatNumber } from "@/lib/utils";
import { buildSnapshot } from "@/lib/queries/snapshot";

export const metadata: Metadata = { title: "Mentor" };
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<RecommendationStatus, string> = {
  nowa: "Nowa",
  przyjeta: "Przyjęta",
  zrobiona: "Zrobiona",
  odrzucona: "Odrzucona",
};

const HORIZON_LABEL: Record<string, string> = {
  dzis: "na dziś",
  tydzien: "na ten tydzień",
  miesiac: "na ten miesiąc",
};

export default async function MentorPage() {
  const user = await requireOnboardedUser();
  const settings = await getUserSettings(user.id);
  const today = todayInTz(settings.timezone);

  const [runs, recs, snapshot] = await Promise.all([
    db
      .select()
      .from(mentorRuns)
      .where(eq(mentorRuns.userId, user.id))
      .orderBy(desc(mentorRuns.createdAt))
      .limit(1),
    db
      .select()
      .from(recommendations)
      .where(eq(recommendations.userId, user.id))
      .orderBy(desc(recommendations.forDate), recommendations.priority)
      .limit(30),
    buildSnapshot(user.id, settings, today),
  ]);

  const latest = runs[0] ?? null;
  const active = recs.filter((rec) => rec.status === "nowa" || rec.status === "przyjeta");
  const closed = recs.filter((rec) => rec.status === "zrobiona" || rec.status === "odrzucona");

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <CardHeader
          title="Mentor, trener i kierownik projektów"
          subtitle="Rekomendacje powstają wyłącznie z danych, które sam wprowadziłeś."
          icon={Brain}
        />
        <MentorRunner configured={mentorConfigured()} />
        <p className="mt-3 text-xs text-muted">
          Mentor nie udziela porad medycznych. Może zauważyć, że realizacja przyjmowania leków spadła,
          ale nigdy nie zaproponuje zmiany dawki ani nowego preparatu — to zostaje między Tobą a lekarzem.
        </p>
      </Card>

      {latest ? (
        <Card id="rekomendacje">
          <CardHeader
            title="Ostatnia analiza"
            subtitle={`${formatDatePl(latest.forDate)} · tryb: ${latest.mode}`}
          />
          {latest.summary ? <p className="text-sm text-ink-2">{latest.summary}</p> : null}
        </Card>
      ) : null}

      <Card>
        <CardHeader title="Rekomendacje" subtitle={`${active.length} otwartych`} />
        {active.length === 0 ? (
          <EmptyState message="Brak otwartych rekomendacji. Wygeneruj analizę powyżej." />
        ) : (
          <ul className="flex flex-col gap-2">
            {active.map((rec) => (
              <li key={rec.id} className="rounded-lg border border-edge p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium tracking-wide text-muted uppercase">{rec.category}</span>
                  <StatusPill tone={rec.priority <= 2 ? "warning" : "neutral"}>
                    priorytet {rec.priority}
                  </StatusPill>
                  {rec.horizon ? (
                    <span className="text-xs text-muted">{HORIZON_LABEL[rec.horizon] ?? rec.horizon}</span>
                  ) : null}
                  {rec.status === "przyjeta" ? <StatusPill tone="good">Przyjęta</StatusPill> : null}
                </div>

                <p className="mt-2 text-sm text-ink-2">{rec.observation}</p>
                <p className="mt-1.5 text-sm font-medium text-ink">→ {rec.action}</p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {(["przyjeta", "zrobiona", "odrzucona"] as const)
                    .filter((status) => status !== rec.status)
                    .map((status) => (
                      <form action={setRecommendationStatus} key={status}>
                        <input type="hidden" name="id" value={rec.id} />
                        <input type="hidden" name="status" value={status} />
                        <button
                          type="submit"
                          className="rounded-lg border border-edge px-2.5 py-1 text-xs text-ink-2 hover:bg-surface-2 hover:text-ink"
                        >
                          {STATUS_LABEL[status]}
                        </button>
                      </form>
                    ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card id="tydzien">
        <CardHeader
          title="Przegląd tygodnia"
          subtitle="Te liczby trafiają do mentora — jeśli któraś jest pusta, mentor o tym powie."
          icon={Target}
        />
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm md:grid-cols-4">
          <Metric label="Rozmowy (7 dni)" value={formatNumber(snapshot.sprzedaz.tydzien.calls)} />
          <Metric label="Spotkania odbyte (7 dni)" value={formatNumber(snapshot.sprzedaz.tydzien.meetingsHeld)} />
          <Metric
            label="Wartość umów (7 dni)"
            value={formatMoney(snapshot.sprzedaz.tydzien.valuePln, settings.currency)}
          />
          <Metric
            label="Priorytety domknięte"
            value={snapshot.zadania.realizacjaProcTydzien === null ? "—" : `${snapshot.zadania.realizacjaProcTydzien}%`}
          />
          <Metric
            label="Treningi zrealizowane"
            value={snapshot.trening.realizacjaProcTydzien === null ? "—" : `${snapshot.trening.realizacjaProcTydzien}%`}
          />
          <Metric
            label="Bloki nauki"
            value={snapshot.nauka.realizacjaProcTydzien === null ? "—" : `${snapshot.nauka.realizacjaProcTydzien}%`}
          />
          <Metric
            label="Woda (średnia 7 dni)"
            value={snapshot.zdrowie.wodaSredniaTydzienMl === null ? "—" : `${formatNumber(snapshot.zdrowie.wodaSredniaTydzienMl)} ml`}
          />
          <Metric
            label="Leki przyjęte"
            value={
              snapshot.zdrowie.realizacjaLekowProcTydzien === null
                ? "—"
                : `${snapshot.zdrowie.realizacjaLekowProcTydzien}%`
            }
          />
        </dl>
      </Card>

      <Card id="cele">
        <CardHeader title="Cele" subtitle="Ustawiasz je w panelu zarządzania — mentor porównuje z nimi wyniki." />
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm md:grid-cols-4">
          <Metric label="Rozmowy dziennie" value={snapshot.cele.rozmowyDziennie ?? "—"} />
          <Metric label="Spotkania odbyte dziennie" value={snapshot.cele.spotkaniaOdbyteDziennie ?? "—"} />
          <Metric label="Umowy tygodniowo" value={snapshot.cele.umowyTygodniowo ?? "—"} />
          <Metric
            label="Woda dziennie"
            value={snapshot.cele.wodaDziennieMl ? `${formatNumber(snapshot.cele.wodaDziennieMl)} ml` : "—"}
          />
        </dl>
      </Card>

      {closed.length > 0 ? (
        <Card>
          <CardHeader title="Zamknięte" subtitle={`${closed.length} rekomendacji`} />
          <ul className="flex flex-col gap-1.5">
            {closed.map((rec) => (
              <li key={rec.id} className="flex items-start justify-between gap-3 text-xs">
                <span className="text-muted line-through">{rec.action}</span>
                <span className="shrink-0 text-muted">{STATUS_LABEL[rec.status]}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="tabular mt-0.5 font-medium text-ink">{value}</dd>
    </div>
  );
}

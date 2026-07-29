import type { Metadata } from "next";
import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { FileSignature, TrendingUp } from "lucide-react";

import { DayBars } from "@/components/charts/day-bars";
import { BarRow, Meter } from "@/components/charts/sparkline";
import { Card, CardHeader, EmptyState, StatTile } from "@/components/ui/card";
import { getUserSettings, requireOnboardedUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { contracts, salesDaily } from "@/lib/db/schema";
import { DealsTable } from "@/components/forms/deals-table";
import { saveDeals } from "@/lib/actions/config";
import { getDeals } from "@/lib/queries/config";
import { addDays, formatDateShortPl, lastNDays, startOfWeek, todayInTz } from "@/lib/domain/dates";
import { isDealStale, pipelineForecast, summarizeDeals } from "@/lib/domain/deals";
import { conversionRates, formatPercent, goalProgress, sumSales } from "@/lib/domain/sales";
import { formatMoney, formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Sprzedaż" };
export const dynamic = "force-dynamic";

const RANGE = 30;

export default async function SalesPage() {
  const user = await requireOnboardedUser();
  const settings = await getUserSettings(user.id);
  const today = todayInTz(settings.timezone);
  const from = addDays(today, -(RANGE - 1));
  const weekStart = startOfWeek(today, settings.weekStartsOn);

  const [rows, contractRows, dealRows] = await Promise.all([
    db
      .select()
      .from(salesDaily)
      .where(and(eq(salesDaily.userId, user.id), gte(salesDaily.date, from), lte(salesDaily.date, today)))
      .orderBy(asc(salesDaily.date)),
    db
      .select()
      .from(contracts)
      .where(and(eq(contracts.userId, user.id), gte(contracts.signedOn, from)))
      .orderBy(desc(contracts.signedOn)),
    getDeals(user.id),
  ]);

  const byDate = new Map(rows.map((row) => [row.date, row]));
  const dates = lastNDays(today, 14);

  const week = rows.filter((row) => row.date >= weekStart);
  const signedWeek = contractRows.filter((row) => row.signedOn >= weekStart && row.status === "podpisana");
  const signedMonth = contractRows.filter((row) => row.status === "podpisana");

  const totalsWeek = {
    ...sumSales(week),
    contracts: signedWeek.length,
    valuePln: signedWeek.reduce((sum, row) => sum + row.valuePln, 0),
  };
  const totalsMonth = {
    ...sumSales(rows),
    contracts: signedMonth.length,
    valuePln: signedMonth.reduce((sum, row) => sum + row.valuePln, 0),
  };

  const rates = conversionRates(totalsMonth);
  const maxFunnel = Math.max(totalsMonth.calls, 1);

  // Prognoza z lejka i stygnące szanse — liczone z zapisanego stanu tabeli.
  const dealsSummary = summarizeDeals(dealRows);
  const forecast = pipelineForecast(dealsSummary, rates.heldToContract, dealRows);
  const staleDeals = dealRows.filter((row) => isDealStale(row, today));

  const sections = [
    { id: "rozmowy", title: "Rozmowy z klientami", key: "calls" as const, goal: settings.goalCallsPerDay },
    {
      id: "umowione",
      title: "Spotkania umówione",
      key: "meetingsScheduled" as const,
      goal: settings.goalMeetingsScheduledPerDay,
    },
    {
      id: "odbyte",
      title: "Spotkania odbyte",
      key: "meetingsHeld" as const,
      goal: settings.goalMeetingsHeldPerDay,
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <CardHeader title="Sprzedaż w skrócie" subtitle="Tydzień i ostatnie 30 dni" icon={TrendingUp} />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatTile label="Rozmowy (tydzień)" value={formatNumber(totalsWeek.calls)} footer={`${formatNumber(totalsMonth.calls)} w 30 dniach`} />
          <StatTile
            label="Spotkania odbyte (tydzień)"
            value={formatNumber(totalsWeek.meetingsHeld)}
            footer={`${formatNumber(totalsMonth.meetingsHeld)} w 30 dniach`}
          />
          <StatTile label="Umowy (tydzień)" value={formatNumber(totalsWeek.contracts)} footer={`${formatNumber(totalsMonth.contracts)} w 30 dniach`} />
          <StatTile
            label="Wartość umów (tydzień)"
            value={formatMoney(totalsWeek.valuePln, settings.currency)}
            footer={`${formatMoney(totalsMonth.valuePln, settings.currency)} w 30 dniach`}
          />
        </div>
      </Card>

      <Card id="do-podpisania">
        <CardHeader
          title="Do podpisania"
          subtitle="Klienci, z którymi umowa jeszcze nie jest zamknięta, i szacowana wartość"
          icon={FileSignature}
        />

        {dealsSummary.open > 0 ? (
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatTile
              label="Prognoza z lejka"
              value={formatMoney(forecast.expectedPln, settings.currency)}
              footer={
                forecast.ownCount > 0
                  ? `${forecast.ownCount} z ${dealsSummary.open} pozycji z własną szansą, reszta × ${Math.round(
                      forecast.rate * 100,
                    )}%`
                  : `${formatMoney(dealsSummary.openPln, settings.currency)} × ${Math.round(forecast.rate * 100)}% (${
                      forecast.source === "winRate"
                        ? "Twoja skuteczność zamykania"
                        : forecast.source === "konwersja"
                          ? "konwersja spotkanie → umowa"
                          : "wartość domyślna 50%"
                    })`
              }
            />
            <StatTile
              label="Do zdobycia"
              value={formatMoney(dealsSummary.openPln, settings.currency)}
              footer={`${dealsSummary.open} otwartych pozycji`}
            />
            <div
              className={
                staleDeals.length > 0 ? "rounded-lg bg-warning/10 p-3" : "rounded-lg border border-edge p-3"
              }
            >
              <p className="text-xs text-muted">Stygnące szanse</p>
              <p className="tabular mt-0.5 text-xl font-semibold text-ink">{staleDeals.length}</p>
              {staleDeals.length > 0 ? (
                <p className="mt-0.5 text-xs text-ink-2">
                  {staleDeals
                    .slice(0, 3)
                    .map((deal) => deal.clientName)
                    .join(", ")}
                  {staleDeals.length > 3 ? "…" : ""} — bez ruchu albo po terminie akcji
                </p>
              ) : (
                <p className="mt-0.5 text-xs text-muted">Wszystkie szanse mają świeży ruch.</p>
              )}
            </div>
          </div>
        ) : null}

        <DealsTable
          initial={dealRows.map((row) => ({
            id: row.id,
            clientName: row.clientName,
            valuePln: row.valuePln,
            expectedDate: row.expectedDate,
            stage: row.stage,
            nextAction: row.nextAction,
            nextActionDate: row.nextActionDate,
            note: row.note,
            probability: row.probability,
            stale: isDealStale(row, today),
          }))}
          action={saveDeals}
          currency={settings.currency}
        />
      </Card>

      {sections.map((section) => {
        const values = dates.map((date) => byDate.get(date)?.[section.key] ?? 0);
        const todayValue = byDate.get(today)?.[section.key] ?? 0;
        const progress = goalProgress(todayValue, section.goal);

        return (
          <Card key={section.id} id={section.id}>
            <CardHeader
              title={section.title}
              subtitle="Ostatnie 14 dni"
              action={progress ? <span className="text-muted">dziś {progress.pct}% celu</span> : null}
            />
            {progress ? (
              <div className="mb-3">
                <Meter
                  value={progress.actual}
                  max={progress.goal}
                  tone={progress.pct >= 100 ? "var(--good)" : "var(--series-1)"}
                  label={`${section.title} dziś`}
                />
              </div>
            ) : null}
            <DayBars
              bars={dates.map((date, index) => ({
                date,
                value: values[index],
                label: formatDateShortPl(date),
              }))}
              today={today}
              goal={section.goal}
            />
          </Card>
        );
      })}

      <Card id="lejek">
        <CardHeader title="Lejek" subtitle="Ostatnie 30 dni" />
        <div className="flex flex-col gap-3">
          <BarRow label="Rozmowy" value={totalsMonth.calls} max={maxFunnel} display={formatNumber(totalsMonth.calls)} />
          <BarRow
            label="Spotkania umówione"
            value={totalsMonth.meetingsScheduled}
            max={maxFunnel}
            display={`${formatNumber(totalsMonth.meetingsScheduled)} · ${formatPercent(rates.callToScheduled)}`}
          />
          <BarRow
            label="Spotkania odbyte"
            value={totalsMonth.meetingsHeld}
            max={maxFunnel}
            display={`${formatNumber(totalsMonth.meetingsHeld)} · ${formatPercent(rates.scheduledToHeld)}`}
          />
          <BarRow
            label="Umowy"
            value={totalsMonth.contracts}
            max={maxFunnel}
            display={`${formatNumber(totalsMonth.contracts)} · ${formatPercent(rates.heldToContract)}`}
            tone="var(--good)"
          />
        </div>
        <p className="mt-3 text-xs text-muted">
          Procent przy każdym etapie to konwersja z etapu poprzedniego. Od rozmowy do umowy:{" "}
          {formatPercent(rates.callToContract)}.
        </p>
      </Card>

      <Card id="umowy">
        <CardHeader title="Umowy" subtitle="Ostatnie 30 dni" />
        {contractRows.length === 0 ? (
          <EmptyState message="Brak umów w tym okresie." href="/raport" cta="Dodaj w raporcie" />
        ) : (
          <ul className="flex flex-col gap-1.5">
            {contractRows.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 border-b border-line py-2 text-sm last:border-0">
                <div className="min-w-0">
                  <p className="truncate text-ink">{row.clientName}</p>
                  <p className="text-xs text-muted">
                    {row.signedOn} · {row.status}
                  </p>
                </div>
                <span className="tabular shrink-0 font-medium text-ink">
                  {formatMoney(row.valuePln, settings.currency)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

import type { Metadata } from "next";
import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { Wallet } from "lucide-react";

import { Sparkline } from "@/components/charts/sparkline";
import { Card, CardHeader, EmptyState, StatTile } from "@/components/ui/card";
import { getUserSettings, requireOnboardedUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { contracts, dailyLogs } from "@/lib/db/schema";
import { addDays, formatDatePl, lastNDays, startOfMonth, todayInTz } from "@/lib/domain/dates";
import { formatMoney, formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Finanse" };
export const dynamic = "force-dynamic";

const RANGE = 90;

export default async function FinancePage() {
  const user = await requireOnboardedUser();
  const settings = await getUserSettings(user.id);
  const today = todayInTz(settings.timezone);
  const from = addDays(today, -(RANGE - 1));
  const monthStart = startOfMonth(today);

  const [logs, contractRows] = await Promise.all([
    db
      .select()
      .from(dailyLogs)
      .where(and(eq(dailyLogs.userId, user.id), gte(dailyLogs.date, from), lte(dailyLogs.date, today)))
      .orderBy(asc(dailyLogs.date)),
    db
      .select()
      .from(contracts)
      .where(eq(contracts.userId, user.id))
      .orderBy(desc(contracts.signedOn))
      .limit(50),
  ]);

  const byDate = new Map(logs.map((log) => [log.date, log]));
  const dates = lastNDays(today, RANGE);
  const series = dates.map((date) => byDate.get(date)?.cashBalancePln ?? null);

  const reported = logs.filter((log) => log.cashBalancePln !== null);
  const current = reported.at(-1)?.cashBalancePln ?? null;
  const first = reported[0]?.cashBalancePln ?? null;
  const change = current !== null && first !== null ? current - first : null;

  // Zmiany między kolejnymi wpisami — prosty obraz przepływów.
  const flows = reported
    .map((log, index) =>
      index === 0
        ? null
        : { date: log.date, delta: log.cashBalancePln! - reported[index - 1].cashBalancePln! },
    )
    .filter((entry): entry is { date: string; delta: number } => entry !== null)
    .slice(-14)
    .reverse();

  const avgDaily =
    change !== null && reported.length > 1
      ? change / Math.max(reported.length - 1, 1)
      : null;

  const signedMonth = contractRows.filter((row) => row.signedOn >= monthStart && row.status === "podpisana");
  const pipeline = contractRows.filter((row) => row.status === "negocjacje");

  return (
    <div className="flex flex-col gap-3">
      <Card id="stan">
        <CardHeader title="Stan środków" subtitle={`Ostatnie ${RANGE} dni`} icon={Wallet} />
        {current === null ? (
          <EmptyState message="Brak wpisów o stanie środków." href="/raport" cta="Wypełnij raport" />
        ) : (
          <>
            <p className="text-4xl leading-none font-semibold text-ink">{formatMoney(current, settings.currency)}</p>
            {change !== null ? (
              <p className={`mt-1.5 text-xs ${change >= 0 ? "text-[var(--delta-up)]" : "text-critical"}`}>
                {change >= 0 ? "▲" : "▼"} {formatMoney(Math.abs(change), settings.currency)}
                <span className="text-muted"> od pierwszego wpisu w okresie</span>
              </p>
            ) : null}
            <div className="mt-4">
              <Sparkline values={series} height={64} label={`Stan środków, ostatnie ${RANGE} dni`} />
            </div>
          </>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card id="przeplywy">
          <CardHeader title="Przepływy" subtitle="Zmiana między kolejnymi wpisami" />
          {flows.length === 0 ? (
            <EmptyState message="Za mało wpisów, żeby pokazać zmiany. Uzupełnij raport przez kilka dni." href="/raport" cta="Wypełnij raport" />
          ) : (
            <ul className="flex flex-col gap-1">
              {flows.map((flow) => (
                <li key={flow.date} className="flex items-center justify-between gap-3 border-b border-line py-1.5 text-sm last:border-0">
                  <span className="text-muted">{formatDatePl(flow.date)}</span>
                  <span className={`tabular font-medium ${flow.delta >= 0 ? "text-[var(--delta-up)]" : "text-critical"}`}>
                    {flow.delta >= 0 ? "+" : "−"}
                    {formatMoney(Math.abs(flow.delta), settings.currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card id="prognoza">
          <CardHeader title="Prognoza" subtitle="Prosta ekstrapolacja średniej dziennej zmiany" />
          {avgDaily === null || current === null ? (
            <EmptyState message="Potrzeba co najmniej dwóch wpisów o stanie środków." />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <StatTile
                label="Średnia zmiana dzienna"
                value={formatMoney(avgDaily, settings.currency)}
                footer="Liczona z dni, w których zapisałeś stan środków."
              />
              <StatTile
                label="Za 30 dni przy tym tempie"
                value={formatMoney(current + avgDaily * 30, settings.currency)}
                footer="To ekstrapolacja, nie plan finansowy."
              />
              {settings.monthlyRevenueGoalPln ? (
                <StatTile
                  label="Cel przychodu miesięcznie"
                  value={formatMoney(settings.monthlyRevenueGoalPln, settings.currency)}
                  footer={`W tym miesiącu podpisane: ${formatMoney(
                    signedMonth.reduce((sum, row) => sum + row.valuePln, 0),
                    settings.currency,
                  )}`}
                />
              ) : null}
            </div>
          )}
        </Card>
      </div>

      <Card id="kontrakty">
        <CardHeader
          title="Kontrakty"
          subtitle={`${formatNumber(signedMonth.length)} podpisanych w tym miesiącu · ${formatNumber(pipeline.length)} w negocjacjach`}
        />
        {contractRows.length === 0 ? (
          <EmptyState message="Nie masz jeszcze zapisanych umów. Dodasz je w raporcie dziennym." href="/raport" cta="Wypełnij raport" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th className="pb-2 font-medium">Data</th>
                  <th className="pb-2 font-medium">Klient</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 text-right font-medium">Wartość</th>
                </tr>
              </thead>
              <tbody>
                {contractRows.map((row) => (
                  <tr key={row.id} className="border-b border-line last:border-0">
                    <td className="py-2 text-muted">{row.signedOn}</td>
                    <td className="py-2 text-ink">{row.clientName}</td>
                    <td className="py-2 text-muted">{row.status}</td>
                    <td className="tabular py-2 text-right font-medium text-ink">
                      {formatMoney(row.valuePln, settings.currency)}
                    </td>
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

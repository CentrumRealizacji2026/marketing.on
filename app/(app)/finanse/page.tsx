import type { Metadata } from "next";
import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { CalendarClock, CheckCircle2, Globe, PiggyBank, Wallet } from "lucide-react";

import { BarRow, Meter, Sparkline } from "@/components/charts/sparkline";
import { Card, CardHeader, EmptyState, StatTile } from "@/components/ui/card";
import { getUserSettings, requireOnboardedUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { contracts, dailyLogs } from "@/lib/db/schema";
import { addDays, formatDatePl, lastNDays, startOfMonth, todayInTz } from "@/lib/domain/dates";
import { dayCashFlow, liveBalance, liveBalanceSeries, sumExpenses, sumIncome } from "@/lib/domain/finance";
import { PLN_PER_PPP_USD, describeRank, formatTopPct, incomeRank } from "@/lib/domain/income-rank";
import { dueLabel } from "@/lib/domain/obligations";
import { getBalanceRowsBefore } from "@/lib/queries/finance";
import { getObligationsOverview } from "@/lib/queries/obligations";
import { getRecentContributions, getSavingsOverview } from "@/lib/queries/savings";
import { cn, formatDays, formatMoney, formatNumber, pluralPl } from "@/lib/utils";

export const metadata: Metadata = { title: "Finanse" };
export const dynamic = "force-dynamic";

const RANGE = 90;

export default async function FinancePage() {
  const user = await requireOnboardedUser();
  const settings = await getUserSettings(user.id);
  const today = todayInTz(settings.timezone);
  const from = addDays(today, -(RANGE - 1));
  const monthStart = startOfMonth(today);

  const [logs, preRows, contractRows, savings, contributions, bills] = await Promise.all([
    db
      .select()
      .from(dailyLogs)
      .where(and(eq(dailyLogs.userId, user.id), gte(dailyLogs.date, from), lte(dailyLogs.date, today)))
      .orderBy(asc(dailyLogs.date)),
    getBalanceRowsBefore(user.id, from),
    db
      .select()
      .from(contracts)
      .where(eq(contracts.userId, user.id))
      .orderBy(desc(contracts.signedOn))
      .limit(50),
    getSavingsOverview(user.id, today),
    getRecentContributions(user.id, 8),
    getObligationsOverview(user.id, today),
  ]);

  const dates = lastNDays(today, RANGE);

  // Saldo na żywo: ostatni wpisany stan + przepływy, które doszły po nim
  // (także z szybkiego dodawania). Wiersze sprzed okna domykają rachunek.
  const live = liveBalance([...preRows, ...logs]);
  const series = liveBalanceSeries([...preRows, ...logs], dates);

  const firstIdx = series.findIndex((value) => value !== null);
  const change = firstIdx !== -1 && firstIdx < series.length - 1 ? series.at(-1)! - series[firstIdx]! : null;

  const reported = logs.filter((log) => log.cashBalancePln !== null);

  // Zmiana salda między kolejnymi wpisami — używana tam, gdzie nie ma wpisanych kwot.
  const balanceChange = new Map<string, number>();
  for (let i = 1; i < reported.length; i += 1) {
    balanceChange.set(reported[i].date, reported[i].cashBalancePln! - reported[i - 1].cashBalancePln!);
  }

  const flows = logs
    .map((log) => ({
      date: log.date,
      flow: dayCashFlow({
        expensesPln: log.expensesPln,
        incomePln: log.incomePln,
        balanceChangePln: balanceChange.get(log.date) ?? null,
      }),
    }))
    .filter((entry) => entry.flow.netPln !== null)
    .slice(-14)
    .reverse();

  const periodFlows = logs.map((log) => dayCashFlow(log));
  const spent = sumExpenses(periodFlows);
  const earned = sumIncome(periodFlows);

  // Średnie tempo z dziennej serii salda — dzielone przez dni kalendarzowe.
  const avgDaily = change !== null ? change / (series.length - 1 - firstIdx) : null;

  // Pozycja zarobkowa liczona z ostatnich 30 dni — pełny miesiąc danych, niezależnie
  // od tego, w którym dniu kalendarzowego miesiąca akurat jesteśmy.
  const rankFrom = addDays(today, -29);
  const inflow30 = logs
    .filter((log) => log.date >= rankFrom && log.incomePln !== null)
    .reduce((sum, log) => sum + log.incomePln!, 0);
  const rankBasisPln = inflow30 > 0 ? inflow30 : null;
  const rank = incomeRank(rankBasisPln ?? 0);

  const signedMonth = contractRows.filter((row) => row.signedOn >= monthStart && row.status === "podpisana");
  const pipeline = contractRows.filter((row) => row.status === "negocjacje");

  return (
    <div className="flex flex-col gap-3">
      <Card id="stan">
        <CardHeader title="Stan środków" subtitle={`Ostatnie ${RANGE} dni`} icon={Wallet} />
        {live === null ? (
          <EmptyState message="Brak wpisów o stanie środków." href="/raport" cta="Wypełnij raport" />
        ) : (
          <>
            <p className="text-4xl leading-none font-semibold text-ink">{formatMoney(live.valuePln, settings.currency)}</p>
            <p className="mt-1.5 text-xs text-muted">
              wpis {formatMoney(live.anchorBalancePln, settings.currency)} z {formatDatePl(live.anchorDate)}
              {live.flowNetPln !== 0
                ? ` ${live.flowNetPln > 0 ? "+" : "−"} ${formatMoney(Math.abs(live.flowNetPln), settings.currency)} przepływów`
                : ", bez późniejszych przepływów"}
            </p>
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
          <CardHeader title="Przepływy" subtitle="Wpłynęło i wydane z raportów dziennych i szybkiego dodawania" />
          {flows.length === 0 ? (
            <EmptyState message="Brak danych o przepływach. Uzupełnij w raporcie, ile wydałeś i ile wpłynęło." href="/raport" cta="Wypełnij raport" />
          ) : (
            <>
              {spent.days > 0 || earned.days > 0 ? (
                <div className="mb-3 grid grid-cols-2 gap-4 border-b border-line pb-3">
                  {earned.days > 0 ? (
                    <div>
                      <p className="text-xs text-muted">Wpłynęło ({formatDays(earned.days)})</p>
                      <p className="tabular mt-0.5 text-lg font-semibold text-[var(--delta-up)]">
                        +{formatMoney(earned.totalPln, settings.currency)}
                      </p>
                    </div>
                  ) : null}
                  {spent.days > 0 ? (
                    <div>
                      <p className="text-xs text-muted">Wydane ({formatDays(spent.days)})</p>
                      <p className="tabular mt-0.5 text-lg font-semibold text-critical">
                        −{formatMoney(spent.totalPln, settings.currency)}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        Średnio {formatMoney(spent.totalPln / spent.days, settings.currency)} dziennie
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <ul className="flex flex-col gap-1">
                {flows.map((entry) => (
                  <li key={entry.date} className="flex items-center justify-between gap-3 border-b border-line py-1.5 text-sm last:border-0">
                    <span className="text-muted">{formatDatePl(entry.date)}</span>
                    <span className="flex items-center gap-2">
                      {/* Kwoty z raportu pokazujemy rozbite — samo netto ukrywa wydatki pokryte wpływem. */}
                      {entry.flow.incomePln !== null ? (
                        <span className="tabular text-[var(--delta-up)]">
                          +{formatMoney(entry.flow.incomePln, settings.currency)}
                        </span>
                      ) : null}
                      {entry.flow.expensesPln !== null ? (
                        <span className="tabular text-critical">
                          −{formatMoney(entry.flow.expensesPln, settings.currency)}
                        </span>
                      ) : null}
                      {entry.flow.source === "saldo" ? (
                        <span
                          title="Wyliczone z różnicy stanu środków"
                          className={`tabular font-medium ${entry.flow.netPln! >= 0 ? "text-[var(--delta-up)]" : "text-critical"}`}
                        >
                          {entry.flow.netPln! >= 0 ? "+" : "−"}
                          {formatMoney(Math.abs(entry.flow.netPln!), settings.currency)}
                        </span>
                      ) : (
                        <span className="tabular font-medium text-ink">
                          = {entry.flow.netPln! > 0 ? "+" : entry.flow.netPln! < 0 ? "−" : ""}
                          {formatMoney(Math.abs(entry.flow.netPln!), settings.currency)}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>

        <Card id="prognoza">
          <CardHeader title="Prognoza" subtitle="Prosta ekstrapolacja średniej dziennej zmiany" />
          {avgDaily === null || live === null ? (
            <EmptyState message="Potrzeba salda i przynajmniej dnia przepływów po nim." />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <StatTile
                label="Średnia zmiana dzienna"
                value={formatMoney(avgDaily, settings.currency)}
                footer="Liczona z dziennych zmian salda w tym okresie."
              />
              <StatTile
                label="Za 30 dni przy tym tempie"
                value={formatMoney(live.valuePln + avgDaily * 30, settings.currency)}
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

      <Card id="pozycja">
        <CardHeader
          title="Zarobki na tle świata"
          subtitle="Liczone z tego, co wpłynęło w ostatnich 30 dniach"
          icon={Globe}
        />
        {rankBasisPln === null ? (
          <EmptyState
            message="Uzupełnij w raporcie, ile wpłynęło — bez tego nie ma czego porównywać."
            href="/raport"
            cta="Wypełnij raport"
          />
        ) : (
          <>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="text-4xl leading-none font-semibold text-ink">
                {rank.world ? formatTopPct(rank.world.topPct) : "dolna połowa"}
              </p>
              <p className="text-sm text-muted">na świecie</p>
            </div>
            <p className="mt-1.5 text-sm text-ink-2">
              {rank.world ? describeRank(rank.world, "swiat") : "Poniżej mediany światowej"}
              {rank.poland ? ` · ${describeRank(rank.poland, "polska").replace("Więcej", "więcej")}` : ""}
            </p>

            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-3 sm:grid-cols-4">
              <div>
                <dt className="text-xs text-muted">Podstawa (30 dni)</dt>
                <dd className="tabular mt-0.5 text-sm font-medium text-ink">
                  {formatMoney(rankBasisPln, settings.currency)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">W skali roku</dt>
                <dd className="tabular mt-0.5 text-sm font-medium text-ink">
                  {formatMoney(rank.annualPln, settings.currency)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Próg górnych 10% świata</dt>
                <dd className="tabular mt-0.5 text-sm font-medium text-ink-2">
                  {formatMoney(rank.worldThresholdsPlnMonthly.top10, settings.currency)} / mies.
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Próg górnego 1% świata</dt>
                <dd className="tabular mt-0.5 text-sm font-medium text-ink-2">
                  {formatMoney(rank.worldThresholdsPlnMonthly.top1, settings.currency)} / mies.
                </dd>
              </div>
            </dl>

            {/* Progi w kolejności rosnącej — od razu widać, które są już za Tobą. */}
            <ul className="mt-4 flex flex-col gap-1.5 border-t border-line pt-3">
              {[
                { label: "Mediana światowa", value: rank.worldThresholdsPlnMonthly.median },
                { label: "Mediana wynagrodzeń w Polsce", value: rank.polandThresholdsPlnMonthly.median },
                { label: "Próg górnych 10% w Polsce", value: rank.polandThresholdsPlnMonthly.top10 },
                { label: "Próg górnych 10% na świecie", value: rank.worldThresholdsPlnMonthly.top10 },
                { label: "Próg górnego 1% na świecie", value: rank.worldThresholdsPlnMonthly.top1 },
              ]
                .sort((a, b) => a.value - b.value)
                .map((row) => {
                  const passed = rankBasisPln >= row.value;
                  return (
                    <li key={row.label} className="flex items-center justify-between gap-3 text-sm">
                      <span className="flex min-w-0 items-center gap-1.5">
                        {passed ? (
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-good" />
                        ) : (
                          <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-dashed border-edge" />
                        )}
                        <span className={cn("truncate", passed ? "text-ink-2" : "text-muted")}>{row.label}</span>
                      </span>
                      <span className={cn("tabular", passed ? "text-ink" : "text-muted")}>
                        {formatMoney(row.value, settings.currency)} / mies.
                      </span>
                    </li>
                  );
                })}
            </ul>

            <p className="mt-3 text-xs text-muted">
              Szacunek, nie pomiar. Świat: World Inequality Report 2026 — dochód brutto na dorosłego w dolarach
              PPP (przelicznik {PLN_PER_PPP_USD.toString().replace(".", ",")} zł za dolara międzynarodowego).
              Polska: GUS, mediana i decyle wynagrodzeń brutto, styczeń 2026 — badanie obejmuje zatrudnionych
              w firmach powyżej 9 osób, więc dla przedsiębiorcy to punkt odniesienia, nie ranking. Między
              progami i powyżej nich rozkład jest przybliżany funkcją potęgową.
            </p>
          </>
        )}
      </Card>

      <Card id="oszczednosci">
        <CardHeader
          title="Oszczędności na cele"
          subtitle={
            savings.goals.length > 0
              ? `${formatMoney(savings.total.savedPln, settings.currency)} z ${formatMoney(
                  savings.total.targetPln,
                  settings.currency,
                )} · ${Math.round(savings.total.pct)}% wszystkich celów`
              : undefined
          }
          icon={PiggyBank}
        />
        {savings.goals.length === 0 ? (
          <EmptyState
            message="Nie masz jeszcze celów oszczędnościowych."
            href="/ustawienia/oszczednosci"
            cta="Dodaj cel"
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {savings.goals.map((goal) => (
              <li key={goal.id}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <span className="text-sm font-medium text-ink">{goal.name}</span>
                  <span className="tabular text-xs text-muted">
                    <span className="text-ink">{formatMoney(goal.savedPln, settings.currency)}</span> z{" "}
                    {formatMoney(goal.targetPln, settings.currency)} · {Math.round(goal.pct)}%
                  </span>
                </div>
                <Meter
                  value={goal.savedPln}
                  max={goal.targetPln}
                  tone={goal.done ? "var(--good)" : "var(--series-3)"}
                  className="mt-1.5"
                  label={`${goal.name}: ${Math.round(goal.pct)}% celu`}
                />
                <p className="mt-1 text-xs text-muted">
                  {goal.done ? (
                    <span className="text-good">✓ Cel osiągnięty</span>
                  ) : (
                    <>
                      Brakuje {formatMoney(goal.remainingPln, settings.currency)}
                      {goal.deadline ? ` · termin ${goal.deadline}` : ""}
                      {goal.requiredPerWeekPln !== null
                        ? ` · potrzeba ${formatMoney(goal.requiredPerWeekPln, settings.currency)}/tydz.`
                        : ""}
                      {goal.pace === "za wolno" ? (
                        <span className="text-warning"> · odkładasz wolniej, niż wymaga termin</span>
                      ) : goal.pace === "przed" ? (
                        <span className="text-[var(--delta-up)]"> · tempo z zapasem</span>
                      ) : goal.pace === "zgodnie" ? (
                        <span className="text-[var(--delta-up)]"> · tempo zgodne z planem</span>
                      ) : null}
                    </>
                  )}
                </p>
              </li>
            ))}
          </ul>
        )}

        {contributions.length > 0 ? (
          <div className="mt-4 border-t border-line pt-3">
            <p className="mb-2 text-xs font-medium tracking-wide text-muted uppercase">Ostatnie dopłaty</p>
            <ul className="flex flex-col gap-1">
              {contributions.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted">{formatDatePl(row.date)}</span>
                  <span className="flex-1 truncate text-ink-2">{row.goalName}</span>
                  <span className="tabular font-medium text-[var(--series-3)]">
                    +{formatMoney(row.amountPln, settings.currency)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Card>

      <Card id="platnosci">
        <CardHeader
          title="Płatności i koszty stałe"
          subtitle={
            bills.obligations.length > 0
              ? `${formatMoney(bills.summary.monthlyPln, settings.currency)} miesięcznie · ${formatMoney(
                  bills.summary.yearlyPln,
                  settings.currency,
                )} rocznie`
              : undefined
          }
          icon={CalendarClock}
        />
        {bills.obligations.length === 0 ? (
          <EmptyState
            message="Nie masz jeszcze wpisanych płatności."
            href="/ustawienia/platnosci"
            cta="Dodaj płatność"
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-medium tracking-wide text-muted uppercase">Koszty stałe</p>
              <div className="grid grid-cols-2 gap-3">
                <StatTile
                  label="Miesięcznie"
                  value={formatMoney(bills.summary.monthlyPln, settings.currency)}
                  footer={`${formatNumber(bills.summary.count)} ${pluralPl(bills.summary.count, "zobowiązanie", "zobowiązania", "zobowiązań")}`}
                />
                <StatTile
                  label="Rocznie"
                  value={formatMoney(bills.summary.yearlyPln, settings.currency)}
                  footer="Płatności jednorazowe liczone osobno."
                />
              </div>

              {bills.summary.byCategory.length > 0 ? (
                <ul className="mt-3 flex flex-col gap-1.5">
                  {bills.summary.byCategory.map((row) => (
                    <li key={row.category}>
                      <BarRow
                        label={row.category}
                        value={row.monthlyPln}
                        max={bills.summary.byCategory[0].monthlyPln}
                        display={formatMoney(row.monthlyPln, settings.currency)}
                        tone="var(--series-2)"
                      />
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div>
              <p className="mb-2 text-xs font-medium tracking-wide text-muted uppercase">
                Najbliższe terminy
              </p>
              {bills.overdue.length === 0 && bills.upcoming.length === 0 ? (
                <p className="text-xs text-muted">Brak płatności w najbliższych 30 dniach.</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {[...bills.overdue, ...bills.upcoming].slice(0, 10).map((payment) => (
                    <li
                      key={`${payment.obligationId}-${payment.dueDate}`}
                      className="flex items-center justify-between gap-3 border-b border-line py-1.5 text-sm last:border-0"
                    >
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-ink">{payment.name}</span>
                        <span className={cn("text-xs", payment.status === "zalegle" ? "text-critical" : "text-muted")}>
                          {payment.dueDate} · {dueLabel(payment.dueDate, today)}
                        </span>
                      </span>
                      <span className="tabular font-medium text-ink">
                        {formatMoney(payment.amountPln, settings.currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Card>

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

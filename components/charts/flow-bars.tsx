import type { FlowColumn } from "@/lib/domain/finance";
import { formatDateShortPl } from "@/lib/domain/dates";
import { niceScaleMax, scaleTicks } from "@/lib/domain/scale";
import { cn, formatMoney } from "@/lib/utils";

/** „13,6 tys." zamiast „13 588 zł" — pełna kwota nie mieści się nad wąskim słupkiem. */
const compact = new Intl.NumberFormat("pl-PL", { notation: "compact", maximumFractionDigits: 1 });

/**
 * Słupki przepływów dzień po dniu: zielony — wpłynęło, czerwony — wydane,
 * jaśniejszy przerywany — zaplanowana płatność (wisi na dniu terminu, także
 * dzisiejszym). Dzień z samej różnicy sald podpisany jako zmiana salda.
 *
 * Wysokości słupków liczone w pikselach od stałej wysokości wykresu — procent
 * nie miałby się do czego odnieść wewnątrz pary słupków w jednej kolumnie.
 */
export function FlowBars({
  columns,
  today,
  currency,
  height = 132,
}: {
  columns: FlowColumn[];
  today: string;
  currency: string;
  height?: number;
}) {
  const largest = Math.max(
    ...columns.flatMap((col) => [col.inPln ?? 0, col.outPln ?? 0, col.plannedOutPln ?? 0]),
    1,
  );
  // Zapas nad najwyższym słupkiem, żeby etykiety kwot nie wyjeżdżały nad wykres.
  const max = niceScaleMax(largest * 1.25);
  const ticks = scaleTicks(max);
  const toPx = (value: number) => Math.max((value / max) * height, 3);

  const title = (col: FlowColumn) => {
    const parts: string[] = [];
    if (col.source === "saldo") {
      const net = col.inPln ?? (col.outPln !== null ? -col.outPln : 0);
      parts.push(
        net === 0
          ? "saldo bez zmian"
          : `zmiana salda ${net > 0 ? "+" : "−"}${formatMoney(Math.abs(net), currency)}`,
      );
    } else if (col.source === "raport") {
      if (col.inPln !== null) parts.push(`wpłynęło ${formatMoney(col.inPln, currency)}`);
      if (col.outPln !== null) parts.push(`wydane ${formatMoney(col.outPln, currency)}`);
    }
    if (col.plannedOutPln !== null) {
      parts.push(`zaplanowane: ${col.paymentNames.join(", ")} — ${formatMoney(col.plannedOutPln, currency)}`);
    }
    if (parts.length === 0) return `${col.date}: ${col.future ? "brak zaplanowanych płatności" : "brak wpisu"}`;
    return `${col.date}: ${parts.join(" · ")}`;
  };

  return (
    <div>
      <div className="flex gap-2">
        {/* Skala — podpisy od góry do zera, wyrównane do kresek siatki. */}
        <div
          className="tabular flex w-9 shrink-0 flex-col justify-between text-right text-[10px] leading-none text-muted"
          style={{ height }}
          aria-hidden
        >
          {ticks.map((tick) => (
            <span key={tick}>{compact.format(tick)}</span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div className="relative" style={{ height }}>
            {ticks.map((tick) => (
              <div
                key={tick}
                className={cn("absolute inset-x-0 border-t", tick === 0 ? "border-line" : "border-line/50")}
                style={{ bottom: `${(tick / max) * 100}%` }}
                aria-hidden
              />
            ))}

            <div className="absolute inset-0 flex items-end gap-1">
              {columns.map((col) => {
                // Zero to wpis, ale nie słupek — rysujemy tylko dodatnie kwoty.
                const inBar = col.inPln !== null && col.inPln > 0 ? col.inPln : null;
                const outBar = col.outPln !== null && col.outPln > 0 ? col.outPln : null;
                const planBar = col.plannedOutPln !== null && col.plannedOutPln > 0 ? col.plannedOutPln : null;
                const bezSlupkow = inBar === null && outBar === null && planBar === null;

                return (
                  <div
                    key={col.date}
                    className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-0.5"
                    title={title(col)}
                  >
                    <div className="hidden flex-col items-center gap-px leading-none sm:flex">
                      {inBar !== null ? (
                        <span className="tabular text-[9px] text-[var(--delta-up)]">+{compact.format(inBar)}</span>
                      ) : null}
                      {outBar !== null ? (
                        <span className="tabular text-[9px] text-critical">−{compact.format(outBar)}</span>
                      ) : null}
                      {planBar !== null ? (
                        <span className="tabular text-[9px] text-critical/70">−{compact.format(planBar)}</span>
                      ) : null}
                    </div>

                    {bezSlupkow ? (
                      // Brak dodatnich kwot zostaje kreską przy osi — title mówi,
                      // czy to dzień bez wpisu, czy wpis z zerami.
                      <div className="h-[2px] w-full max-w-8 rounded-t-[3px] bg-[var(--line)]" />
                    ) : (
                      <div className="flex w-full max-w-8 items-end justify-center gap-[2px]">
                        {inBar !== null ? (
                          <div
                            className="w-full rounded-t-[3px]"
                            style={{ height: `${toPx(inBar)}px`, background: "var(--delta-up)" }}
                          />
                        ) : null}
                        {outBar !== null ? (
                          <div
                            className="w-full rounded-t-[3px]"
                            style={{ height: `${toPx(outBar)}px`, background: "var(--critical)" }}
                          />
                        ) : null}
                        {planBar !== null ? (
                          <div
                            className="w-full rounded-t-[3px] border border-dashed"
                            style={{
                              height: `${toPx(planBar)}px`,
                              background: "color-mix(in oklab, var(--critical) 35%, transparent)",
                              borderColor: "var(--critical)",
                            }}
                          />
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-1 flex gap-1">
            {columns.map((col) => (
              <span
                key={col.date}
                className={cn(
                  "tabular min-w-0 flex-1 truncate text-center text-[10px] leading-none",
                  col.date === today ? "font-medium text-ink" : "text-muted",
                )}
              >
                {/* Na wąskim ekranie „14 lip" nie mieści się w 22 px — zostaje sam numer dnia. */}
                <span className="sm:hidden">{Number(col.date.slice(8, 10))}</span>
                <span className="hidden sm:inline">{formatDateShortPl(col.date)}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm" style={{ background: "var(--delta-up)" }} aria-hidden />
          wpłynęło
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm" style={{ background: "var(--critical)" }} aria-hidden />
          wydane
        </span>
        <span className="flex items-center gap-1">
          <span
            className="inline-block h-2 w-2 rounded-sm border border-dashed"
            style={{
              background: "color-mix(in oklab, var(--critical) 35%, transparent)",
              borderColor: "var(--critical)",
            }}
            aria-hidden
          />
          zaplanowana płatność
        </span>
      </div>
    </div>
  );
}

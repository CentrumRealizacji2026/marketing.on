import { niceScaleMax, scaleTicks } from "@/lib/domain/scale";
import { cn, formatNumber } from "@/lib/utils";

export type DayBar = {
  date: string;
  /** null = brak wpisu tego dnia, co znaczy co innego niż zero. */
  value: number | null;
  /** Krótka etykieta pod słupkiem, np. „14 lip". */
  label: string;
  /** Kolor słupka — pozwala oznaczyć ocenę dnia (np. nawodnienie). */
  tone?: string;
};

/**
 * Wykres słupkowy dnia po dniu z osią i skalą, żeby dało się odczytać poziom
 * każdego dnia, a nie tylko sumę okresu.
 *
 * Wysokości słupków są procentami liczonymi względem obszaru wykresu, który ma
 * wysokość zadaną w pikselach — dzięki temu procent ma do czego się odnieść.
 * Bez tego (kolumna o wysokości automatycznej) słupki zwijają się do zera.
 */
export function DayBars({
  bars,
  today,
  goal = null,
  unit,
  height = 116,
  tone = "var(--series-1)",
  showValues = true,
}: {
  bars: DayBar[];
  today: string;
  /** Cel dzienny — rysowany jako przerywana linia odniesienia. */
  goal?: number | null;
  unit?: string;
  height?: number;
  tone?: string;
  showValues?: boolean;
}) {
  const values = bars.map((bar) => bar.value ?? 0);
  // Cel wchodzi do skali, żeby linia celu zawsze mieściła się w obszarze wykresu.
  const max = niceScaleMax(Math.max(...values, goal ?? 0, 1));
  const ticks = scaleTicks(max);

  return (
    <div className="flex gap-2">
      {/* Skala — podpisy od góry do zera, wyrównane do kresek siatki. */}
      <div
        className="tabular flex w-9 shrink-0 flex-col justify-between text-right text-[10px] leading-none text-muted"
        style={{ height }}
        aria-hidden
      >
        {ticks.map((tick) => (
          <span key={tick}>{formatNumber(tick, tick % 1 === 0 ? 0 : 1)}</span>
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

          {goal ? (
            <div
              className="absolute inset-x-0 z-10 border-t border-dashed border-[var(--series-2)]"
              style={{ bottom: `${Math.min((goal / max) * 100, 100)}%` }}
              aria-hidden
            >
              {/* Tło pod etykietą, żeby nie zlewała się ze słupkiem pod spodem. */}
              <span className="absolute -top-2 right-0 rounded-sm bg-surface px-1 text-[9px] leading-none whitespace-nowrap text-[var(--series-2)]">
                cel {formatNumber(goal)}
              </span>
            </div>
          ) : null}

          <div className="absolute inset-0 flex items-end gap-1">
            {bars.map((bar) => {
              const value = bar.value;
              // Brak wpisu zostaje kreską przy osi — inaczej wyglądałby jak zero.
              const pct = value === null ? 1.5 : Math.max((value / max) * 100, value > 0 ? 3 : 1.5);
              const isToday = bar.date === today;

              return (
                <div
                  key={bar.date}
                  className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-0.5"
                  title={`${bar.date}: ${value === null ? "brak wpisu" : `${formatNumber(value)}${unit ? ` ${unit}` : ""}`}`}
                >
                  {showValues && value !== null && value > 0 ? (
                    <span className="tabular text-[9px] leading-none text-muted">{formatNumber(value)}</span>
                  ) : null}
                  <div
                    className="w-full max-w-7 rounded-t-[3px]"
                    style={{
                      height: `${pct}%`,
                      background:
                        value === null
                          ? "var(--line)"
                          : (bar.tone ?? (isToday ? tone : `color-mix(in oklab, ${tone} 45%, transparent)`)),
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-1 flex gap-1">
          {bars.map((bar) => (
            <span
              key={bar.date}
              className={cn(
                "tabular min-w-0 flex-1 truncate text-center text-[10px] leading-none",
                bar.date === today ? "font-medium text-ink" : "text-muted",
              )}
            >
              {/* Na wąskim ekranie „14 lip" nie mieści się w 22 px — zostaje sam numer dnia. */}
              <span className="sm:hidden">{Number(bar.date.slice(8, 10))}</span>
              <span className="hidden sm:inline">{bar.label}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

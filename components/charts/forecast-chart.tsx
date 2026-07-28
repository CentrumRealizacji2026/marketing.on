import type { ForecastPoint } from "@/lib/domain/finance";
import { niceScaleMax } from "@/lib/domain/scale";
import { formatMoney } from "@/lib/utils";

/**
 * Saldo w czasie: ciągła linia historii i przerywana prognoza, z kropkami
 * w dniach zaplanowanych płatności. Oś liczona ręcznie, bo prognoza może
 * zejść poniżej zera — wtedy pojawia się linia zera w kolorze ostrzegawczym.
 */
export function ForecastChart({
  history,
  forecast,
  currency,
}: {
  history: { values: Array<number | null> };
  forecast: ForecastPoint[];
  currency: string;
}) {
  const W = 640;
  const H = 160;

  const historyNumbers = history.values.filter((value): value is number => value !== null);
  const forecastNumbers = forecast.map((point) => point.valuePln);
  const all = [...historyNumbers, ...forecastNumbers];
  if (all.length < 2) {
    return <p className="text-xs text-muted">Za mało danych na prognozę.</p>;
  }

  const yMax = niceScaleMax(Math.max(...all, 1));
  const yMin = Math.min(0, Math.floor(Math.min(...all)));
  const span = yMax - yMin || 1;

  const total = history.values.length + forecast.length;
  const x = (index: number) => (index / Math.max(total - 1, 1)) * W;
  const y = (value: number) => H - ((value - yMin) / span) * (H - 8) - 4;

  // Historia: segmenty przerywane na dniach bez wartości (jak w Sparkline).
  const segments: string[] = [];
  let current: string[] = [];
  history.values.forEach((value, index) => {
    if (value === null) {
      if (current.length > 1) segments.push(current.join(" "));
      current = [];
      return;
    }
    current.push(`${x(index)},${y(value)}`);
  });
  if (current.length > 1) segments.push(current.join(" "));

  const lastHistoryIndex = history.values.length - 1;
  const lastHistoryValue = [...history.values].reverse().find((value) => value !== null) ?? null;
  const forecastPoints = forecast.map(
    (point, index) => `${x(lastHistoryIndex + 1 + index)},${y(point.valuePln)}`,
  );
  const forecastLine =
    lastHistoryValue !== null
      ? [`${x(lastHistoryIndex)},${y(lastHistoryValue)}`, ...forecastPoints].join(" ")
      : forecastPoints.join(" ");

  return (
    <div>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-40 w-full" role="img" aria-label="Prognoza salda">
          {yMin < 0 ? (
            <line x1={0} x2={W} y1={y(0)} y2={y(0)} stroke="var(--critical)" strokeDasharray="2 4" strokeWidth="1" />
          ) : null}
          {segments.map((points) => (
            <polyline key={points.slice(0, 24)} points={points} fill="none" stroke="var(--series-1)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          ))}
          {forecastLine ? (
            <polyline
              points={forecastLine}
              fill="none"
              stroke="var(--series-1)"
              strokeWidth="2"
              strokeDasharray="5 4"
              vectorEffect="non-scaling-stroke"
              opacity={0.8}
            />
          ) : null}
          {forecast.map((point, index) =>
            point.events.length > 0 ? (
              <circle
                key={point.date}
                cx={x(lastHistoryIndex + 1 + index)}
                cy={y(point.valuePln)}
                r="4"
                fill="var(--warning)"
                stroke="var(--surface)"
                strokeWidth="1.5"
              >
                <title>
                  {point.events.map((event) => `${event.name} — ${formatMoney(event.amountPln, currency)}`).join(", ")}
                </title>
              </circle>
            ) : null,
          )}
        </svg>
        <span className="absolute top-0 left-0 text-[10px] text-muted">{formatMoney(yMax, currency)}</span>
        <span className="absolute bottom-0 left-0 text-[10px] text-muted">{formatMoney(yMin, currency)}</span>
      </div>
      <p className="mt-1.5 text-[10px] text-muted">
        Linia ciągła — ostatnie tygodnie; przerywana — prognoza 90 dni; kropki — zaplanowane płatności.
      </p>
    </div>
  );
}

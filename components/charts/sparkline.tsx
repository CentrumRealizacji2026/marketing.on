import { cn } from "@/lib/utils";

/**
 * Mały wykres przebiegu bez osi — pokazuje kształt, nie wartości.
 * Linia 2px, końcowy znacznik z 2px obwódką w kolorze tła, delikatny wash pod linią.
 * Dni bez wpisu tworzą przerwę zamiast fałszywego zera.
 */
export function Sparkline({
  values,
  width = 160,
  height = 40,
  className,
  tone = "var(--series-1)",
  label,
}: {
  values: Array<number | null>;
  width?: number;
  height?: number;
  className?: string;
  tone?: string;
  label?: string;
}) {
  const points = values
    .map((value, index) => ({ value, index }))
    .filter((p): p is { value: number; index: number } => typeof p.value === "number");

  if (points.length < 2) {
    return <div className={cn("h-10 text-xs text-muted", className)}>Za mało danych na wykres</div>;
  }

  const pad = 4;
  const min = Math.min(...points.map((p) => p.value));
  const max = Math.max(...points.map((p) => p.value));
  const span = max - min || 1;
  const stepX = (width - pad * 2) / Math.max(values.length - 1, 1);

  const toX = (index: number) => pad + index * stepX;
  const toY = (value: number) => height - pad - ((value - min) / span) * (height - pad * 2);

  // Przerwa w danych przerywa linię — nie łączymy przez dni bez wpisu.
  const segments: string[] = [];
  let current: string[] = [];
  for (let i = 0; i < values.length; i += 1) {
    const value = values[i];
    if (typeof value === "number") {
      current.push(`${toX(i).toFixed(1)},${toY(value).toFixed(1)}`);
    } else if (current.length) {
      segments.push(current.join(" "));
      current = [];
    }
  }
  if (current.length) segments.push(current.join(" "));

  const last = points[points.length - 1];
  const areaSegment = segments[segments.length - 1];
  const areaPoints = areaSegment
    ? `${areaSegment.split(" ")[0].split(",")[0]},${height - pad} ${areaSegment} ${toX(last.index).toFixed(1)},${height - pad}`
    : "";

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("h-10 w-full", className)}
      role="img"
      aria-label={label ?? "Wykres przebiegu"}
      preserveAspectRatio="none"
    >
      {areaPoints ? <polygon points={areaPoints} fill={tone} opacity={0.1} /> : null}
      {segments.map((segment, i) => (
        <polyline
          key={i}
          points={segment}
          fill="none"
          stroke={tone}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}
      <circle cx={toX(last.index)} cy={toY(last.value)} r={4} fill={tone} stroke="var(--surface)" strokeWidth={2} />
    </svg>
  );
}

/**
 * Pasek postępu. Wypełnienie niesie stan, tor jest jaśniejszym stopniem tego samego
 * koloru, więc stan czyta się na całej długości.
 */
export function Meter({
  value,
  max,
  tone = "var(--series-1)",
  className,
  label,
}: {
  value: number;
  max: number;
  tone?: string;
  className?: string;
  label?: string;
}) {
  const pct = max > 0 ? Math.min(Math.max((value / max) * 100, 0), 100) : 0;
  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-full", className)}
      style={{ background: `color-mix(in oklab, ${tone} 18%, transparent)` }}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className="h-full rounded-full transition-[width]" style={{ width: `${pct}%`, background: tone }} />
    </div>
  );
}

/** Poziomy wykres słupkowy do porównań w obrębie kafelka (np. lejek sprzedaży). */
export function BarRow({
  label,
  value,
  max,
  display,
  tone = "var(--series-1)",
}: {
  label: string;
  value: number;
  max: number;
  display?: string;
  tone?: string;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1">
      <span className="truncate text-xs text-ink-2">{label}</span>
      <span className="tabular text-xs font-medium text-ink">{display ?? value}</span>
      <div className="col-span-2 h-2 rounded-full" style={{ background: "var(--surface-2)" }}>
        <div className="h-full rounded-r-[4px] rounded-l-sm" style={{ width: `${pct}%`, background: tone }} />
      </div>
    </div>
  );
}

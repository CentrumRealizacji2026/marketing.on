/**
 * Dobór górnej granicy osi wykresu. Oś kończąca się dokładnie na najwyższym
 * słupku wygląda na uciętą i nie zostawia miejsca na podpis wartości, a oś
 * z przypadkową liczbą („3417") nie daje się odczytać jednym spojrzeniem.
 *
 * Zaokrąglamy więc w górę do „okrągłej" wielokrotności potęgi dziesięciu.
 */
const STEPS = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];

export function niceScaleMax(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 1;

  const exponent = Math.floor(Math.log10(value));
  const base = 10 ** exponent;
  const normalized = value / base;
  const step = STEPS.find((candidate) => normalized <= candidate) ?? 10;

  return Math.round(step * base * 1000) / 1000;
}

/**
 * Wartości podpisów na osi — od góry do zera. Dwie kreski pośrednie wystarczą
 * przy wysokości kafelka; więcej zamienia wykres w tabelę.
 */
export function scaleTicks(max: number, count = 2): number[] {
  const ticks: number[] = [max];
  for (let i = count - 1; i >= 1; i -= 1) ticks.push(Math.round(((max * i) / count) * 100) / 100);
  ticks.push(0);
  return ticks;
}

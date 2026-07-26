export type WaterStatus = "dobrze" | "norma" | "zle";

export const WATER_STATUS_LABEL: Record<WaterStatus, string> = {
  dobrze: "Dobrze",
  norma: "W normie",
  zle: "Źle",
};

/**
 * Kategoryzacja nawodnienia względem celu ustawionego przez użytkownika.
 * Progi (`goodPct`, `okPct`) też pochodzą z ustawień — domyślnie 100 % i 80 % celu.
 * Zwraca null, gdy nie ma czego porównywać (brak celu albo brak wpisów).
 */
export function waterStatus(
  amountMl: number | null | undefined,
  goalMl: number | null | undefined,
  goodPct = 100,
  okPct = 80,
): WaterStatus | null {
  if (amountMl === null || amountMl === undefined) return null;
  if (!goalMl || goalMl <= 0) return null;

  const pct = (amountMl / goalMl) * 100;
  if (pct >= goodPct) return "dobrze";
  if (pct >= okPct) return "norma";
  return "zle";
}

/**
 * Średnia liczona wyłącznie z dni, w których cokolwiek zapisano — dzień bez raportu
 * nie zaniża wyniku zerem.
 */
export function averageOfReportedDays(values: Array<number | null | undefined>): number | null {
  const reported = values.filter((v): v is number => typeof v === "number" && !Number.isNaN(v));
  if (reported.length === 0) return null;
  return reported.reduce((sum, v) => sum + v, 0) / reported.length;
}

export function waterPercent(amountMl: number | null | undefined, goalMl: number | null | undefined) {
  if (amountMl === null || amountMl === undefined || !goalMl || goalMl <= 0) return null;
  return Math.round((amountMl / goalMl) * 100);
}

import { diffDays } from "./dates";

/**
 * Ocena, czy zmiana wagi idzie zgodnie z planem.
 *
 * Plan to prosta linia od punktu startowego do celu z terminem. Dla dowolnego dnia
 * wiemy, ile waga „powinna” wynosić, i porównujemy to z ostatnim pomiarem.
 * Kierunek liczy się poprawnie w obie strony — przy chudnięciu lepiej jest poniżej
 * linii, przy budowaniu masy powyżej.
 */

export type WeightPlanStatus = "przed" | "zgodnie" | "za";

export const WEIGHT_STATUS_LABEL: Record<WeightPlanStatus, string> = {
  przed: "Przed planem",
  zgodnie: "Zgodnie z planem",
  za: "Za planem",
};

/** Domyślna tolerancja w kilogramach, w której uznajemy, że jest zgodnie z planem. */
export const WEIGHT_TOLERANCE_KG = 0.5;

export type WeightPlanInput = {
  startKg: number | null;
  startDate: string | null;
  targetKg: number | null;
  targetDate: string | null;
  currentKg: number | null;
  currentDate: string;
};

export type WeightProgress = {
  startKg: number;
  targetKg: number;
  currentKg: number;
  /** Ile waga powinna wynosić dzisiaj według linii planu. */
  expectedKg: number;
  /** Różnica względem linii planu, dodatnia = lepiej niż plan. */
  aheadKg: number;
  status: WeightPlanStatus;
  /** Ile z zaplanowanej zmiany już się dokonało (0–100, może przekroczyć 100). */
  progressPct: number;
  /** Ile czasu planu minęło (0–100). */
  elapsedPct: number;
  plannedPacePerWeek: number;
  actualPacePerWeek: number | null;
  remainingKg: number;
  daysLeft: number;
};

export function weightPlanProgress(
  input: WeightPlanInput,
  toleranceKg: number = WEIGHT_TOLERANCE_KG,
): WeightProgress | null {
  const { startKg, startDate, targetKg, targetDate, currentKg, currentDate } = input;

  if (startKg === null || targetKg === null || currentKg === null) return null;
  if (!startDate || !targetDate) return null;

  const totalDays = diffDays(startDate, targetDate);
  const totalChange = targetKg - startKg;

  // Plan bez czasu albo bez zmiany nie daje się ocenić.
  if (totalDays <= 0 || Math.abs(totalChange) < 0.01) return null;

  const elapsedDays = Math.min(Math.max(diffDays(startDate, currentDate), 0), totalDays);
  const expectedKg = startKg + totalChange * (elapsedDays / totalDays);

  // Dodatnia wartość zawsze znaczy „lepiej niż plan”, niezależnie od kierunku celu.
  const aheadKg = totalChange < 0 ? expectedKg - currentKg : currentKg - expectedKg;

  const status: WeightPlanStatus =
    aheadKg > toleranceKg ? "przed" : aheadKg < -toleranceKg ? "za" : "zgodnie";

  return {
    startKg,
    targetKg,
    currentKg,
    expectedKg,
    aheadKg,
    status,
    progressPct: ((currentKg - startKg) / totalChange) * 100,
    elapsedPct: (elapsedDays / totalDays) * 100,
    plannedPacePerWeek: totalChange / (totalDays / 7),
    actualPacePerWeek: elapsedDays > 0 ? (currentKg - startKg) / (elapsedDays / 7) : null,
    remainingKg: targetKg - currentKg,
    daysLeft: diffDays(currentDate, targetDate),
  };
}

/** Krótkie zdanie opisujące, co dokładnie znaczy odchylenie od planu. */
export function describeWeightProgress(progress: WeightProgress): string {
  const kg = (value: number) => new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 1 }).format(Math.abs(value));

  if (progress.status === "zgodnie") {
    return `Plan na dziś to ${kg(progress.expectedKg)} kg — jesteś w tolerancji.`;
  }
  if (progress.status === "przed") {
    return `Plan na dziś to ${kg(progress.expectedKg)} kg, jesteś o ${kg(progress.aheadKg)} kg do przodu.`;
  }
  return `Plan na dziś to ${kg(progress.expectedKg)} kg, brakuje ${kg(progress.aheadKg)} kg.`;
}

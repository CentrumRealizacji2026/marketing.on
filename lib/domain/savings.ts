/**
 * Cele oszczędnościowe. Odkładane kwoty są osobnym strumieniem: nie są wydatkiem
 * (pieniądze nie znikają, tylko zmieniają przeznaczenie) i nie są przychodem.
 * Dlatego liczą się tu, a nie w przepływach z `finance.ts`.
 */

export type SavingsGoalInput = {
  id: string;
  name: string;
  targetPln: number;
  /** Kwota odłożona poza aplikacją, zanim cel został wpisany. */
  initialPln?: number | null;
  deadline?: string | null;
  active?: boolean;
};

export type SavingsProgress = {
  id: string;
  name: string;
  targetPln: number;
  /** Suma dopłat plus kwota startowa. */
  savedPln: number;
  /** Ile brakuje do celu; 0, gdy cel osiągnięty. */
  remainingPln: number;
  /** 0–100. Nadwyżka ponad cel nie rozpycha paska, ale widać ją w `savedPln`. */
  pct: number;
  done: boolean;
  /** Dni do terminu — ujemne, gdy termin minął. Null bez terminu. */
  daysLeft: number | null;
  /** Ile trzeba odkładać tygodniowo, żeby zdążyć. Null bez terminu albo po jego upływie. */
  requiredPerWeekPln: number | null;
  deadline: string | null;
};

function diffDays(from: string, to: string): number {
  const a = Date.UTC(Number(from.slice(0, 4)), Number(from.slice(5, 7)) - 1, Number(from.slice(8, 10)));
  const b = Date.UTC(Number(to.slice(0, 4)), Number(to.slice(5, 7)) - 1, Number(to.slice(8, 10)));
  return Math.round((b - a) / 86_400_000);
}

/**
 * Stan jednego celu na dany dzień. `contributedPln` to suma dopłat z raportów —
 * wyliczana w zapytaniu, żeby ta funkcja pozostała czysta.
 */
export function savingsProgress(
  goal: SavingsGoalInput,
  contributedPln: number,
  today: string,
): SavingsProgress {
  const targetPln = Math.max(goal.targetPln, 0);
  const savedPln = Math.round(((goal.initialPln ?? 0) + contributedPln) * 100) / 100;
  const remainingPln = Math.max(Math.round((targetPln - savedPln) * 100) / 100, 0);
  const pct = targetPln > 0 ? Math.min((savedPln / targetPln) * 100, 100) : 0;
  const done = targetPln > 0 && savedPln >= targetPln;

  const daysLeft = goal.deadline ? diffDays(today, goal.deadline) : null;

  // Tempo ma sens tylko wtedy, gdy jest jeszcze co odkładać i jest na to czas.
  const requiredPerWeekPln =
    daysLeft !== null && daysLeft > 0 && remainingPln > 0
      ? Math.round((remainingPln / (daysLeft / 7)) * 100) / 100
      : null;

  return {
    id: goal.id,
    name: goal.name,
    targetPln,
    savedPln,
    remainingPln,
    pct,
    done,
    daysLeft,
    requiredPerWeekPln,
    deadline: goal.deadline ?? null,
  };
}

/** Podsumowanie wszystkich celów — jedna liczba na kafelek i dla mentora. */
export function summarizeSavings(progress: SavingsProgress[]): {
  goals: number;
  savedPln: number;
  targetPln: number;
  pct: number;
  done: number;
} {
  const savedPln = Math.round(progress.reduce((sum, g) => sum + g.savedPln, 0) * 100) / 100;
  const targetPln = Math.round(progress.reduce((sum, g) => sum + g.targetPln, 0) * 100) / 100;
  return {
    goals: progress.length,
    savedPln,
    targetPln,
    pct: targetPln > 0 ? Math.min((savedPln / targetPln) * 100, 100) : 0,
    done: progress.filter((g) => g.done).length,
  };
}

/**
 * Czy odkładanie idzie w tempie, które domknie cel w terminie. Porównuje to, co
 * realnie odkładane jest tygodniowo, z tym, co trzeba — z 5-procentową tolerancją,
 * żeby drobne wahania nie krzyczały „nie zdążysz".
 */
export function savingsPace(
  progress: SavingsProgress,
  actualPerWeekPln: number | null,
): "zgodnie" | "za wolno" | "przed" | null {
  if (progress.done) return "przed";
  if (progress.requiredPerWeekPln === null || actualPerWeekPln === null) return null;

  const ratio = actualPerWeekPln / progress.requiredPerWeekPln;
  if (ratio >= 1.05) return "przed";
  if (ratio >= 0.95) return "zgodnie";
  return "za wolno";
}

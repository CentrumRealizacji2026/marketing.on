import { isoWeekday } from "./dates";

export type WeekPlanRow = {
  id: string;
  weekday: number;
  skill: string;
  startTime: string | null;
  durationMin: number | null;
  active: boolean;
  position: number;
};

export type YearPlanRow = {
  id: string;
  periodStart: string;
  periodEnd: string;
  skill: string;
  focus: string | null;
  target: string | null;
};

export type LearningBlock = {
  planId: string;
  skill: string;
  startTime: string | null;
  durationMin: number | null;
  /** Zakres tematyczny z planu rocznego, jeśli dany okres go zawęża. */
  focus: string | null;
  target: string | null;
};

function normalizeSkill(skill: string) {
  return skill.trim().toLocaleLowerCase("pl-PL");
}

/**
 * Blok nauki na dany dzień: plan tygodniowy wyznacza dziedzinę i godzinę,
 * a aktywny okres z planu rocznego dokłada zakres tematyczny.
 *
 * Dzień bez wpisu w planie tygodniowym jest po prostu wolny — nigdzie nie ma
 * zaszytej reguły "weekend wolny", to wynika z tego, co użytkownik wpisał.
 */
export function learningBlocksForDate(
  date: string,
  weekPlans: WeekPlanRow[],
  yearPlans: YearPlanRow[] = [],
): LearningBlock[] {
  const weekday = isoWeekday(date);
  const activePeriods = yearPlans.filter((p) => p.periodStart <= date && date <= p.periodEnd);

  return weekPlans
    .filter((p) => p.active && p.weekday === weekday)
    .sort((a, b) => {
      const at = a.startTime ?? "99:99";
      const bt = b.startTime ?? "99:99";
      if (at !== bt) return at < bt ? -1 : 1;
      return a.position - b.position;
    })
    .map((plan) => {
      const overlay = activePeriods.find((p) => normalizeSkill(p.skill) === normalizeSkill(plan.skill));
      return {
        planId: plan.id,
        skill: plan.skill,
        startTime: plan.startTime,
        durationMin: plan.durationMin,
        focus: overlay?.focus ?? null,
        target: overlay?.target ?? null,
      };
    });
}

/** Dziedziny, które w ogóle występują w planie — do filtrów i podpowiedzi. */
export function skillsInPlan(weekPlans: WeekPlanRow[], yearPlans: YearPlanRow[] = []): string[] {
  const seen = new Map<string, string>();
  for (const row of [...weekPlans, ...yearPlans]) {
    const key = normalizeSkill(row.skill);
    if (!seen.has(key)) seen.set(key, row.skill.trim());
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b, "pl-PL"));
}

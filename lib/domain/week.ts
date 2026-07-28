import type { WaterStatus } from "./water";

/**
 * Podsumowanie tygodnia z dziennych danych kalendarza — czysta arytmetyka,
 * żeby przegląd tygodnia i porównanie z poprzednim liczyły się identycznie.
 */

/** Strukturalny wycinek CalendarDay — domena nie zna warstwy zapytań. */
export type WeekSourceDay = {
  date: string;
  sprzedaz: { calls: number; meetingsHeld: number; contracts: number; valuePln: number };
  zdrowie: {
    dosesPlanned: number;
    dosesTaken: number;
    waterStatus: WaterStatus | null;
    goodThings: string | null;
  };
  zadania: { total: number; done: number };
  trening: Array<{ done?: boolean }>;
  nauka: Array<{ done?: boolean }>;
};

export type WeekStats = {
  dosesPlanned: number;
  dosesTaken: number;
  trainingPlanned: number;
  trainingDone: number;
  learningPlanned: number;
  learningDone: number;
  tasksTotal: number;
  tasksDone: number;
  /** Dni z nawodnieniem przynajmniej „w normie". */
  waterDaysOk: number;
  calls: number;
  meetingsHeld: number;
  contracts: number;
  contractsValuePln: number;
  goodThings: Array<{ date: string; text: string }>;
};

export function summarizeWeek(days: WeekSourceDay[]): WeekStats {
  const stats: WeekStats = {
    dosesPlanned: 0,
    dosesTaken: 0,
    trainingPlanned: 0,
    trainingDone: 0,
    learningPlanned: 0,
    learningDone: 0,
    tasksTotal: 0,
    tasksDone: 0,
    waterDaysOk: 0,
    calls: 0,
    meetingsHeld: 0,
    contracts: 0,
    contractsValuePln: 0,
    goodThings: [],
  };

  for (const day of days) {
    stats.dosesPlanned += day.zdrowie.dosesPlanned;
    stats.dosesTaken += day.zdrowie.dosesTaken;
    stats.trainingPlanned += day.trening.length;
    stats.trainingDone += day.trening.filter((entry) => entry.done).length;
    stats.learningPlanned += day.nauka.length;
    stats.learningDone += day.nauka.filter((entry) => entry.done).length;
    stats.tasksTotal += day.zadania.total;
    stats.tasksDone += day.zadania.done;
    if (day.zdrowie.waterStatus === "dobrze" || day.zdrowie.waterStatus === "norma") stats.waterDaysOk += 1;
    stats.calls += day.sprzedaz.calls;
    stats.meetingsHeld += day.sprzedaz.meetingsHeld;
    stats.contracts += day.sprzedaz.contracts;
    stats.contractsValuePln += day.sprzedaz.valuePln;
    if (day.zdrowie.goodThings) stats.goodThings.push({ date: day.date, text: day.zdrowie.goodThings });
  }

  return stats;
}

/** Procent realizacji albo null, gdy nic nie było zaplanowane — brak planu to nie zero. */
export function weekRatio(done: number, planned: number): number | null {
  return planned > 0 ? Math.round((done / planned) * 100) : null;
}

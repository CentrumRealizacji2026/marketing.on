import { DOSE_DONE_THRESHOLD } from "./medication";
import type { WaterStatus } from "./water";

/**
 * Nawyki dnia: leki, woda, trening, nauka. Jedna wspólna skala ocen dnia,
 * z której liczy się serię (streak) i „siłę nawyku" — tak, żeby jeden gorszy
 * dzień nie zerował miesięcy pracy, ale dwa z rzędu już tak.
 */

export type HabitDayStatus = "zaliczony" | "czesciowy" | "pominiety" | "brak-danych";

export type HabitDay = {
  date: string;
  status: HabitDayStatus;
};

/* ------------------------------------------------------------- oceny dnia */

/** Dzień leków: 80% dawek wystarcza (próg wspólny z kalendarzem). Bez planu — dzień przezroczysty. */
export function medsDayStatus(planned: number, taken: number): HabitDayStatus {
  if (planned <= 0) return "brak-danych";
  if (taken / planned >= DOSE_DONE_THRESHOLD) return "zaliczony";
  if (taken > 0) return "czesciowy";
  return "pominiety";
}

/** Dzień wody wprost z progów użytkownika: „dobrze" zalicza, „norma" podtrzymuje. */
export function waterDayStatus(status: WaterStatus | null): HabitDayStatus {
  if (status === null) return "brak-danych";
  if (status === "dobrze") return "zaliczony";
  if (status === "norma") return "czesciowy";
  return "pominiety";
}

/** Dzień treningu: liczy się względem planu — dzień bez planu nie łamie serii. */
export function trainingDayStatus(planned: number, done: number): HabitDayStatus {
  if (planned <= 0) return "brak-danych";
  if (done >= planned) return "zaliczony";
  if (done > 0) return "czesciowy";
  return "pominiety";
}

export function learningDayStatus(planned: number, done: number): HabitDayStatus {
  return trainingDayStatus(planned, done);
}

/* --------------------------------------------------------------- metryki */

/** Waga jednego dnia w średniej wykładniczej — jak w trackerach „siły nawyku". */
const STRENGTH_ALPHA = 0.14;

function score(status: HabitDayStatus): number | null {
  if (status === "zaliczony") return 1;
  if (status === "czesciowy") return 0.5;
  if (status === "pominiety") return 0;
  return null;
}

/**
 * Siła nawyku 0–100: średnia wykładnicza po dniach z planem. Dni „brak-danych"
 * są przezroczyste, więc urlop od planu nie osłabia nawyku, a jedno potknięcie
 * obniża siłę tylko o kilkanaście procent zamiast zerować.
 */
export function habitStrength(days: HabitDay[]): number {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  let strength = 0;
  for (const day of sorted) {
    const value = score(day.status);
    if (value === null) continue;
    strength = strength * (1 - STRENGTH_ALPHA) + value * STRENGTH_ALPHA;
  }
  return Math.round(strength * 100);
}

/**
 * Bieżąca seria, liczona od dziś wstecz. Zaliczony i częściowy wydłużają,
 * dni bez planu są przezroczyste, JEDEN pominięty jest wybaczony (nie liczy
 * się, ale nie zeruje), dwa nie-zaliczone z rzędu kończą serię. Dzisiejszy
 * dzień jeszcze trwa — jego brak wyniku niczego nie przerywa.
 */
export function currentStreak(days: HabitDay[], today?: string): { length: number; forgiven: number } {
  const sorted = [...days].sort((a, b) => b.date.localeCompare(a.date));
  const dzis = today ?? sorted[0]?.date;

  let length = 0;
  let forgiven = 0;
  let pendingMiss = false;

  for (const day of sorted) {
    if (day.status === "brak-danych") continue;
    // Dzisiejszy dzień bez zaliczenia jeszcze się nie skończył — pomijamy.
    if (day.date === dzis && day.status === "pominiety") continue;

    if (day.status === "pominiety") {
      if (pendingMiss) break;
      pendingMiss = true;
      continue;
    }

    if (pendingMiss) {
      pendingMiss = false;
      forgiven += 1;
    }
    length += 1;
  }

  return { length, forgiven };
}

/* --------------------------------------------------- mapowanie z kalendarza */

/** Strukturalny wycinek CalendarDay — domena nie zna warstwy zapytań. */
export type HabitSourceDay = {
  date: string;
  zdrowie: { dosesPlanned: number; dosesTaken: number; waterStatus: WaterStatus | null };
  trening: Array<{ done?: boolean }>;
  nauka: Array<{ done?: boolean }>;
};

export type HabitKey = "leki" | "woda" | "trening" | "nauka";

/** Cztery serie nawyków z dziennych danych kalendarza — jedno źródło dla heatmap i badge'y. */
export function habitDaysFromCalendar(days: HabitSourceDay[]): Record<HabitKey, HabitDay[]> {
  return {
    leki: days.map((day) => ({
      date: day.date,
      status: medsDayStatus(day.zdrowie.dosesPlanned, day.zdrowie.dosesTaken),
    })),
    woda: days.map((day) => ({ date: day.date, status: waterDayStatus(day.zdrowie.waterStatus) })),
    trening: days.map((day) => ({
      date: day.date,
      status: trainingDayStatus(day.trening.length, day.trening.filter((entry) => entry.done).length),
    })),
    nauka: days.map((day) => ({
      date: day.date,
      status: learningDayStatus(day.nauka.length, day.nauka.filter((entry) => entry.done).length),
    })),
  };
}

/** Najdłuższa seria w historii — te same reguły wybaczania co w bieżącej. */
export function bestStreak(days: HabitDay[]): number {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));

  let best = 0;
  let length = 0;
  let pendingMiss = false;

  for (const day of sorted) {
    if (day.status === "brak-danych") continue;

    if (day.status === "pominiety") {
      if (pendingMiss) {
        best = Math.max(best, length);
        length = 0;
        pendingMiss = false;
      } else {
        pendingMiss = true;
      }
      continue;
    }

    pendingMiss = false;
    length += 1;
  }

  return Math.max(best, length);
}

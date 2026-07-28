/**
 * Stan porannego rytuału na pulpicie: rano prosi o intencję, po południu już
 * nie zawraca głowy (zwija się do jednej linijki), a wypełniony pokazuje
 * kompakt. Wypełnić można zawsze — sztywna blokada karałaby za późne wstanie.
 */

export type MorningState = "prosi" | "wypelniony" | "zwiniety";

const MORNING_END_MIN = 12 * 60;

export function morningState(filled: boolean, nowMin: number): MorningState {
  if (filled) return "wypelniony";
  return nowMin < MORNING_END_MIN ? "prosi" : "zwiniety";
}

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const plNumber = new Intl.NumberFormat("pl-PL");

export function formatNumber(value: number | null | undefined, fractionDigits = 0) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("pl-PL", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

/**
 * Kwoty z groszami pokazujemy z groszami — saldo to wartość wpisana przez użytkownika
 * i zaokrąglanie jej wprowadzałoby w błąd. Okrągłe kwoty zostają bez końcówki „,00”.
 */
export function formatMoney(value: number | null | undefined, currency = "PLN") {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const hasFraction = Math.abs(value % 1) > 0.004;
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency,
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: hasFraction ? 2 : 0,
  }).format(value);
}

export function formatCount(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return plNumber.format(value);
}

/** "07:30:00" → "07:30" */
export function formatTime(value: string | null | undefined) {
  if (!value) return null;
  return value.slice(0, 5);
}

export function pluralPl(count: number, one: string, few: string, many: string) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (count === 1) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

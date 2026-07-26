/**
 * Daty dzienne trzymamy jako łańcuchy "YYYY-MM-DD" — dzień w kalendarzu użytkownika
 * nie zależy wtedy od strefy serwera. Jedyne miejsce, gdzie strefa ma znaczenie, to
 * ustalenie, który dzień jest "dzisiaj".
 */

export const DEFAULT_TIMEZONE = "Europe/Warsaw";

export const WEEKDAYS = [
  { value: 1, label: "Poniedziałek", short: "Pn" },
  { value: 2, label: "Wtorek", short: "Wt" },
  { value: 3, label: "Środa", short: "Śr" },
  { value: 4, label: "Czwartek", short: "Cz" },
  { value: 5, label: "Piątek", short: "Pt" },
  { value: 6, label: "Sobota", short: "So" },
  { value: 7, label: "Niedziela", short: "Nd" },
] as const;

export function weekdayLabel(weekday: number) {
  return WEEKDAYS.find((d) => d.value === weekday)?.label ?? "";
}

/** Dzisiejsza data w strefie użytkownika, w formacie "YYYY-MM-DD". */
export function todayInTz(timezone: string = DEFAULT_TIMEZONE, now: Date = new Date()): string {
  try {
    // en-CA formatuje jako YYYY-MM-DD.
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
  } catch {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: DEFAULT_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
  }
}

/** Dzień tygodnia w standardzie ISO: 1 = poniedziałek … 7 = niedziela. */
export function isoWeekday(dateStr: string): number {
  const day = new Date(`${dateStr}T00:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function diffDays(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00Z`).getTime();
  const b = new Date(`${to}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86_400_000);
}

/** Początek tygodnia zawierającego `dateStr` (domyślnie poniedziałek). */
export function startOfWeek(dateStr: string, weekStartsOn = 1): string {
  const current = isoWeekday(dateStr);
  const back = (current - weekStartsOn + 7) % 7;
  return addDays(dateStr, -back);
}

export function startOfMonth(dateStr: string): string {
  return `${dateStr.slice(0, 7)}-01`;
}

/** Lista `count` kolejnych dni kończąca się na `endDate` (włącznie), rosnąco. */
export function lastNDays(endDate: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addDays(endDate, -(count - 1 - i)));
}

export function isWithin(dateStr: string, start: string | null, end: string | null): boolean {
  if (start && dateStr < start) return false;
  if (end && dateStr > end) return false;
  return true;
}

export function addMonths(monthStr: string, months: number): string {
  const [year, month] = monthStr.split("-").map(Number);
  const total = year * 12 + (month - 1) + months;
  const nextYear = Math.floor(total / 12);
  const nextMonth = (total % 12) + 1;
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}`;
}

export function endOfMonth(dateStr: string): string {
  const nextMonthStart = `${addMonths(dateStr.slice(0, 7), 1)}-01`;
  return addDays(nextMonthStart, -1);
}

/**
 * Pełna siatka miesiąca: od początku tygodnia zawierającego pierwszy dzień
 * do końca tygodnia zawierającego ostatni — zawsze pełne wiersze po 7 dni.
 */
export function monthGridDates(monthStr: string, weekStartsOn = 1): string[] {
  const first = `${monthStr}-01`;
  const gridStart = startOfWeek(first, weekStartsOn);
  const last = endOfMonth(first);
  const lastWeekStart = startOfWeek(last, weekStartsOn);
  const gridEnd = addDays(lastWeekStart, 6);

  const total = diffDays(gridStart, gridEnd) + 1;
  return Array.from({ length: total }, (_, i) => addDays(gridStart, i));
}

/** Dni tygodnia w kolejności zależnej od ustawienia „tydzień zaczyna się od”. */
export function orderedWeekdays(weekStartsOn = 1) {
  return Array.from({ length: 7 }, (_, i) => {
    const value = ((weekStartsOn - 1 + i) % 7) + 1;
    return WEEKDAYS.find((day) => day.value === value)!;
  });
}

const plDate = new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long", year: "numeric" });
const plMonth = new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric" });

export function formatMonthPl(monthStr: string): string {
  return plMonth.format(new Date(`${monthStr}-01T00:00:00Z`));
}
const plDateShort = new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "short" });

export function formatDatePl(dateStr: string): string {
  return plDate.format(new Date(`${dateStr}T00:00:00Z`));
}

export function formatDateShortPl(dateStr: string): string {
  return plDateShort.format(new Date(`${dateStr}T00:00:00Z`));
}

/** "Poniedziałek, 26 lipca 2026" */
export function formatFullDatePl(dateStr: string): string {
  return `${weekdayLabel(isoWeekday(dateStr))}, ${formatDatePl(dateStr)}`;
}

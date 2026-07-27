import { addDays } from "./dates";

/**
 * Daty rodzinne. Urodziny i rocznice wracają co roku, więc nie są jedną datą,
 * tylko regułą — najbliższe wystąpienie liczone jest względem dnia dzisiejszego.
 */

export type FamilyEventKind = "rocznica" | "urodziny" | "randka" | "wyjazd" | "wydarzenie";

export const FAMILY_KIND_LABEL: Record<FamilyEventKind, string> = {
  rocznica: "Rocznica",
  urodziny: "Urodziny",
  randka: "Randka",
  wyjazd: "Wspólny wyjazd",
  wydarzenie: "Wydarzenie",
};

export const FAMILY_KIND_OPTIONS = (Object.keys(FAMILY_KIND_LABEL) as FamilyEventKind[]).map((value) => ({
  value,
  label: FAMILY_KIND_LABEL[value],
}));

export type MemberInput = {
  id: string;
  name: string;
  relation?: string | null;
  birthDate?: string | null;
  note?: string | null;
};

export type EventInput = {
  id: string;
  name: string;
  date: string;
  kind: FamilyEventKind;
  recurring: boolean;
  note?: string | null;
};

export type FamilyDate = {
  id: string;
  /** Nazwa widoczna w kalendarzu, np. „Urodziny — Ania". */
  label: string;
  name: string;
  kind: FamilyEventKind;
  /** Data najbliższego (albo przypadającego w zakresie) wystąpienia. */
  date: string;
  daysUntil: number;
  /** Który to rok — wiek przy urodzinach, numer rocznicy przy rocznicy. */
  ordinal: number | null;
  note: string | null;
};

function diffDays(from: string, to: string): number {
  const a = Date.UTC(Number(from.slice(0, 4)), Number(from.slice(5, 7)) - 1, Number(from.slice(8, 10)));
  const b = Date.UTC(Number(to.slice(0, 4)), Number(to.slice(5, 7)) - 1, Number(to.slice(8, 10)));
  return Math.round((b - a) / 86_400_000);
}

/**
 * Data rocznicowa przeniesiona na wskazany rok. 29 lutego w roku nieprzestępnym
 * wypada 28 lutego — inaczej co cztery lata ktoś nie miałby urodzin.
 */
function onYear(date: string, year: number): string {
  const month = Number(date.slice(5, 7));
  const day = Number(date.slice(8, 10));
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const safeDay = Math.min(day, lastDay);
  return `${year}-${String(month).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`;
}

/** Najbliższe wystąpienie daty powtarzanej co roku, licząc od dziś włącznie. */
export function nextAnnualOccurrence(date: string, today: string): string {
  const year = Number(today.slice(0, 4));
  const thisYear = onYear(date, year);
  return thisYear >= today ? thisYear : onYear(date, year + 1);
}

/** Wszystkie wystąpienia daty w zakresie — jedno dla jednorazowej, po jednym na rok dla powtarzanej. */
export function occurrencesInRange(date: string, recurring: boolean, from: string, to: string): string[] {
  if (!recurring) return date >= from && date <= to ? [date] : [];

  const dates: string[] = [];
  for (let year = Number(from.slice(0, 4)); year <= Number(to.slice(0, 4)); year += 1) {
    const candidate = onYear(date, year);
    if (candidate >= from && candidate <= to) dates.push(candidate);
  }
  return dates;
}

function ordinalFor(originalDate: string, occurrence: string): number | null {
  const years = Number(occurrence.slice(0, 4)) - Number(originalDate.slice(0, 4));
  return years > 0 ? years : null;
}

/** Daty rodzinne wypadające w zakresie — dla kalendarza. */
export function familyDatesInRange(
  members: MemberInput[],
  events: EventInput[],
  from: string,
  to: string,
  today: string,
): FamilyDate[] {
  const result: FamilyDate[] = [];

  for (const member of members) {
    if (!member.birthDate) continue;
    for (const date of occurrencesInRange(member.birthDate, true, from, to)) {
      result.push({
        id: `${member.id}-${date}`,
        label: `Urodziny — ${member.name}`,
        name: member.name,
        kind: "urodziny",
        date,
        daysUntil: diffDays(today, date),
        ordinal: ordinalFor(member.birthDate, date),
        note: member.note ?? null,
      });
    }
  }

  for (const event of events) {
    for (const date of occurrencesInRange(event.date, event.recurring, from, to)) {
      result.push({
        id: `${event.id}-${date}`,
        label: event.name,
        name: event.name,
        kind: event.kind,
        date,
        daysUntil: diffDays(today, date),
        ordinal: event.recurring ? ordinalFor(event.date, date) : null,
        note: event.note ?? null,
      });
    }
  }

  return result.sort((a, b) => (a.date === b.date ? a.label.localeCompare(b.label, "pl") : a.date < b.date ? -1 : 1));
}

/** Najbliższe daty rodzinne w horyzoncie — dla kafelka i strony rodziny. */
export function upcomingFamilyDates(
  members: MemberInput[],
  events: EventInput[],
  today: string,
  horizonDays = 90,
): FamilyDate[] {
  return familyDatesInRange(members, events, today, addDays(today, horizonDays), today);
}

/** „za 3 dni", „dziś", „jutro" — ten sam język, co w odliczaniu. */
export function describeFamilyDate(date: FamilyDate): string {
  if (date.daysUntil === 0) return "dziś";
  if (date.daysUntil === 1) return "jutro";
  if (date.daysUntil < 0) return `${Math.abs(date.daysUntil)} dni temu`;
  return `za ${date.daysUntil} ${date.daysUntil === 1 ? "dzień" : "dni"}`;
}

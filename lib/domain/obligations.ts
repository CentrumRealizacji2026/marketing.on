import { addDays, isoWeekday } from "./dates";

/**
 * Płatności cykliczne. Zobowiązanie opisuje kwotę i rytm, a terminy powstają
 * z pierwszej daty — nie są przechowywane w bazie, bo wtedy zmiana kwoty albo
 * okresu wymagałaby przepisywania przyszłości.
 */

export type Cadence = "jednorazowo" | "tygodniowo" | "miesiecznie" | "kwartalnie" | "polrocznie" | "rocznie";

export const CADENCE_LABEL: Record<Cadence, string> = {
  jednorazowo: "jednorazowo",
  tygodniowo: "co tydzień",
  miesiecznie: "co miesiąc",
  kwartalnie: "co kwartał",
  polrocznie: "co pół roku",
  rocznie: "co rok",
};

export const CADENCE_OPTIONS = (Object.keys(CADENCE_LABEL) as Cadence[]).map((value) => ({
  value,
  label: CADENCE_LABEL[value],
}));

/** Ile razy w roku wypada płatność. Jednorazowa nie jest kosztem stałym. */
const PER_YEAR: Record<Cadence, number> = {
  jednorazowo: 0,
  tygodniowo: 52,
  miesiecznie: 12,
  kwartalnie: 4,
  polrocznie: 2,
  rocznie: 1,
};

export type ObligationInput = {
  id: string;
  name: string;
  amountPln: number;
  category?: string | null;
  cadence: Cadence;
  firstDueDate: string;
  endDate?: string | null;
  active?: boolean;
};

export type PaymentStatus = "zaplacone" | "do-zaplaty" | "zalegle";

export type PaymentOccurrence = {
  obligationId: string;
  name: string;
  category: string | null;
  dueDate: string;
  amountPln: number;
  status: PaymentStatus;
  paidOn: string | null;
  cadence: Cadence;
};

/** Miesiąc ma różną długość — 31 stycznia + miesiąc to 28 lutego, nie 3 marca. */
function addMonths(iso: string, months: number, anchorDay: number): string {
  const year = Number(iso.slice(0, 4));
  const month = Number(iso.slice(5, 7)) - 1;
  const target = new Date(Date.UTC(year, month + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(anchorDay, lastDay));
  return target.toISOString().slice(0, 10);
}

function stepFor(cadence: Cadence): { months: number; days: number } {
  switch (cadence) {
    case "tygodniowo":
      return { months: 0, days: 7 };
    case "miesiecznie":
      return { months: 1, days: 0 };
    case "kwartalnie":
      return { months: 3, days: 0 };
    case "polrocznie":
      return { months: 6, days: 0 };
    case "rocznie":
      return { months: 12, days: 0 };
    case "jednorazowo":
      return { months: 0, days: 0 };
  }
}

const MAX_OCCURRENCES = 400;

/**
 * Terminy płatności zobowiązania w przedziale [from, to]. Zwraca daty rosnąco,
 * z pominięciem tych po zakończeniu zobowiązania.
 */
export function obligationOccurrences(obligation: ObligationInput, from: string, to: string): string[] {
  if (obligation.active === false) return [];
  const { cadence, firstDueDate, endDate } = obligation;
  const last = endDate && endDate < to ? endDate : to;
  if (firstDueDate > last) return [];

  if (cadence === "jednorazowo") {
    return firstDueDate >= from && firstDueDate <= last ? [firstDueDate] : [];
  }

  const anchorDay = Number(firstDueDate.slice(8, 10));
  const step = stepFor(cadence);
  const dates: string[] = [];

  let current = firstDueDate;
  for (let i = 0; i < MAX_OCCURRENCES && current <= last; i += 1) {
    if (current >= from) dates.push(current);
    current =
      step.days > 0 ? addDays(current, step.days) : addMonths(firstDueDate, (i + 1) * step.months, anchorDay);
  }

  return dates;
}

/**
 * Terminy wszystkich zobowiązań w przedziale, ze statusem. Zapłacone rozpoznawane
 * są po wpisie w `payments`; termin miniony bez wpisu to zaległość.
 */
export function paymentsInRange(
  obligations: ObligationInput[],
  payments: Array<{ obligationId: string; dueDate: string; paidOn: string | null; amountPln?: number | null }>,
  from: string,
  to: string,
  today: string,
): PaymentOccurrence[] {
  const paid = new Map(payments.map((p) => [`${p.obligationId}|${p.dueDate}`, p]));
  const result: PaymentOccurrence[] = [];

  for (const obligation of obligations) {
    for (const dueDate of obligationOccurrences(obligation, from, to)) {
      const record = paid.get(`${obligation.id}|${dueDate}`);
      const isPaid = Boolean(record?.paidOn);
      result.push({
        obligationId: obligation.id,
        name: obligation.name,
        category: obligation.category ?? null,
        dueDate,
        amountPln: record?.amountPln ?? obligation.amountPln,
        status: isPaid ? "zaplacone" : dueDate < today ? "zalegle" : "do-zaplaty",
        paidOn: record?.paidOn ?? null,
        cadence: obligation.cadence,
      });
    }
  }

  return result.sort((a, b) => (a.dueDate === b.dueDate ? a.name.localeCompare(b.name, "pl") : a.dueDate < b.dueDate ? -1 : 1));
}

/** Koszt zobowiązania sprowadzony do miesiąca — podstawa sumy kosztów stałych. */
export function monthlyCostPln(obligation: ObligationInput): number {
  const perYear = PER_YEAR[obligation.cadence];
  if (perYear === 0) return 0;
  return Math.round(((obligation.amountPln * perYear) / 12) * 100) / 100;
}

export type ObligationsSummary = {
  monthlyPln: number;
  yearlyPln: number;
  oneOffPln: number;
  byCategory: Array<{ category: string; monthlyPln: number }>;
  count: number;
};

/**
 * Podsumowanie kosztów stałych. Płatności jednorazowe są liczone osobno, bo
 * doliczenie ich do miesięcznego rachunku zawyżałoby stałe obciążenie.
 */
export function summarizeObligations(obligations: ObligationInput[], today?: string): ObligationsSummary {
  const live = obligations.filter(
    (o) => o.active !== false && (!today || !o.endDate || o.endDate >= today),
  );

  const monthlyPln = Math.round(live.reduce((sum, o) => sum + monthlyCostPln(o), 0) * 100) / 100;
  const oneOffPln =
    Math.round(
      live.filter((o) => o.cadence === "jednorazowo").reduce((sum, o) => sum + o.amountPln, 0) * 100,
    ) / 100;

  const byCategoryMap = new Map<string, number>();
  for (const obligation of live) {
    const cost = monthlyCostPln(obligation);
    if (cost === 0) continue;
    const key = obligation.category?.trim() || "bez kategorii";
    byCategoryMap.set(key, Math.round(((byCategoryMap.get(key) ?? 0) + cost) * 100) / 100);
  }

  return {
    monthlyPln,
    yearlyPln: Math.round(monthlyPln * 12 * 100) / 100,
    oneOffPln,
    byCategory: [...byCategoryMap.entries()]
      .map(([category, monthly]) => ({ category, monthlyPln: monthly }))
      .sort((a, b) => b.monthlyPln - a.monthlyPln),
    count: live.length,
  };
}

/** Etykieta terminu widoczna w kafelku: „dziś", „jutro", „za 3 dni", „5 dni po terminie". */
export function dueLabel(dueDate: string, today: string): string {
  const diff = Math.round(
    (Date.UTC(
      Number(dueDate.slice(0, 4)),
      Number(dueDate.slice(5, 7)) - 1,
      Number(dueDate.slice(8, 10)),
    ) -
      Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1, Number(today.slice(8, 10)))) /
      86_400_000,
  );

  if (diff === 0) return "dziś";
  if (diff === 1) return "jutro";
  if (diff === -1) return "wczoraj";
  if (diff > 0) return `za ${diff} dni`;
  return `${Math.abs(diff)} dni po terminie`;
}

/**
 * Najbliższa NIEOPŁACONA płatność w horyzoncie kilku dni — pod alert
 * „za 3 dni schodzi rata", zanim termin zaskoczy saldo.
 */
export function upcomingPaymentAlert(
  payments: PaymentOccurrence[],
  today: string,
  horizonDays = 3,
): PaymentOccurrence | null {
  const candidates = payments
    .filter((payment) => payment.status === "do-zaplaty" && payment.dueDate >= today)
    .filter((payment) => {
      const diff = Math.round(
        (Date.UTC(
          Number(payment.dueDate.slice(0, 4)),
          Number(payment.dueDate.slice(5, 7)) - 1,
          Number(payment.dueDate.slice(8, 10)),
        ) -
          Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1, Number(today.slice(8, 10)))) /
          86_400_000,
      );
      return diff >= 0 && diff <= horizonDays;
    })
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  return candidates[0] ?? null;
}

/** Pomocnicze przy podpowiadaniu dnia miesiąca — używane w opisach zobowiązań. */
export function cadenceDescription(obligation: ObligationInput): string {
  const day = Number(obligation.firstDueDate.slice(8, 10));
  switch (obligation.cadence) {
    case "jednorazowo":
      return `jednorazowo ${obligation.firstDueDate}`;
    case "tygodniowo":
      return `co tydzień, ${["pon.", "wt.", "śr.", "czw.", "pt.", "sob.", "niedz."][isoWeekday(obligation.firstDueDate) - 1]}`;
    default:
      return `${CADENCE_LABEL[obligation.cadence]}, ${day}. dnia`;
  }
}

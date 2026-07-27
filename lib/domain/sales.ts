export type SalesTotals = {
  calls: number;
  meetingsScheduled: number;
  meetingsHeld: number;
  contracts: number;
  valuePln: number;
};

export const EMPTY_SALES: SalesTotals = {
  calls: 0,
  meetingsScheduled: 0,
  meetingsHeld: 0,
  contracts: 0,
  valuePln: 0,
};

export function sumSales(rows: Array<Partial<SalesTotals>>): SalesTotals {
  return rows.reduce<SalesTotals>(
    (acc, row) => ({
      calls: acc.calls + (row.calls ?? 0),
      meetingsScheduled: acc.meetingsScheduled + (row.meetingsScheduled ?? 0),
      meetingsHeld: acc.meetingsHeld + (row.meetingsHeld ?? 0),
      contracts: acc.contracts + (row.contracts ?? 0),
      valuePln: acc.valuePln + (row.valuePln ?? 0),
    }),
    { ...EMPTY_SALES },
  );
}

function ratio(numerator: number, denominator: number): number | null {
  if (!denominator) return null;
  return numerator / denominator;
}

/** Lejek: rozmowa → umówione spotkanie → odbyte spotkanie → umowa. */
export function conversionRates(totals: SalesTotals) {
  return {
    callToScheduled: ratio(totals.meetingsScheduled, totals.calls),
    scheduledToHeld: ratio(totals.meetingsHeld, totals.meetingsScheduled),
    heldToContract: ratio(totals.contracts, totals.meetingsHeld),
    callToContract: ratio(totals.contracts, totals.calls),
  };
}

export function averageContractValue(totals: SalesTotals): number | null {
  return totals.contracts > 0 ? totals.valuePln / totals.contracts : null;
}

export function formatPercent(value: number | null): string {
  if (value === null) return "—";
  return `${new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 }).format(value * 100)}%`;
}

/** Postęp względem celu; null gdy cel nie został ustawiony w kreatorze. */
export function goalProgress(actual: number, goal: number | null | undefined) {
  if (!goal || goal <= 0) return null;
  return { actual, goal, pct: Math.round((actual / goal) * 100) };
}

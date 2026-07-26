/**
 * Skąd wiadomo, ile tego dnia ubyło albo przybyło środków.
 *
 * `raport` — użytkownik wpisał kwoty wydane i te, które wpłynęły. To źródło jest
 * pewne: mówi nie tylko o wyniku dnia, ale też o tym, ile realnie wyszło z kieszeni,
 * nawet jeśli tego samego dnia wpłynęło tyle samo.
 *
 * `saldo` — kwot nie ma, więc zmiana jest wyliczona z różnicy między kolejnymi
 * wpisami stanu środków. Pokazuje wynik netto i nic ponadto.
 */
export type CashFlowSource = "raport" | "saldo";

export type DayCashFlow = {
  /** Wydane tego dnia (dodatnia liczba) albo null, gdy nie podano. */
  expensesPln: number | null;
  /** To, co wpłynęło (dodatnia liczba) albo null, gdy nie podano. */
  incomePln: number | null;
  /** Wynik dnia: dodatni = przybyło, ujemny = ubyło. */
  netPln: number | null;
  source: CashFlowSource | null;
};

export type CashFlowInput = {
  expensesPln?: number | null;
  incomePln?: number | null;
  /** Różnica stanu środków względem poprzedniego wpisu — używana, gdy kwot brak. */
  balanceChangePln?: number | null;
};

/** Kwoty trzymamy bez znaku; minus na wydatkach to sprawa prezentacji, nie danych. */
function positiveOrNull(value: number | null | undefined): number | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return Math.abs(value);
}

/**
 * Wynik finansowy dnia. Wpisane kwoty mają pierwszeństwo przed różnicą sald —
 * dzień, w którym wydano 300 i wpłynęło 300, ma zerowy wynik, ale wydatek zostaje
 * widoczny, czego z samego salda nie dałoby się odczytać.
 */
export function dayCashFlow(input: CashFlowInput): DayCashFlow {
  const expensesPln = positiveOrNull(input.expensesPln);
  const incomePln = positiveOrNull(input.incomePln);

  if (expensesPln !== null || incomePln !== null) {
    return {
      expensesPln,
      incomePln,
      netPln: (incomePln ?? 0) - (expensesPln ?? 0),
      source: "raport",
    };
  }

  const balanceChangePln = input.balanceChangePln;
  if (balanceChangePln === null || balanceChangePln === undefined || !Number.isFinite(balanceChangePln)) {
    return { expensesPln: null, incomePln: null, netPln: null, source: null };
  }

  return { expensesPln: null, incomePln: null, netPln: balanceChangePln, source: "saldo" };
}

/** Suma wydatków z dni, w których je zapisano. Dni bez wpisu nie są liczone jako zero. */
export function sumExpenses(flows: DayCashFlow[]): { totalPln: number; days: number } {
  const reported = flows.filter((flow) => flow.expensesPln !== null);
  return {
    totalPln: reported.reduce((sum, flow) => sum + flow.expensesPln!, 0),
    days: reported.length,
  };
}

/** To samo dla wpływów — żeby średnie liczyły się z dni z danymi, a nie z całego okresu. */
export function sumIncome(flows: DayCashFlow[]): { totalPln: number; days: number } {
  const reported = flows.filter((flow) => flow.incomePln !== null);
  return {
    totalPln: reported.reduce((sum, flow) => sum + flow.incomePln!, 0),
    days: reported.length,
  };
}

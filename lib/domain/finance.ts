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

/* ------------------------------------------------------ stan środków na żywo */

/** Dzienny wiersz w zakresie potrzebnym do wyliczenia salda na żywo. */
export type BalanceRow = {
  date: string;
  /** Ręcznie wpisany stan środków (raport / kreator) albo null. */
  cashBalancePln: number | null;
  /** Wynik dnia w chwili wpisu stanu; null w starych wpisach = wpis sprzed przepływów. */
  cashBalanceNetPln: number | null;
  incomePln: number | null;
  expensesPln: number | null;
};

export type LiveBalance = {
  /** Stan na teraz: ostatni wpis + przepływy, które doszły po nim. */
  valuePln: number;
  anchorDate: string;
  anchorBalancePln: number;
  /** Suma doliczonych przepływów: valuePln − anchorBalancePln. */
  flowNetPln: number;
  /** Ile dni dołożyło przepływy po wpisie stanu. */
  flowDays: number;
};

/**
 * Wynik dnia z WPISANYCH kwot — celowo bez fallbacku na różnicę sald,
 * bo różnice sald nie mogą napędzać salda wyliczanego z tych samych sald.
 */
function typedDayNet(row: BalanceRow): number | null {
  return dayCashFlow({ expensesPln: row.expensesPln, incomePln: row.incomePln }).netPln;
}

/** Sumy groszy w zmiennym przecinku dryfują — zaokrąglamy jak parser szybkiego dodawania. */
function roundGrosze(value: number): number {
  return Math.round(value * 100) / 100;
}

const byDateAsc = (a: BalanceRow, b: BalanceRow) => a.date.localeCompare(b.date);

/**
 * Stan środków na żywo: ostatni wpisany stan (kotwica) plus przepływy, które
 * doszły po nim. Z dnia kotwicy liczy się tylko nadwyżka ponad netto zapisane
 * w chwili wpisu — to, co użytkownik dodał już PO podaniu stanu.
 */
export function liveBalance(rows: BalanceRow[]): LiveBalance | null {
  const sorted = [...rows].sort(byDateAsc);

  let anchorIndex = -1;
  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    if (sorted[i].cashBalancePln !== null) {
      anchorIndex = i;
      break;
    }
  }
  if (anchorIndex === -1) return null;

  const anchor = sorted[anchorIndex];
  const anchorAdjustment = (typedDayNet(anchor) ?? 0) - (anchor.cashBalanceNetPln ?? 0);

  const after = sorted.slice(anchorIndex + 1);
  const flowNet = anchorAdjustment + after.reduce((sum, row) => sum + (typedDayNet(row) ?? 0), 0);
  const flowDays = after.filter((row) => typedDayNet(row) !== null).length + (anchorAdjustment !== 0 ? 1 : 0);

  return {
    valuePln: roundGrosze(anchor.cashBalancePln! + flowNet),
    anchorDate: anchor.date,
    anchorBalancePln: anchor.cashBalancePln!,
    flowNetPln: roundGrosze(flowNet),
    flowDays,
  };
}

/* --------------------------------------------- słupki wpływów i wydatków */

export type PlannedPayment = { name: string; amountPln: number; dueDate: string };

export type FlowColumn = {
  date: string;
  /** Wpłynęło tego dnia (dodatnia liczba) albo null, gdy brak danych. */
  inPln: number | null;
  /** Wydane tego dnia (dodatnia liczba) albo null, gdy brak danych. */
  outPln: number | null;
  /** Suma nieopłaconych płatności z terminem tego dnia — plan, nie przepływ. */
  plannedOutPln: number | null;
  /** Nazwy zaplanowanych płatności — do podpisu słupka. */
  paymentNames: string[];
  /** Skąd przepływy: wpisane kwoty czy różnica sald; null = brak wpisu. */
  source: CashFlowSource | null;
  /** Dzień przyszły — przepływów jeszcze nie ma, może być tylko plan. */
  future: boolean;
};

/**
 * Kolumny pod wykres słupkowy przepływów: historia dzień po dniu (wpływy
 * i wydatki osobno) plus najbliższe dni. Nieopłacone płatności wiszą na dniu
 * swojego terminu — także dzisiejszym, żeby rata nie znikała w dniu, w którym
 * schodzi. Dzień znany tylko z różnicy sald pokazuje netto po właściwej
 * stronie i zachowuje source "saldo" — zero zmiany to wciąż wpis, nie dziura.
 */
export function flowColumns(input: {
  historyDates: string[];
  flows: Array<{ date: string; flow: DayCashFlow }>;
  futureDates: string[];
  plannedPayments: PlannedPayment[];
}): FlowColumn[] {
  const byDate = new Map(input.flows.map((entry) => [entry.date, entry.flow]));

  const plan = (date: string) => {
    const due = input.plannedPayments.filter((payment) => payment.dueDate === date);
    return {
      plannedOutPln:
        due.length > 0 ? roundGrosze(due.reduce((sum, payment) => sum + payment.amountPln, 0)) : null,
      paymentNames: due.map((payment) => payment.name),
    };
  };

  const history = input.historyDates.map((date): FlowColumn => {
    const flow = byDate.get(date);
    const bazowa = { date, inPln: null, outPln: null, source: null, future: false, ...plan(date) };
    if (!flow || flow.netPln === null) return bazowa;
    if (flow.source === "saldo") {
      return {
        ...bazowa,
        inPln: flow.netPln > 0 ? roundGrosze(flow.netPln) : null,
        outPln: flow.netPln < 0 ? roundGrosze(-flow.netPln) : null,
        source: "saldo",
      };
    }
    return { ...bazowa, inPln: flow.incomePln, outPln: flow.expensesPln, source: "raport" };
  });

  const future = input.futureDates.map(
    (date): FlowColumn => ({ date, inPln: null, outPln: null, source: null, future: true, ...plan(date) }),
  );

  return [...history, ...future];
}

/**
 * Dzienna seria salda na żywo pod wykres: przed pierwszym wpisem null, dzień
 * wpisu resetuje bieg do podanego stanu (plus to, co doszło po wpisie), kolejne
 * dni dziedziczą wartość powiększoną o swoje przepływy. `rows` mogą zaczynać się
 * przed `dates[0]` — najpierw ustalają wartość na starcie okna.
 */
export function liveBalanceSeries(rows: BalanceRow[], dates: string[]): Array<number | null> {
  const sorted = [...rows].sort(byDateAsc);
  const byDate = new Map(sorted.map((row) => [row.date, row]));

  let running: number | null = null;
  const apply = (row: BalanceRow) => {
    if (row.cashBalancePln !== null) {
      running = row.cashBalancePln + ((typedDayNet(row) ?? 0) - (row.cashBalanceNetPln ?? 0));
    } else if (running !== null) {
      running += typedDayNet(row) ?? 0;
    }
  };

  const windowStart = dates[0] ?? "";
  for (const row of sorted) {
    if (row.date < windowStart) apply(row);
  }

  return dates.map((date) => {
    const row = byDate.get(date);
    if (row) apply(row);
    return running === null ? null : roundGrosze(running);
  });
}

/**
 * Lejek „do podpisania": klienci, z którymi umowa jeszcze nie jest zamknięta,
 * i szacowana kwota przy każdym z nich.
 */

export type DealStage = "do-podpisania" | "podpisana" | "przepadla";

export const DEAL_STAGE_LABEL: Record<DealStage, string> = {
  "do-podpisania": "Do podpisania",
  podpisana: "Podpisana",
  przepadla: "Przepadła",
};

export const DEAL_STAGE_OPTIONS = (Object.keys(DEAL_STAGE_LABEL) as DealStage[]).map((value) => ({
  value,
  label: DEAL_STAGE_LABEL[value],
}));

export type DealInput = {
  id?: string;
  clientName: string;
  valuePln: number;
  stage: DealStage;
  expectedDate?: string | null;
};

export type DealsSummary = {
  /** Ile kontraktów czeka na podpis. */
  open: number;
  /** Suma szacowanych kwot z otwartych pozycji. */
  openPln: number;
  won: number;
  wonPln: number;
  lost: number;
  lostPln: number;
  /** Odsetek zamkniętych, które udało się podpisać. */
  winRate: number | null;
};

/**
 * Podsumowanie tabeli. Do sumy „do zdobycia" wchodzą wyłącznie pozycje otwarte —
 * podpisane liczą się już w kontraktach, a przepadłe nie liczą się nigdzie.
 */
export function summarizeDeals(deals: DealInput[]): DealsSummary {
  const open = deals.filter((deal) => deal.stage === "do-podpisania");
  const won = deals.filter((deal) => deal.stage === "podpisana");
  const lost = deals.filter((deal) => deal.stage === "przepadla");
  const closed = won.length + lost.length;

  const sum = (list: DealInput[]) => Math.round(list.reduce((total, deal) => total + deal.valuePln, 0) * 100) / 100;

  return {
    open: open.length,
    openPln: sum(open),
    won: won.length,
    wonPln: sum(won),
    lost: lost.length,
    lostPln: sum(lost),
    winRate: closed > 0 ? Math.round((won.length / closed) * 100) : null,
  };
}

/** Ile pustych wierszy pokazać w świeżej tabeli, zanim cokolwiek zostanie wpisane. */
export const DEALS_STARTING_ROWS = 10;

/* --------------------------------------------------------- stygnące szanse */

/** Po ilu dniach ciszy otwarta szansa zaczyna „stygnąć". */
export const STALE_AFTER_DAYS = 5;

function toDateString(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  return typeof value === "string" ? value.slice(0, 10) : value.toISOString().slice(0, 10);
}

/**
 * Szansa stygnie, gdy zaplanowana akcja minęła bez wykonania (zaplanowałeś
 * i nie zrobiłeś) albo gdy od ostatniego ruchu minęło ponad 5 dni. Zamknięte
 * pozycje nie stygną — nie ma już czego pilnować.
 */
export function isDealStale(
  deal: {
    stage: DealStage;
    nextActionDate?: string | null;
    touchedAt?: Date | string | null;
    createdAt?: Date | string | null;
  },
  today: string,
): boolean {
  if (deal.stage !== "do-podpisania") return false;

  if (deal.nextActionDate) return deal.nextActionDate < today;

  const lastTouch = toDateString(deal.touchedAt) ?? toDateString(deal.createdAt);
  if (!lastTouch) return false;

  const [y, m, d] = lastTouch.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  const diff = Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(y, m - 1, d)) / 86_400_000);
  return diff > STALE_AFTER_DAYS;
}

/**
 * Prognoza przychodu z lejka: otwarta kwota × szansa wygranej. Stawka z własnej
 * historii (winRate z zamkniętych pozycji), zapasowo z konwersji spotkanie→umowa,
 * a bez żadnych danych — uczciwe 50%.
 */
export function pipelineForecast(
  summary: DealsSummary,
  heldToContract: number | null,
): { expectedPln: number; rate: number; source: "winRate" | "konwersja" | "domyslna" } {
  // winRate jest w procentach (0–100), konwersja ułamkiem — normalizujemy do ułamka.
  const rate =
    summary.winRate !== null
      ? summary.winRate / 100
      : heldToContract !== null
        ? Math.min(Math.max(heldToContract, 0), 1)
        : 0.5;
  const source = summary.winRate !== null ? "winRate" : heldToContract !== null ? "konwersja" : "domyslna";

  return {
    expectedPln: Math.round(summary.openPln * rate * 100) / 100,
    rate,
    source,
  };
}

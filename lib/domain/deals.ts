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

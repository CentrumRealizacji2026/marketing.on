/**
 * Gdzie stawia Cię to, co zarabiasz — na tle świata i na tle Polski.
 *
 * To szacunek, nie pomiar. Model opiera się na trzech opublikowanych progach
 * rozkładu światowego i trzech krajowych, a między nimi (i powyżej) interpoluje
 * rozkładem Pareto, który dobrze opisuje górną część rozkładów dochodu.
 *
 * Źródła kotwic:
 * — świat: World Inequality Report 2026 (WID.world), dochód przed opodatkowaniem
 *   na dorosłego, dolary PPP: mediana ≈ 6 000 $/rok (połowa dorosłych żyje
 *   z mniej niż 500 $/mies.), próg górnych 10% = 65 500 $/rok, próg górnego
 *   1% = 250 300 $/rok.
 * — Polska: GUS, mediana wynagrodzeń miesięcznych brutto, styczeń 2026:
 *   decyl 1 = 4 806 zł, mediana = 7 447,16 zł, decyl 9 = 15 500 zł.
 *
 * Ograniczenia, o których mówi też interfejs:
 * — dane światowe dotyczą dochodu brutto na dorosłego, więc porównujemy kwoty brutto;
 * — rozkład GUS obejmuje zatrudnionych w podmiotach powyżej 9 osób, więc nie ma
 *   w nim przedsiębiorców — dla właściciela firmy to punkt odniesienia, nie ranking;
 * — przelicznik PPP jest przybliżony, ale w górnej części rozkładu błąd rzędu
 *   kilkunastu procent przesuwa wynik o ułamek punktu procentowego.
 */

/** Ile złotych odpowiada jednemu dolarowi międzynarodowemu (PPP). */
export const PLN_PER_PPP_USD = 2.0;

/** [percentyl, roczny dochód brutto na dorosłego w dolarach PPP] */
const WORLD_ANCHORS: Array<[number, number]> = [
  [50, 6000],
  [90, 65500],
  [99, 250300],
];

/** [percentyl, miesięczne wynagrodzenie brutto w zł] */
const POLAND_ANCHORS: Array<[number, number]> = [
  [10, 4806],
  [50, 7447.16],
  [90, 15500],
];

export type Distribution = "swiat" | "polska";

export type RankPoint = {
  /** Ilu procent osób w rozkładzie zarabia mniej. */
  percentile: number;
  /** Dopełnienie percentyla: „górne X%". */
  topPct: number;
};

/**
 * Interpolacja liniowa w układzie log(dochód) ↔ log(udział powyżej). W takim
 * układzie górna część rozkładu dochodu jest w przybliżeniu prostą (Pareto),
 * więc ta sama formuła działa i między kotwicami, i powyżej najwyższej z nich.
 */
function percentileFromAnchors(value: number, anchors: Array<[number, number]>): number | null {
  if (!Number.isFinite(value) || value <= 0) return null;

  const points = anchors.map(([p, income]) => ({
    x: Math.log(income),
    // log udziału osób powyżej danego progu
    y: Math.log(1 - p / 100),
  }));

  const x = Math.log(value);

  // Poniżej najniższej kotwicy nie zgadujemy — zwracamy null, a widok mówi „poniżej".
  if (x < points[0].x) return null;

  // Znajdź odcinek, na który trafia wartość; powyżej ostatniego przedłuż ostatni.
  let i = points.length - 2;
  for (let k = 0; k < points.length - 1; k += 1) {
    if (x <= points[k + 1].x) {
      i = k;
      break;
    }
  }

  const slope = (points[i + 1].y - points[i].y) / (points[i + 1].x - points[i].x);
  const y = points[i].y + slope * (x - points[i].x);
  const share = Math.exp(y);

  // Górny kraniec przycinamy: nie twierdzimy, że ktoś jest ostatnią osobą na świecie.
  const percentile = (1 - Math.min(Math.max(share, 1e-9), 1)) * 100;
  return Math.min(percentile, 99.9999);
}

export type IncomeRank = {
  monthlyPln: number;
  annualPln: number;
  /** Roczny dochód przeliczony na dolary PPP — podstawa porównania ze światem. */
  annualPppUsd: number;
  world: RankPoint | null;
  poland: RankPoint | null;
  /** Progi światowe w złotych miesięcznie, żeby dało się je pokazać obok wyniku. */
  worldThresholdsPlnMonthly: { median: number; top10: number; top1: number };
  polandThresholdsPlnMonthly: { median: number; top10: number };
};

/** Miesięczny dochód brutto w złotych → pozycja w rozkładzie światowym i krajowym. */
export function incomeRank(monthlyPln: number): IncomeRank {
  const annualPln = monthlyPln * 12;
  const annualPppUsd = annualPln / PLN_PER_PPP_USD;

  const worldPercentile = percentileFromAnchors(annualPppUsd, WORLD_ANCHORS);
  const polandPercentile = percentileFromAnchors(monthlyPln, POLAND_ANCHORS);

  const toPln = (annualUsd: number) => (annualUsd * PLN_PER_PPP_USD) / 12;

  return {
    monthlyPln,
    annualPln,
    annualPppUsd,
    world: worldPercentile === null ? null : { percentile: worldPercentile, topPct: 100 - worldPercentile },
    poland: polandPercentile === null ? null : { percentile: polandPercentile, topPct: 100 - polandPercentile },
    worldThresholdsPlnMonthly: {
      median: toPln(WORLD_ANCHORS[0][1]),
      top10: toPln(WORLD_ANCHORS[1][1]),
      top1: toPln(WORLD_ANCHORS[2][1]),
    },
    polandThresholdsPlnMonthly: {
      median: POLAND_ANCHORS[1][1],
      top10: POLAND_ANCHORS[2][1],
    },
  };
}

/**
 * „Górne 0,11%" albo „górne 12%" — im wyżej, tym więcej miejsc po przecinku,
 * bo różnica między 1% a 0,1% jest dziesięciokrotna, a między 40% a 41% żadna.
 */
export function formatTopPct(topPct: number): string {
  if (topPct < 0.01) return "górne 0,01%";
  if (topPct < 1) return `górne ${topPct.toFixed(2).replace(".", ",")}%`;
  if (topPct < 10) return `górne ${topPct.toFixed(1).replace(".", ",")}%`;
  return `górne ${Math.round(topPct)}%`;
}

/** Zdanie pod liczbą: ilu ludzi zarabia mniej. */
export function describeRank(rank: RankPoint, distribution: Distribution): string {
  const where = distribution === "swiat" ? "dorosłych na świecie" : "zatrudnionych w Polsce";
  const percentile =
    rank.percentile >= 99.99
      ? "ponad 99,99%"
      : rank.percentile >= 99
        ? `${rank.percentile.toFixed(2).replace(".", ",")}%`
        : `${Math.round(rank.percentile)}%`;
  return `Więcej niż ${percentile} ${where}`;
}

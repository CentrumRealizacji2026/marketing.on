/**
 * Korelacje między obszarami życia. Lista par jest kuratorowana — przy ~30
 * dniach danych porównywanie wszystkiego ze wszystkim wyprodukowałoby
 * przypadkowe „odkrycia"; liczymy tylko pary, które mają sens przyczynowy.
 */

export function pearson(
  a: Array<number | null | undefined>,
  b: Array<number | null | undefined>,
): { r: number; n: number } | null {
  const pairs: Array<[number, number]> = [];
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    const x = a[i];
    const y = b[i];
    if (x === null || x === undefined || y === null || y === undefined) continue;
    pairs.push([x, y]);
  }

  const n = pairs.length;
  if (n < 7) return null;

  const meanX = pairs.reduce((sum, [x]) => sum + x, 0) / n;
  const meanY = pairs.reduce((sum, [, y]) => sum + y, 0) / n;

  let cov = 0;
  let varX = 0;
  let varY = 0;
  for (const [x, y] of pairs) {
    cov += (x - meanX) * (y - meanY);
    varX += (x - meanX) ** 2;
    varY += (y - meanY) ** 2;
  }
  if (varX === 0 || varY === 0) return null;

  return { r: cov / Math.sqrt(varX * varY), n };
}

export type CorrelationInsight = {
  aKey: string;
  bKey: string;
  r: number;
  n: number;
  description: string;
  strength: "silna" | "umiarkowana" | "slaba";
};

/** Pary z gotowym językiem kierunku — opis czyta się jak zdanie, nie jak statystyka. */
const PAIRS: Array<{ a: string; b: string; aMore: string; bUp: string; bDown: string }> = [
  { a: "treningZrobiony", b: "nastroj", aMore: "Więcej treningu", bUp: "lepszy nastrój", bDown: "gorszy nastrój" },
  { a: "senH", b: "energia", aMore: "Dłuższy sen", bUp: "więcej energii", bDown: "mniej energii" },
  { a: "senH", b: "nastroj", aMore: "Dłuższy sen", bUp: "lepszy nastrój", bDown: "gorszy nastrój" },
  { a: "stres", b: "nastroj", aMore: "Wyższy stres", bUp: "lepszy nastrój", bDown: "gorszy nastrój" },
  { a: "rozmowy", b: "nastroj", aMore: "Więcej rozmów", bUp: "lepszy nastrój", bDown: "gorszy nastrój" },
  { a: "wodaMl", b: "energia", aMore: "Więcej wody", bUp: "więcej energii", bDown: "mniej energii" },
  { a: "treningZrobiony", b: "senH", aMore: "Więcej treningu", bUp: "dłuższy sen", bDown: "krótszy sen" },
  { a: "wynikDnia", b: "stres", aMore: "Lepszy wynik dnia", bUp: "wyższy stres", bDown: "niższy stres" },
];

/** Poniżej tej siły związek nie jest wart pokazywania. */
const MIN_R = 0.25;

function strengthOf(r: number): CorrelationInsight["strength"] {
  const abs = Math.abs(r);
  if (abs >= 0.6) return "silna";
  if (abs >= 0.4) return "umiarkowana";
  return "slaba";
}

export function correlationInsights(
  serie: Record<string, Array<number | null | undefined>>,
): CorrelationInsight[] {
  const insights: CorrelationInsight[] = [];

  for (const pair of PAIRS) {
    const a = serie[pair.a];
    const b = serie[pair.b];
    if (!a || !b) continue;

    const wynik = pearson(a, b);
    if (!wynik || Math.abs(wynik.r) < MIN_R) continue;

    const rTekst = new Intl.NumberFormat("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
      wynik.r,
    );
    insights.push({
      aKey: pair.a,
      bKey: pair.b,
      r: wynik.r,
      n: wynik.n,
      description: `${pair.aMore} → ${wynik.r > 0 ? pair.bUp : pair.bDown} (r=${rTekst}, ${wynik.n} dni)`,
      strength: strengthOf(wynik.r),
    });
  }

  return insights.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
}

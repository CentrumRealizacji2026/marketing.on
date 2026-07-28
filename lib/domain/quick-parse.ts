import { addDays, isoWeekday } from "./dates";

/**
 * Szybki wpis jednym zdaniem: „paliwo 150" robi koszt, „faktura Nowak 3500"
 * zysk, „zadzwonić do Nowaka jutro priorytet" zadanie. Parser jest prosty
 * i przewidywalny — komunikat po zapisie zawsze mówi, jak wpis zrozumiano.
 */

export type ParsedQuickEntry =
  | { type: "koszt" | "zysk"; amountPln: number; description: string }
  | { type: "zadanie"; title: string; date: string; priority: boolean };

/** Kwota: polski przecinek, spacje tysięcy, opcjonalne zł/pln, opcjonalny plus. */
const AMOUNT_RE = /(^|\s)(\+?)(\d(?:[\d ]*\d)?(?:[.,]\d{1,2})?)(\s?(?:zł|zl|pln))?(?=\s|$)/iu;

/** Słowa oznaczające wpływ — konwencja repo: warianty bez ogonków jako osobne klucze. */
const INCOME_WORDS = new Set([
  "zysk",
  "przychód",
  "przychod",
  "faktura",
  "wpłata",
  "wplata",
  "wpływ",
  "wplyw",
  "zarobek",
  "zarobiłem",
  "zarobilem",
  "zarobione",
]);

/** Słowa dat względnych → przesunięcie w dniach. */
const RELATIVE_DAYS: Record<string, number> = {
  dziś: 0,
  dzis: 0,
  dzisiaj: 0,
  jutro: 1,
  pojutrze: 2,
};

/** Nazwy dni tygodnia (mianownik i biernik, z ogonkami i bez) → ISO 1–7. */
const WEEKDAY_WORDS: Record<string, number> = {
  poniedziałek: 1,
  poniedzialek: 1,
  wtorek: 2,
  środa: 3,
  sroda: 3,
  środę: 3,
  srode: 3,
  czwartek: 4,
  piątek: 5,
  piatek: 5,
  sobota: 6,
  sobotę: 6,
  sobote: 6,
  niedziela: 7,
  niedzielę: 7,
  niedziele: 7,
};

function parseAmountToken(raw: string): number | null {
  const parsed = Number(raw.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 100) / 100 : null;
}

export function parseQuickEntry(text: string, today: string): ParsedQuickEntry | null {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (!trimmed) return null;

  const amountMatch = trimmed.match(AMOUNT_RE);
  const amountPln = amountMatch ? parseAmountToken(amountMatch[3]) : null;

  if (amountMatch && amountPln !== null) {
    // Kwota w tekście = pieniądze. Bez słowa wpływu bezpieczniej założyć koszt —
    // pomyłkowy zysk zawyża statystyki bardziej niż pomyłkowy koszt.
    const start = amountMatch.index! + amountMatch[1].length;
    const end = amountMatch.index! + amountMatch[0].length;
    const description = `${trimmed.slice(0, start)} ${trimmed.slice(end)}`.replace(/\s+/g, " ").trim();

    const lower = description.toLocaleLowerCase("pl-PL");
    const words = new Set(lower.split(" "));
    const isIncome = amountMatch[2] === "+" || [...INCOME_WORDS].some((word) => words.has(word));

    return { type: isIncome ? "zysk" : "koszt", amountPln, description };
  }

  // Bez kwoty: zadanie. Słowa daty i „priorytet" znikają z tytułu.
  const tokens = trimmed.split(" ");
  const lower = tokens.map((token) => token.toLocaleLowerCase("pl-PL"));
  const removed = new Set<number>();

  let date = today;
  let priority = false;

  for (let i = 0; i < tokens.length; i += 1) {
    const word = lower[i];

    if (word === "priorytet") {
      priority = true;
      removed.add(i);
      continue;
    }

    if (word in RELATIVE_DAYS) {
      date = addDays(today, RELATIVE_DAYS[word]);
      removed.add(i);
      continue;
    }

    if (word in WEEKDAY_WORDS) {
      // Najbliższe wystąpienie PO dziś; ten sam dzień tygodnia = za tydzień.
      const delta = (WEEKDAY_WORDS[word] - isoWeekday(today) + 7) % 7 || 7;
      date = addDays(today, delta);
      removed.add(i);
      // „w piątek" / „we wtorek" — przyimek też znika z tytułu.
      if (i > 0 && (lower[i - 1] === "w" || lower[i - 1] === "we")) removed.add(i - 1);
    }
  }

  const title = tokens
    .filter((_, i) => !removed.has(i))
    .join(" ")
    .trim();
  if (!title) return null;

  return { type: "zadanie", title, date, priority };
}

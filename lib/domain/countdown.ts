/**
 * Odliczanie dni do wydarzenia. Cała reguła to różnica dat liczona w dniach
 * kalendarzowych w strefie użytkownika — bez godzin, bo „ile dni do wakacji"
 * nie zmienia się o północy w Londynie.
 */

export type CountdownInput = {
  id: string;
  name: string;
  targetDate: string;
  note?: string | null;
  active?: boolean;
};

export type CountdownState = "przed" | "dzis" | "po";

export type Countdown = {
  id: string;
  name: string;
  targetDate: string;
  note: string | null;
  /** Dni do wydarzenia: dodatnie przed, 0 w dniu, ujemne po. */
  days: number;
  state: CountdownState;
};

function diffDays(from: string, to: string): number {
  const a = Date.UTC(Number(from.slice(0, 4)), Number(from.slice(5, 7)) - 1, Number(from.slice(8, 10)));
  const b = Date.UTC(Number(to.slice(0, 4)), Number(to.slice(5, 7)) - 1, Number(to.slice(8, 10)));
  return Math.round((b - a) / 86_400_000);
}

export function countdownFor(entry: CountdownInput, today: string): Countdown {
  const days = diffDays(today, entry.targetDate);
  return {
    id: entry.id,
    name: entry.name,
    targetDate: entry.targetDate,
    note: entry.note ?? null,
    days,
    state: days > 0 ? "przed" : days === 0 ? "dzis" : "po",
  };
}

/**
 * Najbliższe wydarzenie na górze, minione na końcu. Sortowanie po dacie zrobiłoby
 * to samo tylko dla przyszłości — tu chodzi o to, żeby wczorajszy termin nie
 * przykrywał tego, co dopiero przed nami.
 */
export function sortCountdowns(list: Countdown[]): Countdown[] {
  return [...list].sort((a, b) => {
    const aPast = a.state === "po";
    const bPast = b.state === "po";
    if (aPast !== bPast) return aPast ? 1 : -1;
    return aPast ? b.days - a.days : a.days - b.days;
  });
}

/** „364 dni", „1 dzień", „22 dni" — po polsku „dni" pasuje wszędzie poza jedynką. */
export function formatDaysPl(days: number): string {
  const abs = Math.abs(days);
  return `${abs} ${abs === 1 ? "dzień" : "dni"}`;
}

/** Podpis pod liczbą: „za 2 miesiące", „jutro", „dzisiaj", „14 dni temu". */
export function describeCountdown(countdown: Countdown): string {
  const { days, state } = countdown;
  if (state === "dzis") return "dzisiaj";
  if (days === 1) return "jutro";
  if (days === -1) return "wczoraj";
  if (state === "po") return `${formatDaysPl(days)} temu`;

  if (days < 14) return `za ${formatDaysPl(days)}`;
  if (days < 60) {
    const weeks = Math.round(days / 7);
    return `za ${weeks} ${weeks === 1 ? "tydzień" : weeks >= 2 && weeks <= 4 ? "tygodnie" : "tygodni"}`;
  }
  const months = Math.round(days / 30.44);
  return `za ${months} ${months === 1 ? "miesiąc" : months >= 2 && months <= 4 ? "miesiące" : "miesięcy"}`;
}

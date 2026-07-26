export type RecordRow = {
  id: string;
  discipline: string;
  metric: string;
  unit: string | null;
  value: number;
  higherIsBetter: boolean;
  achievedOn: string;
  note: string | null;
};

export type RecordGroup = {
  discipline: string;
  metric: string;
  unit: string | null;
  higherIsBetter: boolean;
  best: RecordRow;
  /** Cała historia wyników, od najnowszego. */
  history: RecordRow[];
  /** Poprzedni najlepszy wynik — pozwala pokazać, o ile poprawiony. */
  previousBest: RecordRow | null;
};

function key(row: Pick<RecordRow, "discipline" | "metric">) {
  return `${row.discipline.trim().toLocaleLowerCase("pl-PL")}::${row.metric.trim().toLocaleLowerCase("pl-PL")}`;
}

/** Czy `candidate` jest lepszy od `current` przy danym kierunku metryki. */
export function isBetter(candidate: number, current: number, higherIsBetter: boolean): boolean {
  return higherIsBetter ? candidate > current : candidate < current;
}

/**
 * Aktualne rekordy: dla każdej pary dyscyplina + metryka najlepszy wynik z historii.
 * Kierunek ("większe lepsze" / "mniejsze lepsze") jest atrybutem wpisu, więc czas na 1 km
 * i dystans w tej samej dyscyplinie liczą się poprawnie.
 */
export function currentRecords(rows: RecordRow[]): RecordGroup[] {
  const groups = new Map<string, RecordRow[]>();
  for (const row of rows) {
    const k = key(row);
    const list = groups.get(k);
    if (list) list.push(row);
    else groups.set(k, [row]);
  }

  return [...groups.values()]
    .map((list) => {
      const history = [...list].sort((a, b) => (a.achievedOn < b.achievedOn ? 1 : -1));
      const higherIsBetter = history[0].higherIsBetter;
      const ranked = [...list].sort((a, b) =>
        isBetter(a.value, b.value, higherIsBetter) ? -1 : a.value === b.value ? 0 : 1,
      );
      return {
        discipline: history[0].discipline,
        metric: history[0].metric,
        unit: history[0].unit,
        higherIsBetter,
        best: ranked[0],
        previousBest: ranked[1] ?? null,
        history,
      };
    })
    .sort(
      (a, b) =>
        a.discipline.localeCompare(b.discipline, "pl-PL") || a.metric.localeCompare(b.metric, "pl-PL"),
    );
}

/** Czy nowy wynik pobija dotychczasowy rekord w tej dyscyplinie i metryce. */
export function beatsRecord(existing: RecordRow[], candidate: Pick<RecordRow, "discipline" | "metric" | "value" | "higherIsBetter">) {
  const k = key(candidate);
  const relevant = existing.filter((row) => key(row) === k);
  if (relevant.length === 0) return true;
  const best = relevant.reduce((acc, row) =>
    isBetter(row.value, acc.value, candidate.higherIsBetter) ? row : acc,
  );
  return isBetter(candidate.value, best.value, candidate.higherIsBetter);
}

export function formatRecordValue(group: Pick<RecordGroup, "unit"> & { value: number }): string {
  const value = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 3 }).format(group.value);
  return group.unit ? `${value} ${group.unit}` : value;
}

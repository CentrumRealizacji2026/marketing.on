import { formatDatePl } from "./dates";
import type { MedicationDose } from "./medication";
import { slotSortKey } from "./medication";

/**
 * Agenda dnia: jedna oś czasu złożona ze wszystkich kategorii, żeby po wejściu
 * na stronę główną było widać plan dnia w całości, a nie osobno w każdym kafelku.
 */

export type AgendaCategory = "zdrowie" | "trening" | "nauka" | "zadania";

/**
 * Surowe identyfikatory potrzebne do odhaczenia pozycji wprost z agendy.
 * Bez nich plan dnia umiałby tylko linkować do kafelków — a ma być jednym
 * miejscem, w którym domyka się dzień.
 */
export type AgendaAction =
  | { type: "dose"; medicationId: string; slot: string; taken: boolean }
  | { type: "training"; planId: string; done: boolean }
  /** null = brak decyzji — nauka ma trzy stany, jak LearningBlockStatus. */
  | { type: "learning"; planId: string; done: boolean | null }
  | { type: "task"; taskId: string; done: boolean };

export type AgendaItem = {
  key: string;
  category: AgendaCategory;
  /** Etykieta pory: godzina „18:00” albo nazwana pora „rano”. */
  when: string | null;
  /** Czas trwania z planu — razem z `when` wyznacza okno „teraz". */
  durationMin: number | null;
  title: string;
  detail: string | null;
  done: boolean;
  href: string;
  action: AgendaAction;
};

/** Nominalne godziny nazwanych pór dnia — wyłącznie do ustawienia kolejności. */
const NAMED_SLOT_HOUR: Record<string, number> = {
  rano: 7,
  południe: 12,
  poludnie: 12,
  popołudnie: 15,
  popoludnie: 15,
  wieczór: 19,
  wieczor: 19,
  noc: 22,
};

/** Minuty od północy dla sortowania; null dla pozycji bez pory (idą na koniec). */
export function agendaSortKey(when: string | null): number | null {
  if (!when) return null;
  const normalized = when.trim().toLocaleLowerCase("pl-PL");

  const named = NAMED_SLOT_HOUR[normalized];
  if (named !== undefined) return named * 60;

  const match = normalized.match(/^(\d{1,2})[:.](\d{2})/);
  if (match) return Number(match[1]) * 60 + Number(match[2]);

  return null;
}

function formatTimeLabel(value: string | null): string | null {
  return value ? value.slice(0, 5) : null;
}

export function buildAgenda({
  doses,
  training,
  learning,
  tasks,
}: {
  doses: MedicationDose[];
  training: Array<{
    id: string;
    discipline: string;
    title: string | null;
    startTime: string | null;
    durationMin: number | null;
    done: boolean;
  }>;
  learning: Array<{
    id: string;
    skill: string;
    startTime: string | null;
    durationMin: number | null;
    focus: string | null;
    /** null = brak decyzji (tri-state nauki). */
    done: boolean | null;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    kind: string;
    position: number;
    done: boolean;
    /** Dzień, z którego zadanie zostało przeniesione — widać drogę zaległości. */
    carriedFrom?: string | null;
  }>;
}): AgendaItem[] {
  const items: AgendaItem[] = [
    ...doses.map((dose) => ({
      key: `dose-${dose.medicationId}-${dose.slot}`,
      category: "zdrowie" as const,
      when: dose.slot,
      durationMin: null,
      title: dose.name,
      detail: dose.doseAmount !== null ? `${dose.doseAmount}${dose.doseUnit ? ` ${dose.doseUnit}` : ""}` : null,
      done: dose.taken,
      href: "/zdrowie",
      action: { type: "dose" as const, medicationId: dose.medicationId, slot: dose.slot, taken: dose.taken },
    })),

    ...training.map((entry) => ({
      key: `training-${entry.id}`,
      category: "trening" as const,
      when: formatTimeLabel(entry.startTime),
      durationMin: entry.durationMin,
      title: entry.title || entry.discipline,
      detail: [entry.discipline, entry.durationMin ? `${entry.durationMin} min` : null].filter(Boolean).join(" · "),
      done: entry.done,
      href: "/trening",
      action: { type: "training" as const, planId: entry.id, done: entry.done },
    })),

    ...learning.map((entry) => ({
      key: `learning-${entry.id}`,
      category: "nauka" as const,
      when: formatTimeLabel(entry.startTime),
      durationMin: entry.durationMin,
      title: entry.skill,
      detail: [entry.focus, entry.durationMin ? `${entry.durationMin} min` : null].filter(Boolean).join(" · ") || null,
      done: entry.done === true,
      href: "/nauka",
      action: { type: "learning" as const, planId: entry.id, done: entry.done },
    })),

    ...tasks.map((task) => ({
      key: `task-${task.id}`,
      category: "zadania" as const,
      when: null,
      durationMin: null,
      title: task.title,
      detail: [
        task.kind === "priorytet" ? `priorytet ${task.position}` : "side quest",
        task.carriedFrom ? `przeniesione z ${formatDatePl(task.carriedFrom)}` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      done: task.done,
      href: "/zadania",
      action: { type: "task" as const, taskId: task.id, done: task.done },
    })),
  ];

  return items.sort((a, b) => {
    const ka = agendaSortKey(a.when);
    const kb = agendaSortKey(b.when);

    // Pozycje bez pory (zadania) trafiają na koniec dnia.
    if (ka === null && kb === null) return 0;
    if (ka === null) return 1;
    if (kb === null) return -1;
    if (ka !== kb) return ka - kb;

    // Ta sama pora: najpierw leki wg naturalnej kolejności pór, potem reszta.
    const [ra] = slotSortKey(a.when ?? "");
    const [rb] = slotSortKey(b.when ?? "");
    if (ra !== rb) return ra - rb;
    return a.title.localeCompare(b.title, "pl-PL");
  });
}

/* ------------------------------------------------------- stan czasowy dnia */

/**
 * Okna nazwanych pór dnia. Nominalna godzina z NAMED_SLOT_HOUR ustawia
 * kolejność na osi, ale „rano" to nie punkt o 7:00 — poranne suplementy mają
 * świecić przez cały poranek, aż do wzięcia albo minięcia pory.
 */
const NAMED_SLOT_WINDOW: Record<string, { start: number; end: number }> = {
  rano: { start: 6 * 60, end: 11 * 60 },
  południe: { start: 11 * 60, end: 14 * 60 },
  poludnie: { start: 11 * 60, end: 14 * 60 },
  popołudnie: { start: 14 * 60, end: 18 * 60 },
  popoludnie: { start: 14 * 60, end: 18 * 60 },
  wieczór: { start: 18 * 60, end: 22 * 60 },
  wieczor: { start: 18 * 60, end: 22 * 60 },
  noc: { start: 22 * 60, end: 24 * 60 },
};

export type AgendaWindow = { start: number; end: number } | null;

/** Okno czasowe pozycji w minutach od północy; null dla pozycji bez pory. */
export function agendaWindow(when: string | null, durationMin: number | null): AgendaWindow {
  if (!when) return null;
  const normalized = when.trim().toLocaleLowerCase("pl-PL");

  const named = NAMED_SLOT_WINDOW[normalized];
  if (named) return named;

  const match = normalized.match(/^(\d{1,2})[:.](\d{2})/);
  if (!match) return null;

  const start = Number(match[1]) * 60 + Number(match[2]);
  // Bez czasu trwania przyjmujemy godzinę — tyle „teraz" trwa trening bez planu minut.
  return { start, end: start + (durationMin ?? 60) };
}

/**
 * Stan pozycji względem chwili obecnej. „wkrotce" zaczyna się 90 minut przed
 * startem — dość, by zdążyć się przygotować, za mało, by świeciło pół dnia.
 */
export type AgendaTemporalState = "przeszle" | "teraz" | "wkrotce" | "pozniej" | null;

const SOON_MIN = 90;

export function agendaTemporalState(
  when: string | null,
  durationMin: number | null,
  nowMin: number,
): AgendaTemporalState {
  const window = agendaWindow(when, durationMin);
  if (!window) return null;
  if (nowMin >= window.end) return "przeszle";
  if (nowMin >= window.start) return "teraz";
  if (window.start - nowMin <= SOON_MIN) return "wkrotce";
  return "pozniej";
}

export type TimedAgendaItem = AgendaItem & { state: AgendaTemporalState };

export function annotateAgenda(items: AgendaItem[], nowMin: number): TimedAgendaItem[] {
  return items.map((item) => ({ ...item, state: agendaTemporalState(item.when, item.durationMin, nowMin) }));
}

/**
 * Wyróżnione pozycje „Teraz / Następne": nieodhaczone w toku, dopełnione
 * nadchodzącymi. Przeszłych nie wskrzeszamy — zaległości widać na osi.
 */
export function selectSpotlight(items: TimedAgendaItem[], limit = 3): TimedAgendaItem[] {
  const pending = items.filter((item) => !item.done);
  return [
    ...pending.filter((item) => item.state === "teraz"),
    ...pending.filter((item) => item.state === "wkrotce"),
    ...pending.filter((item) => item.state === "pozniej"),
  ].slice(0, limit);
}

/**
 * Indeks na liście pozycji z godziną, przed którym stoi linia „teraz".
 *
 * Liczony po kluczu SORTUJĄCYM (godzina nominalna pory), nie po starcie okna —
 * oś jest posortowana po tym kluczu, więc tylko on gwarantuje, że linia nie
 * wyląduje „pod" pozycją z późniejszą godziną. Pozycja w toku, której nominalna
 * godzina dopiero nadejdzie (wieczorny lek o 18:05), stoi wtedy pod linią, ale
 * i tak świeci stanem „teraz" — jak wydarzenie w trakcie na kalendarzu.
 */
export function nowLineIndex(items: TimedAgendaItem[], nowMin: number): number {
  let index = 0;
  for (const item of items) {
    const key = agendaSortKey(item.when);
    if (key !== null && key <= nowMin) index += 1;
  }
  return index;
}

/* -------------------------------------------------------------- budżet dnia */

/** Umowny koniec dnia roboczego — początek okna „noc" z NAMED_SLOT_WINDOW. */
export const DAY_END_MIN = 22 * 60;

/**
 * Obciążenie dnia: suma minut nieodhaczonych pozycji z czasem trwania
 * (dawki leków i zadania mają durationMin = null — nie obciążają budżetu)
 * zestawiona z czasem, który został do końca dnia.
 */
export function dayLoad(
  items: AgendaItem[],
  nowMin: number,
  dayEndMin = DAY_END_MIN,
): { plannedMin: number; leftMin: number; overloaded: boolean } {
  const plannedMin = items
    .filter((item) => !item.done)
    .reduce((sum, item) => sum + (item.durationMin ?? 0), 0);
  const leftMin = Math.max(0, dayEndMin - nowMin);
  return { plannedMin, leftMin, overloaded: plannedMin > leftMin };
}

export const AGENDA_CATEGORY_LABEL: Record<AgendaCategory, string> = {
  zdrowie: "Zdrowie",
  trening: "Trening",
  nauka: "Nauka",
  zadania: "Zadania",
};

/** Kolory kategorii — wspólne dla agendy i kalendarza. */
export const CATEGORY_COLOR: Record<string, string> = {
  finanse: "var(--series-1)",
  platnosci: "var(--warning)",
  rodzina: "var(--series-3)",
  sprzedaz: "var(--series-2)",
  zdrowie: "var(--good)",
  zadania: "var(--series-1)",
  trening: "var(--series-2)",
  nauka: "var(--series-3)",
  projekty: "var(--warning)",
};

import type { MedicationDose } from "./medication";
import { slotSortKey } from "./medication";

/**
 * Agenda dnia: jedna oś czasu złożona ze wszystkich kategorii, żeby po wejściu
 * na stronę główną było widać plan dnia w całości, a nie osobno w każdym kafelku.
 */

export type AgendaCategory = "zdrowie" | "trening" | "nauka" | "zadania";

export type AgendaItem = {
  key: string;
  category: AgendaCategory;
  /** Etykieta pory: godzina „18:00” albo nazwana pora „rano”. */
  when: string | null;
  title: string;
  detail: string | null;
  done: boolean;
  href: string;
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
    done: boolean;
  }>;
  tasks: Array<{ id: string; title: string; kind: string; position: number; done: boolean }>;
}): AgendaItem[] {
  const items: AgendaItem[] = [
    ...doses.map((dose) => ({
      key: `dose-${dose.medicationId}-${dose.slot}`,
      category: "zdrowie" as const,
      when: dose.slot,
      title: dose.name,
      detail: dose.doseAmount !== null ? `${dose.doseAmount}${dose.doseUnit ? ` ${dose.doseUnit}` : ""}` : null,
      done: dose.taken,
      href: "/zdrowie",
    })),

    ...training.map((entry) => ({
      key: `training-${entry.id}`,
      category: "trening" as const,
      when: formatTimeLabel(entry.startTime),
      title: entry.title || entry.discipline,
      detail: [entry.discipline, entry.durationMin ? `${entry.durationMin} min` : null].filter(Boolean).join(" · "),
      done: entry.done,
      href: "/trening",
    })),

    ...learning.map((entry) => ({
      key: `learning-${entry.id}`,
      category: "nauka" as const,
      when: formatTimeLabel(entry.startTime),
      title: entry.skill,
      detail: [entry.focus, entry.durationMin ? `${entry.durationMin} min` : null].filter(Boolean).join(" · ") || null,
      done: entry.done,
      href: "/nauka",
    })),

    ...tasks.map((task) => ({
      key: `task-${task.id}`,
      category: "zadania" as const,
      when: null,
      title: task.title,
      detail: task.kind === "priorytet" ? `priorytet ${task.position}` : "side quest",
      done: task.done,
      href: "/zadania",
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

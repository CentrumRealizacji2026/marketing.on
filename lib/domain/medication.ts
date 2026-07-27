import type { MedicationKind } from "@/lib/db/schema";
import { isoWeekday, isWithin } from "./dates";

/**
 * Od jakiego udziału przyjętych dawek uznajemy dzień za zrobiony.
 * Codzienna dyscyplina, nie perfekcja — jedna pominięta dawka na pięć nie psuje dnia.
 */
export const DOSE_DONE_THRESHOLD = 0.8;

/** Podpowiedzi w formularzu — użytkownik może wpisać własną porę lub godzinę "07:30". */
export const SLOT_SUGGESTIONS = ["rano", "południe", "popołudnie", "wieczór", "noc"] as const;

const SLOT_RANK = new Map<string, number>([
  ["rano", 0],
  ["południe", 1],
  ["poludnie", 1],
  ["popołudnie", 2],
  ["popoludnie", 2],
  ["wieczór", 3],
  ["wieczor", 3],
  ["noc", 4],
]);

export type MedicationRow = {
  id: string;
  name: string;
  kind: MedicationKind;
  doseAmount: number | null;
  doseUnit: string | null;
  timesOfDay: string[];
  daysOfWeek: number[];
  active: boolean;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  position: number;
};

export type MedicationDose = {
  medicationId: string;
  name: string;
  kind: MedicationKind;
  doseAmount: number | null;
  doseUnit: string | null;
  slot: string;
  taken: boolean;
  notes: string | null;
};

/** Godziny sortujemy chronologicznie, nazwane pory wg naturalnej kolejności dnia. */
export function slotSortKey(slot: string): [number, string] {
  const normalized = slot.trim().toLocaleLowerCase("pl-PL");
  const rank = SLOT_RANK.get(normalized);
  if (rank !== undefined) return [rank, normalized];
  if (/^\d{1,2}[:.]\d{2}$/.test(normalized)) {
    const [h, m] = normalized.split(/[:.]/);
    return [10 + Number(h) / 100 + Number(m) / 10_000, normalized];
  }
  return [100, normalized];
}

function isScheduledOn(med: MedicationRow, date: string): boolean {
  if (!med.active) return false;
  if (!isWithin(date, med.startDate, med.endDate)) return false;
  if (med.daysOfWeek.length > 0 && !med.daysOfWeek.includes(isoWeekday(date))) return false;
  return med.timesOfDay.length > 0;
}

/**
 * Lista dawek do przyjęcia w danym dniu, złożona z konfiguracji leków i suplementów.
 * Wyłączony lub zakończony lek znika z dzisiejszej listy, ale jego historia zostaje nietknięta.
 */
export function medicationScheduleForDate(
  date: string,
  medications: MedicationRow[],
  logs: Array<{ medicationId: string; slot: string; taken: boolean }> = [],
): MedicationDose[] {
  const takenSet = new Set(logs.filter((l) => l.taken).map((l) => `${l.medicationId}::${l.slot}`));

  const doses = medications.filter((med) => isScheduledOn(med, date)).flatMap((med) =>
    med.timesOfDay.map((slot) => ({
      medicationId: med.id,
      name: med.name,
      kind: med.kind,
      doseAmount: med.doseAmount,
      doseUnit: med.doseUnit,
      slot,
      taken: takenSet.has(`${med.id}::${slot}`),
      notes: med.notes,
    })),
  );

  return doses.sort((a, b) => {
    const [ra, sa] = slotSortKey(a.slot);
    const [rb, sb] = slotSortKey(b.slot);
    if (ra !== rb) return ra - rb;
    if (sa !== sb) return sa.localeCompare(sb, "pl-PL");
    return a.name.localeCompare(b.name, "pl-PL");
  });
}

export function groupDosesBySlot(doses: MedicationDose[]): Array<{ slot: string; doses: MedicationDose[] }> {
  const groups = new Map<string, MedicationDose[]>();
  for (const dose of doses) {
    const list = groups.get(dose.slot);
    if (list) list.push(dose);
    else groups.set(dose.slot, [dose]);
  }
  return [...groups.entries()].map(([slot, list]) => ({ slot, doses: list }));
}

export function formatDose(dose: Pick<MedicationDose, "doseAmount" | "doseUnit">): string | null {
  if (dose.doseAmount === null || dose.doseAmount === undefined) return dose.doseUnit ?? null;
  const amount = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 3 }).format(dose.doseAmount);
  return dose.doseUnit ? `${amount} ${dose.doseUnit}` : amount;
}

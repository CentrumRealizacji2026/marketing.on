import { agendaWindow } from "./agenda";
import { addDays } from "./dates";

/**
 * Które przypomnienia są NALEŻNE w tej chwili. Czysta funkcja: harmonogram
 * odpala ją co kwadrans, a szerokie okna + rejestr wysłanych (push_sends)
 * dają odporność na spóźniony tick — należne przypomnienie wyjdzie przy
 * następnym przebiegu, a wysłane drugi raz nie wyjdzie nigdy.
 */

export type ReminderKind = "leki" | "rata" | "trening" | "nauka" | "poranek" | "wieczor";

export type DueReminder = {
  kind: ReminderKind;
  /** Stabilny między tickami klucz dedupe — zawiera datę. */
  refKey: string;
  title: string;
  body: string;
  url: string;
};

export type ReminderPrefs = {
  leki: boolean;
  raty: boolean;
  trening: boolean;
  nauka: boolean;
  poranek: boolean;
  wieczor: boolean;
};

export type ReminderInput = {
  doses: Array<{ slot: string; name: string; taken: boolean }>;
  payments: Array<{ obligationId: string; name: string; amountPln: number; dueDate: string; status: string }>;
  trainings: Array<{
    planId: string;
    title: string | null;
    discipline: string;
    startTime: string | null;
    durationMin: number | null;
    done: boolean;
  }>;
  learning: Array<{ planId: string; skill: string; startTime: string | null; durationMin: number | null; done: boolean }>;
  morningFilled: boolean;
  reportSubmitted: boolean;
  currency: string;
  prefs: ReminderPrefs;
};

/** Trening i nauka przypominają się do 90 minut przed startem — jak „wkrótce" w agendzie. */
const SOON_MIN = 90;
/** Raty nie budzą przed ósmą. */
const BILLS_FROM_MIN = 8 * 60;
const MORNING_WINDOW = { start: 7 * 60, end: 12 * 60 };
const EVENING_WINDOW = { start: 20 * 60 + 30, end: 23 * 60 };

function money(amountPln: number, currency: string): string {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amountPln);
}

function startMin(startTime: string | null): number | null {
  if (!startTime) return null;
  const window = agendaWindow(startTime.slice(0, 5), null);
  return window?.start ?? null;
}

export function dueReminders(input: ReminderInput, today: string, nowMin: number): DueReminder[] {
  const out: DueReminder[] = [];

  // Leki: dawki nie wzięte, zgrupowane per pora — jedno powiadomienie na slot,
  // aktywne przez całe okno pory (rano = 6:00–11:00 itd.).
  if (input.prefs.leki) {
    const bySlot = new Map<string, string[]>();
    for (const dose of input.doses) {
      if (dose.taken) continue;
      const list = bySlot.get(dose.slot) ?? [];
      list.push(dose.name);
      bySlot.set(dose.slot, list);
    }
    for (const [slot, names] of bySlot) {
      const window = agendaWindow(slot, null);
      if (!window || nowMin < window.start || nowMin >= window.end) continue;
      out.push({
        kind: "leki",
        refKey: `${today}|${slot}`,
        title: `Pora na leki (${slot})`,
        body: names.join(", "),
        url: "/zdrowie",
      });
    }
  }

  // Raty: trzy dni przed terminem i w dniu terminu, nieopłacone, od 8:00.
  if (input.prefs.raty && nowMin >= BILLS_FROM_MIN) {
    const zaTrzyDni = addDays(today, 3);
    for (const payment of input.payments) {
      if (payment.status !== "do-zaplaty") continue;
      if (payment.dueDate === today) {
        out.push({
          kind: "rata",
          refKey: `${today}|${payment.obligationId}|T0`,
          title: "Dziś schodzi płatność",
          body: `${payment.name} — ${money(payment.amountPln, input.currency)}`,
          url: "/finanse#platnosci",
        });
      } else if (payment.dueDate === zaTrzyDni) {
        out.push({
          kind: "rata",
          refKey: `${today}|${payment.obligationId}|T3`,
          title: "Za 3 dni schodzi płatność",
          body: `${payment.name} — ${money(payment.amountPln, input.currency)}`,
          url: "/finanse#platnosci",
        });
      }
    }
  }

  // Trening i nauka: od 90 minut przed startem do końca bloku, dopóki nie odhaczone.
  if (input.prefs.trening) {
    for (const training of input.trainings) {
      if (training.done) continue;
      const start = startMin(training.startTime);
      if (start === null) continue;
      const end = start + (training.durationMin ?? 60);
      if (nowMin < start - SOON_MIN || nowMin >= end) continue;
      out.push({
        kind: "trening",
        refKey: `${today}|${training.planId}`,
        title: `Trening o ${training.startTime!.slice(0, 5)}`,
        body: training.title || training.discipline,
        url: "/trening",
      });
    }
  }
  if (input.prefs.nauka) {
    for (const block of input.learning) {
      if (block.done) continue;
      const start = startMin(block.startTime);
      if (start === null) continue;
      const end = start + (block.durationMin ?? 60);
      if (nowMin < start - SOON_MIN || nowMin >= end) continue;
      out.push({
        kind: "nauka",
        refKey: `${today}|${block.planId}`,
        title: `Nauka o ${block.startTime!.slice(0, 5)}`,
        body: block.skill,
        url: "/nauka",
      });
    }
  }

  // Poranek i wieczór: rytuały przypominają się raz dziennie w swoich oknach.
  if (input.prefs.poranek && !input.morningFilled && nowMin >= MORNING_WINDOW.start && nowMin < MORNING_WINDOW.end) {
    out.push({
      kind: "poranek",
      refKey: today,
      title: "Poranek w Kokpicie",
      body: "Z jaką intencją zaczynasz dzień?",
      url: "/",
    });
  }
  if (input.prefs.wieczor && !input.reportSubmitted && nowMin >= EVENING_WINDOW.start && nowMin < EVENING_WINDOW.end) {
    out.push({
      kind: "wieczor",
      refKey: today,
      title: "Wieczorny raport",
      body: "Domknij dzień: finanse, zdrowie, zadania i nastrój.",
      url: "/raport",
    });
  }

  return out;
}

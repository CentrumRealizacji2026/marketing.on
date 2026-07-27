import "server-only";

import { and, asc, eq, gte, lte } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  contracts,
  dailyLogs,
  learningLogs,
  learningPlanWeek,
  learningPlanYear,
  medicationLogs,
  familyEvents,
  familyMembers,
  medications,
  obligationPayments,
  obligations,
  projectMilestones,
  projects,
  salesDaily,
  savingsContributions,
  savingsGoals,
  tasks,
  trainingLogs,
  trainingPlans,
  type Settings,
} from "@/lib/db/schema";
import { addDays, isoWeekday, startOfWeek, todayInTz } from "@/lib/domain/dates";
import { familyDatesInRange, type EventInput, type MemberInput } from "@/lib/domain/family";
import { planGesturesForWeek, seedFromId } from "@/lib/domain/gestures";
import { dayCashFlow, type CashFlowSource } from "@/lib/domain/finance";
import { learningBlocksForDate } from "@/lib/domain/learning";
import { paymentsInRange, type ObligationInput, type PaymentStatus } from "@/lib/domain/obligations";
import { medicationScheduleForDate, type MedicationRow } from "@/lib/domain/medication";
import { waterStatus, type WaterStatus } from "@/lib/domain/water";

export type CalendarEntry = { label: string; detail?: string | null; done?: boolean };

export type CalendarDay = {
  date: string;
  weekday: number;
  finanse: {
    cashBalancePln: number | null;
    /** Wydane i wpłynęło z raportu — null, gdy w danym dniu nie podano kwot. */
    expensesPln: number | null;
    incomePln: number | null;
    /** Wynik dnia: z wpisanych kwot, a w ich braku z różnicy sald. */
    changePln: number | null;
    changeSource: CashFlowSource | null;
  };
  /** Terminy rachunków i rat wypadające tego dnia, ze statusem zapłaty. */
  platnosci: Array<{ name: string; amountPln: number; status: PaymentStatus }>;
  /** Ile i na co odłożone tego dnia. */
  oszczednosci: Array<{ name: string; amountPln: number }>;
  /** Urodziny, rocznice, randki oraz zaplanowane drobne gesty. */
  rodzina: Array<{ label: string; detail: string | null; kind: string }>;
  sprzedaz: { calls: number; meetingsScheduled: number; meetingsHeld: number; contracts: number; valuePln: number };
  zdrowie: {
    dosesPlanned: number;
    dosesTaken: number;
    waterMl: number | null;
    waterStatus: WaterStatus | null;
    weightKg: number | null;
    mood: number | null;
    stress: number | null;
    thoughts: string | null;
    goodThings: string | null;
  };
  zadania: { total: number; done: number; entries: CalendarEntry[] };
  trening: CalendarEntry[];
  nauka: CalendarEntry[];
  projekty: CalendarEntry[];
};

/** Czy w danym dniu w danej kategorii cokolwiek się dzieje — steruje kropkami w kalendarzu. */
export function hasActivity(day: CalendarDay, category: keyof typeof CATEGORY_KEYS): boolean {
  switch (category) {
    case "finanse":
      return (
        day.finanse.cashBalancePln !== null ||
        day.finanse.expensesPln !== null ||
        day.finanse.incomePln !== null ||
        day.oszczednosci.length > 0
      );
    case "platnosci":
      return day.platnosci.length > 0;
    case "rodzina":
      return day.rodzina.length > 0;
    case "sprzedaz":
      return day.sprzedaz.calls + day.sprzedaz.meetingsHeld + day.sprzedaz.contracts > 0;
    case "zdrowie":
      return (
        day.zdrowie.dosesPlanned > 0 ||
        day.zdrowie.waterMl !== null ||
        day.zdrowie.weightKg !== null ||
        day.zdrowie.mood !== null
      );
    case "zadania":
      return day.zadania.total > 0;
    case "trening":
      return day.trening.length > 0;
    case "nauka":
      return day.nauka.length > 0;
    case "projekty":
      return day.projekty.length > 0;
  }
}

export const CATEGORY_KEYS = {
  finanse: "Finanse",
  platnosci: "Płatności",
  sprzedaz: "Sprzedaż",
  rodzina: "Rodzina",
  zdrowie: "Zdrowie",
  zadania: "Zadania",
  trening: "Trening",
  nauka: "Nauka",
  projekty: "Projekty",
} as const;

export type CategoryKey = keyof typeof CATEGORY_KEYS;

/**
 * Widok kalendarzowy: dla każdego dnia w zakresie zbiera, co się w nim dzieje
 * w każdej kategorii. Dni przyszłe pokazują plan (trening, nauka, leki,
 * terminy projektów), dni minione — plan wraz z realizacją.
 */
export async function getCalendarRange(
  userId: string,
  settings: Settings,
  dates: string[],
): Promise<CalendarDay[]> {
  if (dates.length === 0) return [];
  const from = dates[0];
  const to = dates[dates.length - 1];
  // Sięgamy wstecz poza zakres, żeby pierwszy dzień też miał z czym porównać stan środków.
  const cashFrom = addDays(from, -60);

  const [
    logs,
    salesRows,
    contractRows,
    medRows,
    medLogRows,
    taskRows,
    trainingPlanRows,
    trainingLogRows,
    weekPlans,
    yearPlans,
    learningLogRows,
    projectRows,
    milestoneRows,
    memberRows,
    eventRows,
    obligationRows,
    paymentRows,
    contributionRows,
  ] = await Promise.all([
    db
      .select()
      .from(dailyLogs)
      .where(and(eq(dailyLogs.userId, userId), gte(dailyLogs.date, cashFrom), lte(dailyLogs.date, to)))
      .orderBy(asc(dailyLogs.date)),
    db
      .select()
      .from(salesDaily)
      .where(and(eq(salesDaily.userId, userId), gte(salesDaily.date, from), lte(salesDaily.date, to))),
    db
      .select()
      .from(contracts)
      .where(and(eq(contracts.userId, userId), gte(contracts.signedOn, from), lte(contracts.signedOn, to))),
    db.select().from(medications).where(and(eq(medications.userId, userId), eq(medications.active, true))),
    db
      .select()
      .from(medicationLogs)
      .where(and(eq(medicationLogs.userId, userId), gte(medicationLogs.date, from), lte(medicationLogs.date, to))),
    db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, userId), gte(tasks.date, from), lte(tasks.date, to))),
    db.select().from(trainingPlans).where(and(eq(trainingPlans.userId, userId), eq(trainingPlans.active, true))),
    db
      .select()
      .from(trainingLogs)
      .where(and(eq(trainingLogs.userId, userId), gte(trainingLogs.date, from), lte(trainingLogs.date, to))),
    db.select().from(learningPlanWeek).where(and(eq(learningPlanWeek.userId, userId), eq(learningPlanWeek.active, true))),
    db.select().from(learningPlanYear).where(eq(learningPlanYear.userId, userId)),
    db
      .select()
      .from(learningLogs)
      .where(and(eq(learningLogs.userId, userId), gte(learningLogs.date, from), lte(learningLogs.date, to))),
    db.select().from(projects).where(eq(projects.userId, userId)),
    db.select().from(projectMilestones).where(eq(projectMilestones.userId, userId)),
    db.select().from(familyMembers).where(eq(familyMembers.userId, userId)),
    db.select().from(familyEvents).where(eq(familyEvents.userId, userId)),
    db.select().from(obligations).where(and(eq(obligations.userId, userId), eq(obligations.active, true))),
    db
      .select()
      .from(obligationPayments)
      .where(
        and(
          eq(obligationPayments.userId, userId),
          gte(obligationPayments.dueDate, from),
          lte(obligationPayments.dueDate, to),
        ),
      ),
    db
      .select({
        date: savingsContributions.date,
        amountPln: savingsContributions.amountPln,
        name: savingsGoals.name,
      })
      .from(savingsContributions)
      .innerJoin(savingsGoals, eq(savingsGoals.id, savingsContributions.goalId))
      .where(
        and(
          eq(savingsContributions.userId, userId),
          gte(savingsContributions.date, from),
          lte(savingsContributions.date, to),
        ),
      ),
  ]);

  const logByDate = new Map(logs.map((row) => [row.date, row]));
  const salesByDate = new Map(salesRows.map((row) => [row.date, row]));

  // Zmiana stanu środków liczona względem poprzedniego wpisu, nie poprzedniego dnia —
  // dzień bez raportu nie generuje fałszywego zera.
  const cashEntries = logs.filter((row) => row.cashBalancePln !== null);
  const cashChangeByDate = new Map<string, number>();
  for (let i = 1; i < cashEntries.length; i += 1) {
    cashChangeByDate.set(cashEntries[i].date, cashEntries[i].cashBalancePln! - cashEntries[i - 1].cashBalancePln!);
  }

  // Terminy nie są wierszami w bazie — generujemy je raz na cały zakres.
  const today = todayInTz(settings.timezone);

  const familyDates = familyDatesInRange(
    memberRows as MemberInput[],
    eventRows as EventInput[],
    from,
    to,
    today,
  );

  // Gesty planowane są tygodniami, więc zbieramy plany wszystkich tygodni z zakresu.
  const gestureSeed = seedFromId(userId);
  const gestureByDate = new Map<string, string[]>();
  if (settings.familyGesturesPerWeek > 0) {
    for (let cursor = startOfWeek(from, settings.weekStartsOn); cursor <= to; cursor = addDays(cursor, 7)) {
      for (const entry of planGesturesForWeek(cursor, settings.familyGesturesPerWeek, gestureSeed)) {
        if (entry.date < from || entry.date > to) continue;
        gestureByDate.set(entry.date, [...(gestureByDate.get(entry.date) ?? []), entry.gesture.text]);
      }
    }
  }
  const duePayments = paymentsInRange(obligationRows as ObligationInput[], paymentRows, from, to, today);

  return dates.map((date) => {
    const weekday = isoWeekday(date);
    const log = logByDate.get(date) ?? null;
    const sales = salesByDate.get(date) ?? null;

    const dayContracts = contractRows.filter((row) => row.signedOn === date && row.status === "podpisana");
    const schedule = medicationScheduleForDate(
      date,
      medRows as MedicationRow[],
      medLogRows.filter((entry) => entry.date === date),
    );

    const flow = dayCashFlow({
      expensesPln: log?.expensesPln,
      incomePln: log?.incomePln,
      balanceChangePln: cashChangeByDate.get(date) ?? null,
    });

    const dayTasks = taskRows.filter((task) => task.date === date);

    const dayTraining: CalendarEntry[] = trainingPlanRows
      .filter((plan) => plan.weekday === weekday)
      .map((plan) => {
        const log = trainingLogRows.find((entry) => entry.date === date && entry.planId === plan.id);
        return {
          label: plan.title || plan.discipline,
          detail: [plan.startTime ? plan.startTime.slice(0, 5) : null, plan.discipline].filter(Boolean).join(" · "),
          done: Boolean(log?.done),
        };
      });

    // Treningi zapisane poza planem też należą do obrazu dnia.
    for (const entry of trainingLogRows.filter((row) => row.date === date && !row.planId)) {
      dayTraining.push({ label: entry.title || entry.discipline, detail: "poza planem", done: entry.done });
    }

    const dayLearning: CalendarEntry[] = learningBlocksForDate(date, weekPlans, yearPlans).map((block) => {
      const log = learningLogRows.find((entry) => entry.date === date && entry.planId === block.planId);
      return {
        label: block.skill,
        detail: [block.startTime ? block.startTime.slice(0, 5) : null, block.focus].filter(Boolean).join(" · ") || null,
        done: Boolean(log?.done),
      };
    });

    const dayProjects: CalendarEntry[] = [
      ...projectRows
        .filter((project) => project.deadline === date)
        .map((project) => ({ label: project.name, detail: "termin projektu", done: project.status === "zakonczony" })),
      ...milestoneRows
        .filter((milestone) => milestone.dueDate === date)
        .map((milestone) => ({
          label: milestone.title,
          detail: projectRows.find((p) => p.id === milestone.projectId)?.name ?? "kamień milowy",
          done: milestone.done,
        })),
    ];

    return {
      date,
      weekday,
      platnosci: duePayments
        .filter((payment) => payment.dueDate === date)
        .map((payment) => ({ name: payment.name, amountPln: payment.amountPln, status: payment.status })),
      oszczednosci: contributionRows
        .filter((row) => row.date === date)
        .map((row) => ({ name: row.name, amountPln: row.amountPln })),
      rodzina: [
        ...familyDates
          .filter((entry) => entry.date === date)
          .map((entry) => ({
            label: entry.label,
            detail: entry.ordinal ? `${entry.ordinal}. rocznica` : entry.note,
            kind: entry.kind,
          })),
        ...(gestureByDate.get(date) ?? []).map((text) => ({ label: "Drobny gest", detail: text, kind: "gest" })),
      ],
      finanse: {
        cashBalancePln: log?.cashBalancePln ?? null,
        expensesPln: flow.expensesPln,
        incomePln: flow.incomePln,
        changePln: flow.netPln,
        changeSource: flow.source,
      },
      sprzedaz: {
        calls: sales?.calls ?? 0,
        meetingsScheduled: sales?.meetingsScheduled ?? 0,
        meetingsHeld: sales?.meetingsHeld ?? 0,
        contracts: dayContracts.length,
        valuePln: dayContracts.reduce((sum, row) => sum + row.valuePln, 0),
      },
      zdrowie: {
        dosesPlanned: schedule.length,
        dosesTaken: schedule.filter((dose) => dose.taken).length,
        waterMl: log?.waterMl ?? null,
        waterStatus: waterStatus(log?.waterMl ?? null, settings.waterGoalMl, settings.waterGoodPct, settings.waterOkPct),
        weightKg: log?.weightKg ?? null,
        mood: log?.mood ?? null,
        stress: log?.stress ?? null,
        thoughts: log?.thoughts ?? null,
        goodThings: log?.goodThings ?? null,
      },
      zadania: {
        total: dayTasks.length,
        done: dayTasks.filter((task) => task.done).length,
        entries: dayTasks
          .sort((a, b) => a.kind.localeCompare(b.kind) || a.position - b.position)
          .map((task) => ({
            label: task.title,
            detail: task.kind === "priorytet" ? `priorytet ${task.position}` : "side quest",
            done: task.done,
          })),
      },
      trening: dayTraining,
      nauka: dayLearning,
      projekty: dayProjects,
    };
  });
}

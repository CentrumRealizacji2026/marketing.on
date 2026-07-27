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
  medications,
  personalRecords,
  projects,
  deals,
  salesDaily,
  tasks,
  trainingLogs,
  trainingPlans,
  type Settings,
} from "@/lib/db/schema";
import { addDays, isoWeekday, lastNDays } from "@/lib/domain/dates";
import { summarizeDeals, type DealInput } from "@/lib/domain/deals";
import { dayCashFlow, sumExpenses, sumIncome } from "@/lib/domain/finance";
import { learningBlocksForDate } from "@/lib/domain/learning";
import { medicationScheduleForDate, type MedicationRow } from "@/lib/domain/medication";
import { currentRecords } from "@/lib/domain/records";
import { conversionRates, sumSales } from "@/lib/domain/sales";
import { averageOfReportedDays, waterStatus } from "@/lib/domain/water";
import { weightPlanProgress } from "@/lib/domain/weight";
import { getObligationsOverview } from "@/lib/queries/obligations";
import { getSavingsOverview } from "@/lib/queries/savings";

function round(value: number | null, digits = 1): number | null {
  if (value === null || Number.isNaN(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function ratio(done: number, planned: number): number | null {
  return planned > 0 ? Math.round((done / planned) * 100) : null;
}

/**
 * Pakiet danych dla mentora: agregaty z 7 i 30 dni plus cele użytkownika.
 * Wysyłamy liczby i realizację planów, nie surowe notatki — model ma oceniać
 * tendencje, a nie przepisywać dziennik.
 */
export async function buildSnapshot(userId: string, settings: Settings, today: string) {
  const start30 = addDays(today, -29);
  const start7 = addDays(today, -6);

  const [logs, salesRows, contractRows, medRows, medLogRows, taskRows, planRows, trainingLogRows, weekPlans, yearPlans, learningLogRows, recordRows, projectRows, dealRows] =
    await Promise.all([
      db
        .select()
        .from(dailyLogs)
        .where(and(eq(dailyLogs.userId, userId), gte(dailyLogs.date, start30), lte(dailyLogs.date, today)))
        .orderBy(asc(dailyLogs.date)),
      db
        .select()
        .from(salesDaily)
        .where(and(eq(salesDaily.userId, userId), gte(salesDaily.date, start30), lte(salesDaily.date, today))),
      db
        .select()
        .from(contracts)
        .where(and(eq(contracts.userId, userId), gte(contracts.signedOn, start30), lte(contracts.signedOn, today))),
      db.select().from(medications).where(and(eq(medications.userId, userId), eq(medications.active, true))),
      db
        .select()
        .from(medicationLogs)
        .where(and(eq(medicationLogs.userId, userId), gte(medicationLogs.date, start7), lte(medicationLogs.date, today))),
      db
        .select()
        .from(tasks)
        .where(and(eq(tasks.userId, userId), gte(tasks.date, start30), lte(tasks.date, today))),
      db.select().from(trainingPlans).where(and(eq(trainingPlans.userId, userId), eq(trainingPlans.active, true))),
      db
        .select()
        .from(trainingLogs)
        .where(and(eq(trainingLogs.userId, userId), gte(trainingLogs.date, start30), lte(trainingLogs.date, today))),
      db.select().from(learningPlanWeek).where(and(eq(learningPlanWeek.userId, userId), eq(learningPlanWeek.active, true))),
      db.select().from(learningPlanYear).where(eq(learningPlanYear.userId, userId)),
      db
        .select()
        .from(learningLogs)
        .where(and(eq(learningLogs.userId, userId), gte(learningLogs.date, start30), lte(learningLogs.date, today))),
      db.select().from(personalRecords).where(eq(personalRecords.userId, userId)),
      db.select().from(projects).where(and(eq(projects.userId, userId), eq(projects.status, "aktywny"))),
      db.select().from(deals).where(eq(deals.userId, userId)),
    ]);

  // Cele i rachunki mają własne zapytania — mentor dostaje wyliczony stan, nie surowe wiersze.
  const [savings, bills] = await Promise.all([
    getSavingsOverview(userId, today),
    getObligationsOverview(userId, today, 30),
  ]);

  const days30 = lastNDays(today, 30);
  const days7 = lastNDays(today, 7);
  const byDate = new Map(logs.map((log) => [log.date, log]));

  /* ------------------------------------------------------------- finanse */

  const cashReported = logs.filter((log) => log.cashBalancePln !== null);
  const cash7 = cashReported.filter((log) => log.date >= start7);

  const flows30 = logs.map((log) => dayCashFlow(log));
  const flows7 = logs.filter((log) => log.date >= start7).map((log) => dayCashFlow(log));
  const spent7 = sumExpenses(flows7);
  const spent30 = sumExpenses(flows30);
  const earned7 = sumIncome(flows7);
  const earned30 = sumIncome(flows30);

  /* ------------------------------------------------------------ sprzedaż */

  const sales7 = sumSales(salesRows.filter((row) => row.date >= start7));
  const sales30 = sumSales(salesRows);
  const signed30 = contractRows.filter((row) => row.status === "podpisana");
  const signed7 = signed30.filter((row) => row.signedOn >= start7);

  const totals7 = { ...sales7, contracts: signed7.length, valuePln: signed7.reduce((s, r) => s + r.valuePln, 0) };
  const totals30 = { ...sales30, contracts: signed30.length, valuePln: signed30.reduce((s, r) => s + r.valuePln, 0) };

  /* ------------------------------------------------------------- zdrowie */

  const water7 = averageOfReportedDays(days7.map((d) => byDate.get(d)?.waterMl ?? null));
  const water30 = averageOfReportedDays(days30.map((d) => byDate.get(d)?.waterMl ?? null));
  const weightReported = logs.filter((log) => log.weightKg !== null);

  // Realizacja przyjmowania leków w ostatnim tygodniu.
  let dosesPlanned = 0;
  let dosesTaken = 0;
  for (const date of days7) {
    const dayLogs = medLogRows.filter((entry) => entry.date === date);
    const schedule = medicationScheduleForDate(date, medRows as MedicationRow[], dayLogs);
    dosesPlanned += schedule.length;
    dosesTaken += schedule.filter((dose) => dose.taken).length;
  }

  /* ------------------------------------------------------------- zadania */

  const priorities30 = taskRows.filter((task) => task.kind === "priorytet");
  const priorities7 = priorities30.filter((task) => task.date >= start7);

  /* ------------------------------------------------------------- trening */

  const plannedTrainings = (dates: string[]) =>
    dates.reduce((sum, date) => sum + planRows.filter((plan) => plan.weekday === isoWeekday(date)).length, 0);

  const doneTrainings = (from: string) => trainingLogRows.filter((log) => log.date >= from && log.done).length;

  /* --------------------------------------------------------------- nauka */

  const plannedBlocks = (dates: string[]) =>
    dates.reduce((sum, date) => sum + learningBlocksForDate(date, weekPlans, yearPlans).length, 0);

  const doneBlocks = (from: string) => learningLogRows.filter((log) => log.date >= from && log.done).length;

  const weightPlan = weightPlanProgress({
    startKg: settings.weightStartKg,
    startDate: settings.weightStartDate,
    targetKg: settings.weightTargetKg,
    targetDate: settings.weightTargetDate,
    currentKg: weightReported.at(-1)?.weightKg ?? null,
    currentDate: weightReported.at(-1)?.date ?? today,
  });

  const minutesBySkill = new Map<string, number>();
  for (const log of learningLogRows) {
    if (!log.done) continue;
    minutesBySkill.set(log.skill, (minutesBySkill.get(log.skill) ?? 0) + (log.minutes ?? 0));
  }

  return {
    data: today,
    waluta: settings.currency,

    cele: {
      rozmowyDziennie: settings.goalCallsPerDay,
      spotkaniaUmowioneDziennie: settings.goalMeetingsScheduledPerDay,
      spotkaniaOdbyteDziennie: settings.goalMeetingsHeldPerDay,
      umowyTygodniowo: settings.goalContractsPerWeek,
      przychodMiesiecznie: settings.monthlyRevenueGoalPln,
      wodaDziennieMl: settings.waterGoalMl,
      wagaDocelowaKg: settings.weightTargetKg,
    },

    finanse: {
      stanObecny: cashReported.at(-1)?.cashBalancePln ?? null,
      stanTydzienTemu: cash7[0]?.cashBalancePln ?? null,
      stanMiesiacTemu: cashReported[0]?.cashBalancePln ?? null,
      liczbaWpisow: cashReported.length,
      // Wydatki i wpływy są liczone tylko z dni, w których użytkownik je podał —
      // dzień bez wpisu nie jest dniem bez wydatków.
      wydaneTydzien: spent7.days > 0 ? round(spent7.totalPln, 2) : null,
      wydaneMiesiac: spent30.days > 0 ? round(spent30.totalPln, 2) : null,
      wplyneloTydzien: earned7.days > 0 ? round(earned7.totalPln, 2) : null,
      wplyneloMiesiac: earned30.days > 0 ? round(earned30.totalPln, 2) : null,
      sredniDzienneWydatki: spent30.days > 0 ? round(spent30.totalPln / spent30.days, 2) : null,
      dniZWpisemPrzeplywow: spent30.days,
    },

    oszczednosci: {
      cele: savings.goals.map((goal) => ({
        nazwa: goal.name,
        cel: goal.targetPln,
        odlozone: goal.savedPln,
        procent: Math.round(goal.pct),
        brakuje: goal.remainingPln,
        termin: goal.deadline,
        potrzebneTygodniowo: goal.requiredPerWeekPln,
        odkladaneTygodniowo: goal.actualPerWeekPln,
        tempo: goal.pace,
      })),
      lacznieOdlozone: savings.total.savedPln,
      lacznieCel: savings.total.targetPln,
    },

    platnosci: {
      kosztyStaleMiesiecznie: bills.summary.monthlyPln,
      kosztyStaleRocznie: bills.summary.yearlyPln,
      wgKategorii: bills.summary.byCategory,
      zalegle: bills.overdue.map((payment) => ({
        nazwa: payment.name,
        kwota: payment.amountPln,
        termin: payment.dueDate,
      })),
      najblizsze: bills.upcoming.slice(0, 8).map((payment) => ({
        nazwa: payment.name,
        kwota: payment.amountPln,
        termin: payment.dueDate,
      })),
    },

    lejek: {
      ...summarizeDeals(dealRows as DealInput[]),
      pozycje: dealRows
        .filter((row) => row.stage === "do-podpisania")
        .map((row) => ({ klient: row.clientName, kwota: row.valuePln, spodziewanyPodpis: row.expectedDate })),
    },

    sprzedaz: {
      tydzien: totals7,
      miesiac: totals30,
      konwersjeTydzien: conversionRates(totals7),
      konwersjeMiesiac: conversionRates(totals30),
      sredniaWartoscUmowy: totals30.contracts > 0 ? round(totals30.valuePln / totals30.contracts, 0) : null,
    },

    zdrowie: {
      wodaSredniaTydzienMl: round(water7, 0),
      wodaSredniaMiesiacMl: round(water30, 0),
      wodaOcenaTygodnia: waterStatus(water7, settings.waterGoalMl, settings.waterGoodPct, settings.waterOkPct),
      wagaObecnaKg: weightReported.at(-1)?.weightKg ?? null,
      wagaMiesiacTemuKg: weightReported[0]?.weightKg ?? null,
      dawkiZaplanowaneTydzien: dosesPlanned,
      dawkiPrzyjeteTydzien: dosesTaken,
      realizacjaLekowProcTydzien: ratio(dosesTaken, dosesPlanned),
    },

    planWagowy: weightPlan
      ? {
          startKg: weightPlan.startKg,
          celKg: weightPlan.targetKg,
          obecnaKg: weightPlan.currentKg,
          oczekiwanaDzisKg: round(weightPlan.expectedKg, 1),
          ocena: weightPlan.status,
          odchylenieKg: round(weightPlan.aheadKg, 1),
          tempoPlanowaneKgTydzien: round(weightPlan.plannedPacePerWeek, 2),
          tempoRzeczywisteKgTydzien: round(weightPlan.actualPacePerWeek, 2),
          dniDoTerminu: weightPlan.daysLeft,
        }
      : null,

    zdrowiePsychiczne: {
      samopoczucieSredniaTydzien: round(averageOfReportedDays(days7.map((d) => byDate.get(d)?.mood ?? null)), 1),
      energiaSredniaTydzien: round(averageOfReportedDays(days7.map((d) => byDate.get(d)?.energy ?? null)), 1),
      stresSredniaTydzien: round(averageOfReportedDays(days7.map((d) => byDate.get(d)?.stress ?? null)), 1),
      senSredniaGodzTydzien: round(averageOfReportedDays(days7.map((d) => byDate.get(d)?.sleepH ?? null)), 1),
      samopoczucieSredniaMiesiac: round(averageOfReportedDays(days30.map((d) => byDate.get(d)?.mood ?? null)), 1),
      stresSredniaMiesiac: round(averageOfReportedDays(days30.map((d) => byDate.get(d)?.stress ?? null)), 1),
      // Wpisy własne użytkownika z ostatniego tygodnia — surowe, bo to one niosą treść.
      wpisyTygodnia: logs
        .filter((log) => log.date >= start7 && (log.thoughts || log.goodThings))
        .map((log) => ({
          data: log.date,
          samopoczucie: log.mood,
          stres: log.stress,
          mysli: log.thoughts,
          coDobrego: log.goodThings,
        })),
    },

    zadania: {
      priorytetyTydzien: priorities7.length,
      priorytetyDomknieteTydzien: priorities7.filter((t) => t.done).length,
      realizacjaProcTydzien: ratio(priorities7.filter((t) => t.done).length, priorities7.length),
      realizacjaProcMiesiac: ratio(priorities30.filter((t) => t.done).length, priorities30.length),
    },

    trening: {
      zaplanowaneTydzien: plannedTrainings(days7),
      odbyteTydzien: doneTrainings(start7),
      realizacjaProcTydzien: ratio(doneTrainings(start7), plannedTrainings(days7)),
      realizacjaProcMiesiac: ratio(doneTrainings(start30), plannedTrainings(days30)),
      dyscypliny: [...new Set(planRows.map((p) => p.discipline))],
    },

    nauka: {
      zaplanowaneBlokiTydzien: plannedBlocks(days7),
      zrealizowaneBlokiTydzien: doneBlocks(start7),
      realizacjaProcTydzien: ratio(doneBlocks(start7), plannedBlocks(days7)),
      realizacjaProcMiesiac: ratio(doneBlocks(start30), plannedBlocks(days30)),
      minutyWgDziedzinyMiesiac: Object.fromEntries(minutesBySkill),
    },

    rekordy: currentRecords(recordRows).map((group) => ({
      dyscyplina: group.discipline,
      metryka: group.metric,
      wynik: group.best.value,
      jednostka: group.unit,
      data: group.best.achievedOn,
    })),

    projekty: projectRows.map((project) => ({
      nazwa: project.name,
      cel: project.goal,
      termin: project.deadline,
      nastepnyKrok: project.nextAction,
    })),
  };
}

export type Snapshot = Awaited<ReturnType<typeof buildSnapshot>>;

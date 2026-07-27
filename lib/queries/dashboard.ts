import "server-only";

import { and, asc, desc, eq, gte, inArray, lte } from "drizzle-orm";

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
  countdowns,
  projects,
  recommendations,
  salesDaily,
  tasks,
  trainingLogs,
  trainingPlans,
  type Settings,
} from "@/lib/db/schema";
import { addDays, isoWeekday, lastNDays, startOfMonth, startOfWeek } from "@/lib/domain/dates";
import { dayCashFlow, sumExpenses, sumIncome } from "@/lib/domain/finance";
import { learningBlocksForDate } from "@/lib/domain/learning";
import { medicationScheduleForDate, type MedicationRow } from "@/lib/domain/medication";
import { countdownFor, sortCountdowns } from "@/lib/domain/countdown";
import { currentRecords } from "@/lib/domain/records";
import { sumSales, type SalesTotals } from "@/lib/domain/sales";
import { averageOfReportedDays } from "@/lib/domain/water";
import { getObligationsOverview } from "@/lib/queries/obligations";
import { getSavingsOverview } from "@/lib/queries/savings";

const TREND_DAYS = 30;

export async function getDashboardData(userId: string, settings: Settings, today: string) {
  const trendStart = addDays(today, -(TREND_DAYS - 1));
  const weekStart = startOfWeek(today, settings.weekStartsOn);
  const monthStart = startOfMonth(today);
  const weekday = isoWeekday(today);

  const [
    logs,
    salesRows,
    contractRows,
    medRows,
    medLogRows,
    taskRows,
    planRows,
    trainingLogRows,
    weekPlanRows,
    yearPlanRows,
    learningLogRows,
    recordRows,
    recommendationRows,
    projectRows,
    countdownRows,
  ] = await Promise.all([
    db
      .select()
      .from(dailyLogs)
      .where(and(eq(dailyLogs.userId, userId), gte(dailyLogs.date, trendStart), lte(dailyLogs.date, today)))
      .orderBy(asc(dailyLogs.date)),

    db
      .select()
      .from(salesDaily)
      .where(and(eq(salesDaily.userId, userId), gte(salesDaily.date, monthStart), lte(salesDaily.date, today)))
      .orderBy(asc(salesDaily.date)),

    db
      .select()
      .from(contracts)
      .where(and(eq(contracts.userId, userId), gte(contracts.signedOn, monthStart), lte(contracts.signedOn, today)))
      .orderBy(desc(contracts.signedOn)),

    db.select().from(medications).where(eq(medications.userId, userId)).orderBy(asc(medications.position)),

    db
      .select()
      .from(medicationLogs)
      .where(and(eq(medicationLogs.userId, userId), eq(medicationLogs.date, today))),

    db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, userId), eq(tasks.date, today)))
      .orderBy(asc(tasks.kind), asc(tasks.position)),

    db
      .select()
      .from(trainingPlans)
      .where(and(eq(trainingPlans.userId, userId), eq(trainingPlans.weekday, weekday), eq(trainingPlans.active, true)))
      .orderBy(asc(trainingPlans.position)),

    db
      .select()
      .from(trainingLogs)
      .where(and(eq(trainingLogs.userId, userId), eq(trainingLogs.date, today))),

    db
      .select()
      .from(learningPlanWeek)
      .where(eq(learningPlanWeek.userId, userId))
      .orderBy(asc(learningPlanWeek.position)),

    db.select().from(learningPlanYear).where(eq(learningPlanYear.userId, userId)),

    db
      .select()
      .from(learningLogs)
      .where(and(eq(learningLogs.userId, userId), eq(learningLogs.date, today))),

    db.select().from(personalRecords).where(eq(personalRecords.userId, userId)),

    db
      .select()
      .from(recommendations)
      .where(and(eq(recommendations.userId, userId), inArray(recommendations.status, ["nowa", "przyjeta"])))
      .orderBy(desc(recommendations.forDate), asc(recommendations.priority))
      .limit(3),

    db
      .select()
      .from(projects)
      .where(and(eq(projects.userId, userId), eq(projects.status, "aktywny")))
      .orderBy(asc(projects.position))
      .limit(5),

    db
      .select()
      .from(countdowns)
      .where(and(eq(countdowns.userId, userId), eq(countdowns.active, true)))
      .orderBy(asc(countdowns.targetDate)),
  ]);

  // Cele i rachunki mają własne zapytania — kafelki dostają gotowy stan, nie surowe wiersze.
  const [savings, bills] = await Promise.all([
    getSavingsOverview(userId, today),
    getObligationsOverview(userId, today, 14),
  ]);

  const byDate = new Map(logs.map((log) => [log.date, log]));
  const trendDates = lastNDays(today, TREND_DAYS);
  const weekDates = lastNDays(today, 7);

  /* ------------------------------------------------------------- finanse */

  const cashSeries = trendDates.map((date) => byDate.get(date)?.cashBalancePln ?? null);
  const cashReported = logs.filter((log) => log.cashBalancePln !== null);
  const currentCash = cashReported.at(-1) ?? null;
  const previousCash = cashReported.at(-2) ?? null;

  const todayFlow = dayCashFlow({
    expensesPln: byDate.get(today)?.expensesPln,
    incomePln: byDate.get(today)?.incomePln,
  });
  // Wydatki tygodnia liczymy tylko z dni, w których je zapisano — brak wpisu to nie zero.
  const weekFlows = logs.filter((log) => log.date >= weekStart).map((log) => dayCashFlow(log));
  const weekSpent = sumExpenses(weekFlows);
  const weekEarned = sumIncome(weekFlows);

  /* ------------------------------------------------------------ sprzedaż */

  const salesToday = salesRows.find((row) => row.date === today) ?? null;
  const salesWeekRows = salesRows.filter((row) => row.date >= weekStart);
  const contractsWeek = contractRows.filter((row) => row.signedOn >= weekStart && row.status === "podpisana");
  const contractsMonth = contractRows.filter((row) => row.status === "podpisana");

  const weekTotals: SalesTotals = {
    ...sumSales(salesWeekRows),
    contracts: contractsWeek.length,
    valuePln: contractsWeek.reduce((sum, row) => sum + row.valuePln, 0),
  };

  const monthTotals: SalesTotals = {
    ...sumSales(salesRows),
    contracts: contractsMonth.length,
    valuePln: contractsMonth.reduce((sum, row) => sum + row.valuePln, 0),
  };

  /* --------------------------------------------------- leki i suplementy */

  const doses = medicationScheduleForDate(today, medRows as MedicationRow[], medLogRows);

  /* --------------------------------------------------------- nawodnienie */

  const waterToday = byDate.get(today)?.waterMl ?? null;
  const waterWeekValues = weekDates.map((date) => byDate.get(date)?.waterMl ?? null);
  const waterWeekAvg = averageOfReportedDays(waterWeekValues);

  /* ---------------------------------------------------------------- waga */

  const weightSeries = trendDates.map((date) => byDate.get(date)?.weightKg ?? null);
  const weightReported = logs.filter((log) => log.weightKg !== null);
  const currentWeight = weightReported.at(-1) ?? null;
  const previousWeight = weightReported.at(-2) ?? null;

  /* ------------------------------------------------------------- trening */

  const trainingToday = planRows.map((plan) => ({
    plan,
    log: trainingLogRows.find((log) => log.planId === plan.id) ?? null,
  }));
  const extraTrainingLogs = trainingLogRows.filter((log) => !log.planId);

  /* --------------------------------------------------------------- nauka */

  const learningBlocks = learningBlocksForDate(today, weekPlanRows, yearPlanRows);
  const learningToday = learningBlocks.map((block) => ({
    block,
    log: learningLogRows.find((log) => log.planId === block.planId) ?? null,
  }));

  return {
    today,
    weekStart,
    monthStart,

    finanse: {
      current: currentCash,
      previous: previousCash,
      series: cashSeries,
      dates: trendDates,
      todayFlow,
      weekSpentPln: weekSpent.days > 0 ? weekSpent.totalPln : null,
      weekEarnedPln: weekEarned.days > 0 ? weekEarned.totalPln : null,
    },

    oszczednosci: savings,
    platnosci: bills,
    odliczanie: sortCountdowns(countdownRows.map((row) => countdownFor(row, today))),

    sprzedaz: {
      today: salesToday,
      week: weekTotals,
      month: monthTotals,
      recentContracts: contractRows.slice(0, 5),
    },

    zdrowie: {
      doses,
      hasMedications: medRows.length > 0,
      water: { today: waterToday, weekAverage: waterWeekAvg, weekValues: waterWeekValues, dates: weekDates },
      weight: { current: currentWeight, previous: previousWeight, series: weightSeries },
      sleep: byDate.get(today)?.sleepH ?? null,
      energy: byDate.get(today)?.energy ?? null,
    },

    psychika: {
      dzis: {
        mood: byDate.get(today)?.mood ?? null,
        energy: byDate.get(today)?.energy ?? null,
        stress: byDate.get(today)?.stress ?? null,
        sleepH: byDate.get(today)?.sleepH ?? null,
        thoughts: byDate.get(today)?.thoughts ?? null,
        goodThings: byDate.get(today)?.goodThings ?? null,
      },
      srednieTygodnia: {
        mood: averageOfReportedDays(weekDates.map((d) => byDate.get(d)?.mood ?? null)),
        energy: averageOfReportedDays(weekDates.map((d) => byDate.get(d)?.energy ?? null)),
        stress: averageOfReportedDays(weekDates.map((d) => byDate.get(d)?.stress ?? null)),
        sleepH: averageOfReportedDays(weekDates.map((d) => byDate.get(d)?.sleepH ?? null)),
      },
      // Ostatnie dobre rzeczy — po to, żeby dało się do nich wrócić.
      ostatnieDobre: logs
        .filter((log) => log.goodThings)
        .slice(-3)
        .reverse()
        .map((log) => ({ date: log.date, text: log.goodThings! })),
    },

    zadania: {
      priorytety: taskRows.filter((task) => task.kind === "priorytet"),
      side: taskRows.filter((task) => task.kind === "side"),
    },

    trening: { planned: trainingToday, extra: extraTrainingLogs, hasPlan: planRows.length > 0 },

    nauka: { blocks: learningToday, hasPlan: weekPlanRows.length > 0 },

    rekordy: currentRecords(recordRows),

    mentor: recommendationRows,

    projekty: projectRows,
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;

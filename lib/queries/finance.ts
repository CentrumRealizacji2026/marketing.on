import "server-only";

import { and, asc, desc, eq, gte, isNotNull, lt } from "drizzle-orm";

import { db } from "@/lib/db";
import { dailyLogs } from "@/lib/db/schema";
import type { BalanceRow } from "@/lib/domain/finance";

const balanceColumns = {
  date: dailyLogs.date,
  cashBalancePln: dailyLogs.cashBalancePln,
  cashBalanceNetPln: dailyLogs.cashBalanceNetPln,
  incomePln: dailyLogs.incomePln,
  expensesPln: dailyLogs.expensesPln,
};

/**
 * Wiersze sprzed okna strony potrzebne do salda na żywo: od ostatniego wpisu
 * stanu środków sprzed `windowStart` do początku okna (wyłącznie). Sama kotwica
 * nie wystarczy — przepływy z dni między nią a oknem też wchodzą do sumy.
 * Wynik skleja się z wierszami okna: `[...preRows, ...logs]`.
 */
export async function getBalanceRowsBefore(userId: string, windowStart: string): Promise<BalanceRow[]> {
  const [anchor] = await db
    .select({ date: dailyLogs.date })
    .from(dailyLogs)
    .where(
      and(eq(dailyLogs.userId, userId), lt(dailyLogs.date, windowStart), isNotNull(dailyLogs.cashBalancePln)),
    )
    .orderBy(desc(dailyLogs.date))
    .limit(1);

  if (!anchor) return [];

  return db
    .select(balanceColumns)
    .from(dailyLogs)
    .where(and(eq(dailyLogs.userId, userId), gte(dailyLogs.date, anchor.date), lt(dailyLogs.date, windowStart)))
    .orderBy(asc(dailyLogs.date));
}

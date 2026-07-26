import "server-only";

import { and, asc, eq, gte, lte } from "drizzle-orm";

import { db } from "@/lib/db";
import { obligationPayments, obligations } from "@/lib/db/schema";
import { addDays } from "@/lib/domain/dates";
import {
  paymentsInRange,
  summarizeObligations,
  type ObligationInput,
  type PaymentOccurrence,
} from "@/lib/domain/obligations";

/** Ile dni wstecz szukamy zaległości — dalej i tak nikt już nie nadrabia z kafelka. */
const OVERDUE_WINDOW_DAYS = 60;

async function loadActive(userId: string) {
  return db
    .select()
    .from(obligations)
    .where(and(eq(obligations.userId, userId), eq(obligations.active, true)))
    .orderBy(asc(obligations.position));
}

async function loadPayments(userId: string, from: string, to: string) {
  return db
    .select()
    .from(obligationPayments)
    .where(
      and(
        eq(obligationPayments.userId, userId),
        gte(obligationPayments.dueDate, from),
        lte(obligationPayments.dueDate, to),
      ),
    );
}

/** Terminy płatności w przedziale — używane przez kalendarz. */
export async function getPaymentsInRange(
  userId: string,
  from: string,
  to: string,
  today: string,
): Promise<PaymentOccurrence[]> {
  const rows = await loadActive(userId);
  if (rows.length === 0) return [];
  const payments = await loadPayments(userId, from, to);
  return paymentsInRange(rows as ObligationInput[], payments, from, to, today);
}

/**
 * Stan zobowiązań: suma kosztów stałych, najbliższe terminy i zaległości.
 * Jedno źródło dla kafelka na dashboardzie i dla strony finansów.
 */
export async function getObligationsOverview(userId: string, today: string, horizonDays = 30) {
  const rows = await loadActive(userId);
  const summary = summarizeObligations(rows as ObligationInput[], today);

  if (rows.length === 0) {
    return { obligations: rows, summary, upcoming: [] as PaymentOccurrence[], overdue: [] as PaymentOccurrence[] };
  }

  const from = addDays(today, -OVERDUE_WINDOW_DAYS);
  const to = addDays(today, horizonDays);
  const payments = await loadPayments(userId, from, to);
  const all = paymentsInRange(rows as ObligationInput[], payments, from, to, today);

  return {
    obligations: rows,
    summary,
    upcoming: all.filter((p) => p.dueDate >= today && p.status !== "zaplacone"),
    overdue: all.filter((p) => p.status === "zalegle"),
  };
}

/**
 * Płatności do odhaczenia w raporcie z danego dnia: wypadające tego dnia oraz
 * zaległe sprzed niego. Zapłacone tego dnia zostają, żeby dało się cofnąć zaznaczenie.
 */
export async function getPaymentsForReport(userId: string, date: string): Promise<PaymentOccurrence[]> {
  const rows = await loadActive(userId);
  if (rows.length === 0) return [];

  const from = addDays(date, -OVERDUE_WINDOW_DAYS);
  const payments = await loadPayments(userId, from, date);
  const all = paymentsInRange(rows as ObligationInput[], payments, from, date, date);

  // Terminy z tego dnia zawsze; wcześniejsze tylko wtedy, gdy wciąż wiszą.
  return all.filter((p) => p.dueDate === date || p.status === "zalegle");
}

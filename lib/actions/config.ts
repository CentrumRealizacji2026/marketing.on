"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray, notInArray } from "drizzle-orm";
import type { z } from "zod";

import { db } from "@/lib/db";
import {
  dailyLogs,
  learningPlanWeek,
  learningPlanYear,
  materials,
  medications,
  personalRecords,
  projects,
  settings,
  trainingPlans,
  users,
} from "@/lib/db/schema";
import { getUserSettings, requireUser } from "@/lib/auth/session";
import { todayInTz } from "@/lib/domain/dates";
import {
  financeStartSchema,
  goalsSchema,
  learningWeekSchema,
  learningYearSchema,
  materialSchema,
  medicationSchema,
  personalRecordSchema,
  profileSchema,
  projectSchema,
  rowsPayload,
  trainingPlanSchema,
} from "@/lib/validation/config";

export type FormState = { error?: string; ok?: boolean } | undefined;

function firstIssue(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Nieprawidłowe dane.";
  const where = issue.path.length > 1 ? ` (pozycja ${Number(issue.path[0]) + 1})` : "";
  return `${issue.message}${where}`;
}

function refresh() {
  revalidatePath("/", "layout");
}

/**
 * Krok kreatora zapisuje ten sam formularz co panel zarządzania, a dodatkowo
 * przesuwa użytkownika do kolejnego kroku.
 */
async function afterSave(userId: string, formData: FormData): Promise<FormState> {
  const step = formData.get("step");
  const nextHref = formData.get("next");

  if (step !== null) {
    await db
      .update(users)
      .set({ onboardingStep: Number(step) || 0, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  refresh();

  if (typeof nextHref === "string" && nextHref.startsWith("/")) {
    redirect(nextHref);
  }
  return { ok: true };
}

/* ------------------------------------------------------------------ leki */

export async function saveMedications(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = rowsPayload(medicationSchema).safeParse(formData.get("rows"));
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const rows = parsed.data;
  const keepIds = rows.map((row) => row.id).filter((value): value is string => Boolean(value));

  // Pozycje usunięte z formularza są wyłączane, nie kasowane — historia przyjmowania zostaje.
  await db
    .update(medications)
    .set({ active: false })
    .where(
      and(
        eq(medications.userId, user.id),
        keepIds.length > 0 ? notInArray(medications.id, keepIds) : undefined,
      ),
    );

  for (const [index, row] of rows.entries()) {
    const values = {
      name: row.name,
      kind: row.kind,
      doseAmount: row.doseAmount,
      doseUnit: row.doseUnit,
      timesOfDay: row.timesOfDay,
      daysOfWeek: row.daysOfWeek,
      startDate: row.startDate,
      endDate: row.endDate,
      notes: row.notes,
      position: index,
      active: true,
    };

    if (row.id) {
      await db
        .update(medications)
        .set(values)
        .where(and(eq(medications.id, row.id), eq(medications.userId, user.id)));
    } else {
      await db.insert(medications).values({ ...values, userId: user.id });
    }
  }

  return afterSave(user.id, formData);
}

/* --------------------------------------------------------------- trening */

export async function saveTrainingPlans(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = rowsPayload(trainingPlanSchema).safeParse(formData.get("rows"));
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const rows = parsed.data;
  const keepIds = rows.map((row) => row.id).filter((value): value is string => Boolean(value));

  await db
    .update(trainingPlans)
    .set({ active: false })
    .where(
      and(
        eq(trainingPlans.userId, user.id),
        keepIds.length > 0 ? notInArray(trainingPlans.id, keepIds) : undefined,
      ),
    );

  for (const [index, row] of rows.entries()) {
    const values = {
      weekday: row.weekday,
      discipline: row.discipline,
      title: row.title,
      startTime: row.startTime,
      durationMin: row.durationMin,
      note: row.note,
      position: index,
      active: true,
    };

    if (row.id) {
      await db
        .update(trainingPlans)
        .set(values)
        .where(and(eq(trainingPlans.id, row.id), eq(trainingPlans.userId, user.id)));
    } else {
      await db.insert(trainingPlans).values({ ...values, userId: user.id });
    }
  }

  return afterSave(user.id, formData);
}

export async function savePersonalRecords(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = rowsPayload(personalRecordSchema).safeParse(formData.get("rows"));
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const rows = parsed.data;
  const keepIds = rows.map((row) => row.id).filter((value): value is string => Boolean(value));

  await db
    .delete(personalRecords)
    .where(
      and(
        eq(personalRecords.userId, user.id),
        keepIds.length > 0 ? notInArray(personalRecords.id, keepIds) : undefined,
      ),
    );

  for (const row of rows) {
    const values = {
      discipline: row.discipline,
      metric: row.metric,
      unit: row.unit,
      value: row.value,
      higherIsBetter: row.higherIsBetter,
      achievedOn: row.achievedOn,
      note: row.note,
    };

    if (row.id) {
      await db
        .update(personalRecords)
        .set(values)
        .where(and(eq(personalRecords.id, row.id), eq(personalRecords.userId, user.id)));
    } else {
      await db.insert(personalRecords).values({ ...values, userId: user.id });
    }
  }

  return afterSave(user.id, formData);
}

/* ----------------------------------------------------------------- nauka */

export async function saveLearningWeek(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = rowsPayload(learningWeekSchema).safeParse(formData.get("rows"));
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const rows = parsed.data;
  const keepIds = rows.map((row) => row.id).filter((value): value is string => Boolean(value));

  await db
    .update(learningPlanWeek)
    .set({ active: false })
    .where(
      and(
        eq(learningPlanWeek.userId, user.id),
        keepIds.length > 0 ? notInArray(learningPlanWeek.id, keepIds) : undefined,
      ),
    );

  for (const [index, row] of rows.entries()) {
    const values = {
      weekday: row.weekday,
      skill: row.skill,
      startTime: row.startTime,
      durationMin: row.durationMin,
      position: index,
      active: true,
    };

    if (row.id) {
      await db
        .update(learningPlanWeek)
        .set(values)
        .where(and(eq(learningPlanWeek.id, row.id), eq(learningPlanWeek.userId, user.id)));
    } else {
      await db.insert(learningPlanWeek).values({ ...values, userId: user.id });
    }
  }

  return afterSave(user.id, formData);
}

export async function saveLearningYear(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = rowsPayload(learningYearSchema).safeParse(formData.get("rows"));
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const rows = parsed.data;
  const keepIds = rows.map((row) => row.id).filter((value): value is string => Boolean(value));

  await db
    .delete(learningPlanYear)
    .where(
      and(
        eq(learningPlanYear.userId, user.id),
        keepIds.length > 0 ? notInArray(learningPlanYear.id, keepIds) : undefined,
      ),
    );

  for (const [index, row] of rows.entries()) {
    const values = {
      periodStart: row.periodStart,
      periodEnd: row.periodEnd,
      skill: row.skill,
      focus: row.focus,
      target: row.target,
      position: index,
    };

    if (row.id) {
      await db
        .update(learningPlanYear)
        .set(values)
        .where(and(eq(learningPlanYear.id, row.id), eq(learningPlanYear.userId, user.id)));
    } else {
      await db.insert(learningPlanYear).values({ ...values, userId: user.id });
    }
  }

  return afterSave(user.id, formData);
}

export async function saveMaterials(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = rowsPayload(materialSchema).safeParse(formData.get("rows"));
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const rows = parsed.data;
  const keepIds = rows.map((row) => row.id).filter((value): value is string => Boolean(value));

  await db
    .delete(materials)
    .where(
      and(eq(materials.userId, user.id), keepIds.length > 0 ? notInArray(materials.id, keepIds) : undefined),
    );

  for (const [index, row] of rows.entries()) {
    const values = {
      skill: row.skill,
      title: row.title,
      type: row.type,
      url: row.url,
      progressPct: row.progressPct,
      note: row.note,
      position: index,
    };

    if (row.id) {
      await db
        .update(materials)
        .set(values)
        .where(and(eq(materials.id, row.id), eq(materials.userId, user.id)));
    } else {
      await db.insert(materials).values({ ...values, userId: user.id });
    }
  }

  return afterSave(user.id, formData);
}

/* -------------------------------------------------------------- projekty */

export async function saveProjects(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = rowsPayload(projectSchema).safeParse(formData.get("rows"));
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const rows = parsed.data;
  const keepIds = rows.map((row) => row.id).filter((value): value is string => Boolean(value));

  await db
    .delete(projects)
    .where(
      and(eq(projects.userId, user.id), keepIds.length > 0 ? notInArray(projects.id, keepIds) : undefined),
    );

  for (const [index, row] of rows.entries()) {
    const values = {
      name: row.name,
      goal: row.goal,
      status: row.status,
      deadline: row.deadline,
      nextAction: row.nextAction,
      position: index,
    };

    if (row.id) {
      await db
        .update(projects)
        .set(values)
        .where(and(eq(projects.id, row.id), eq(projects.userId, user.id)));
    } else {
      await db.insert(projects).values({ ...values, userId: user.id });
    }
  }

  return afterSave(user.id, formData);
}

/* ------------------------------------------------------------ ustawienia */

export async function saveProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    timezone: formData.get("timezone"),
    currency: formData.get("currency"),
    weekStartsOn: formData.get("weekStartsOn"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  await db
    .update(users)
    .set({ name: parsed.data.name, updatedAt: new Date() })
    .where(eq(users.id, user.id));

  await db
    .insert(settings)
    .values({
      userId: user.id,
      timezone: parsed.data.timezone,
      currency: parsed.data.currency,
      weekStartsOn: parsed.data.weekStartsOn,
    })
    .onConflictDoUpdate({
      target: settings.userId,
      set: {
        timezone: parsed.data.timezone,
        currency: parsed.data.currency,
        weekStartsOn: parsed.data.weekStartsOn,
        updatedAt: new Date(),
      },
    });

  return afterSave(user.id, formData);
}

export async function saveFinanceStart(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = financeStartSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const userSettings = await getUserSettings(user.id);
  const today = todayInTz(userSettings.timezone);

  if (parsed.data.cashBalancePln !== null) {
    await db
      .insert(dailyLogs)
      .values({ userId: user.id, date: today, cashBalancePln: parsed.data.cashBalancePln })
      .onConflictDoUpdate({
        target: [dailyLogs.userId, dailyLogs.date],
        set: { cashBalancePln: parsed.data.cashBalancePln, updatedAt: new Date() },
      });
  }

  const goalValue = { monthlyRevenueGoalPln: parsed.data.monthlyRevenueGoalPln, updatedAt: new Date() };
  await db
    .insert(settings)
    .values({ userId: user.id, ...goalValue })
    .onConflictDoUpdate({ target: settings.userId, set: goalValue });

  return afterSave(user.id, formData);
}

export async function saveGoals(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = goalsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  if (parsed.data.currentWeightKg !== null && parsed.data.currentWeightKg !== undefined) {
    const userSettings = await getUserSettings(user.id);
    const today = todayInTz(userSettings.timezone);
    await db
      .insert(dailyLogs)
      .values({ userId: user.id, date: today, weightKg: parsed.data.currentWeightKg })
      .onConflictDoUpdate({
        target: [dailyLogs.userId, dailyLogs.date],
        set: { weightKg: parsed.data.currentWeightKg, updatedAt: new Date() },
      });
  }

  const values = {
    waterGoalMl: parsed.data.waterGoalMl === null ? null : Math.round(parsed.data.waterGoalMl),
    waterGoodPct: parsed.data.waterGoodPct,
    waterOkPct: parsed.data.waterOkPct,
    weightTargetKg: parsed.data.weightTargetKg,
    goalCallsPerDay: parsed.data.goalCallsPerDay === null ? null : Math.round(parsed.data.goalCallsPerDay),
    goalMeetingsScheduledPerDay:
      parsed.data.goalMeetingsScheduledPerDay === null ? null : Math.round(parsed.data.goalMeetingsScheduledPerDay),
    goalMeetingsHeldPerDay:
      parsed.data.goalMeetingsHeldPerDay === null ? null : Math.round(parsed.data.goalMeetingsHeldPerDay),
    goalContractsPerWeek:
      parsed.data.goalContractsPerWeek === null ? null : Math.round(parsed.data.goalContractsPerWeek),
    monthlyRevenueGoalPln: parsed.data.monthlyRevenueGoalPln,
    updatedAt: new Date(),
  };

  await db
    .insert(settings)
    .values({ userId: user.id, ...values })
    .onConflictDoUpdate({ target: settings.userId, set: values });

  return afterSave(user.id, formData);
}

/** Zamknięcie kreatora — od tej chwili wchodzi się prosto na dashboard. */
export async function finishOnboarding(): Promise<void> {
  const user = await requireUser();
  await db
    .update(users)
    .set({ onboardedAt: new Date(), onboardingStep: 11, updatedAt: new Date() })
    .where(eq(users.id, user.id));
  refresh();
  redirect("/");
}

/** Wejście do kreatora ponownie, np. żeby przejść konfigurację od nowa. */
export async function reopenOnboarding(): Promise<void> {
  const user = await requireUser();
  await db.update(users).set({ onboardedAt: null, onboardingStep: 0 }).where(eq(users.id, user.id));
  refresh();
  redirect("/start");
}

export async function deleteRowsById(table: "materials" | "projects", ids: string[]): Promise<void> {
  const user = await requireUser();
  if (ids.length === 0) return;
  if (table === "materials") {
    await db.delete(materials).where(and(eq(materials.userId, user.id), inArray(materials.id, ids)));
  } else {
    await db.delete(projects).where(and(eq(projects.userId, user.id), inArray(projects.id, ids)));
  }
  refresh();
}

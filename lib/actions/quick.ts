"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  dailyLogs,
  learningLogs,
  learningPlanWeek,
  medicationLogs,
  medications,
  tasks,
  trainingLogs,
  trainingPlans,
} from "@/lib/db/schema";
import { getUserSettings, requireUser } from "@/lib/auth/session";
import { todayInTz } from "@/lib/domain/dates";

/**
 * Szybkie akcje z dashboardu. Każda sprawdza sesję i filtruje po użytkowniku,
 * więc identyfikator z formularza nie daje dostępu do cudzych danych.
 */

async function currentContext() {
  const user = await requireUser();
  const settings = await getUserSettings(user.id);
  return { user, settings, today: todayInTz(settings.timezone) };
}

function refresh() {
  revalidatePath("/");
  revalidatePath("/zdrowie");
  revalidatePath("/zadania");
  revalidatePath("/trening");
  revalidatePath("/nauka");
}

export async function toggleDose(formData: FormData) {
  const { user, today } = await currentContext();
  const medicationId = String(formData.get("medicationId") ?? "");
  const slot = String(formData.get("slot") ?? "");
  const date = String(formData.get("date") ?? today);
  const taken = formData.get("taken") === "1";

  if (!medicationId || !slot) return;

  // Potwierdzenie, że lek należy do zalogowanego użytkownika.
  const [owned] = await db
    .select({ id: medications.id })
    .from(medications)
    .where(and(eq(medications.id, medicationId), eq(medications.userId, user.id)))
    .limit(1);
  if (!owned) return;

  await db
    .insert(medicationLogs)
    .values({ userId: user.id, medicationId, date, slot, taken, takenAt: taken ? new Date() : null })
    .onConflictDoUpdate({
      target: [medicationLogs.medicationId, medicationLogs.date, medicationLogs.slot],
      set: { taken, takenAt: taken ? new Date() : null },
    });

  refresh();
}

export async function toggleTask(formData: FormData) {
  const { user } = await currentContext();
  const taskId = String(formData.get("taskId") ?? "");
  if (!taskId) return;

  await db
    .update(tasks)
    .set({ done: sql`not ${tasks.done}`, doneAt: sql`case when ${tasks.done} then null else now() end` })
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, user.id)));

  refresh();
}

export async function toggleTraining(formData: FormData) {
  const { user, today } = await currentContext();
  const planId = String(formData.get("planId") ?? "");
  const date = String(formData.get("date") ?? today);
  const done = formData.get("done") === "1";
  if (!planId) return;

  const [plan] = await db
    .select()
    .from(trainingPlans)
    .where(and(eq(trainingPlans.id, planId), eq(trainingPlans.userId, user.id)))
    .limit(1);
  if (!plan) return;

  const [existing] = await db
    .select({ id: trainingLogs.id })
    .from(trainingLogs)
    .where(and(eq(trainingLogs.userId, user.id), eq(trainingLogs.date, date), eq(trainingLogs.planId, planId)))
    .limit(1);

  if (done) {
    if (existing) {
      await db.update(trainingLogs).set({ done: true }).where(eq(trainingLogs.id, existing.id));
    } else {
      await db.insert(trainingLogs).values({
        userId: user.id,
        date,
        discipline: plan.discipline,
        title: plan.title,
        durationMin: plan.durationMin,
        planId,
        done: true,
      });
    }
  } else if (existing) {
    await db.delete(trainingLogs).where(eq(trainingLogs.id, existing.id));
  }

  refresh();
}

export async function toggleLearning(formData: FormData) {
  const { user, today } = await currentContext();
  const planId = String(formData.get("planId") ?? "");
  const date = String(formData.get("date") ?? today);
  const done = formData.get("done") === "1";
  if (!planId) return;

  const [plan] = await db
    .select()
    .from(learningPlanWeek)
    .where(and(eq(learningPlanWeek.id, planId), eq(learningPlanWeek.userId, user.id)))
    .limit(1);
  if (!plan) return;

  const [existing] = await db
    .select({ id: learningLogs.id })
    .from(learningLogs)
    .where(and(eq(learningLogs.userId, user.id), eq(learningLogs.date, date), eq(learningLogs.planId, planId)))
    .limit(1);

  if (done) {
    if (existing) {
      await db.update(learningLogs).set({ done: true }).where(eq(learningLogs.id, existing.id));
    } else {
      await db.insert(learningLogs).values({
        userId: user.id,
        date,
        skill: plan.skill,
        minutes: plan.durationMin,
        planId,
        done: true,
      });
    }
  } else if (existing) {
    await db.delete(learningLogs).where(eq(learningLogs.id, existing.id));
  }

  refresh();
}

export async function addWater(formData: FormData) {
  const { user, today } = await currentContext();
  const amount = Number(formData.get("amount") ?? 0);
  const date = String(formData.get("date") ?? today);
  if (!Number.isFinite(amount) || amount === 0) return;

  await db
    .insert(dailyLogs)
    .values({ userId: user.id, date, waterMl: Math.max(amount, 0) })
    .onConflictDoUpdate({
      target: [dailyLogs.userId, dailyLogs.date],
      set: {
        waterMl: sql`greatest(coalesce(${dailyLogs.waterMl}, 0) + ${amount}, 0)`,
        updatedAt: new Date(),
      },
    });

  refresh();
}

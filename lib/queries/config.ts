import "server-only";

import { and, asc, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  learningPlanWeek,
  learningPlanYear,
  materials,
  medications,
  obligations,
  personalRecords,
  projects,
  savingsGoals,
  trainingPlans,
} from "@/lib/db/schema";

/** Konfiguracja użytkownika — wspólne źródło dla kreatora i panelu zarządzania. */

export function getMedications(userId: string) {
  return db
    .select()
    .from(medications)
    .where(and(eq(medications.userId, userId), eq(medications.active, true)))
    .orderBy(asc(medications.position));
}

export function getTrainingPlans(userId: string) {
  return db
    .select()
    .from(trainingPlans)
    .where(and(eq(trainingPlans.userId, userId), eq(trainingPlans.active, true)))
    .orderBy(asc(trainingPlans.weekday), asc(trainingPlans.position));
}

export function getPersonalRecords(userId: string) {
  return db
    .select()
    .from(personalRecords)
    .where(eq(personalRecords.userId, userId))
    .orderBy(asc(personalRecords.discipline), desc(personalRecords.achievedOn));
}

export function getLearningWeek(userId: string) {
  return db
    .select()
    .from(learningPlanWeek)
    .where(and(eq(learningPlanWeek.userId, userId), eq(learningPlanWeek.active, true)))
    .orderBy(asc(learningPlanWeek.weekday), asc(learningPlanWeek.position));
}

export function getLearningYear(userId: string) {
  return db
    .select()
    .from(learningPlanYear)
    .where(eq(learningPlanYear.userId, userId))
    .orderBy(asc(learningPlanYear.periodStart));
}

export function getMaterials(userId: string) {
  return db.select().from(materials).where(eq(materials.userId, userId)).orderBy(asc(materials.position));
}

export function getProjects(userId: string) {
  return db.select().from(projects).where(eq(projects.userId, userId)).orderBy(asc(projects.position));
}

export function getSavingsGoals(userId: string) {
  return db
    .select()
    .from(savingsGoals)
    .where(and(eq(savingsGoals.userId, userId), eq(savingsGoals.active, true)))
    .orderBy(asc(savingsGoals.position));
}

export function getObligations(userId: string) {
  return db
    .select()
    .from(obligations)
    .where(and(eq(obligations.userId, userId), eq(obligations.active, true)))
    .orderBy(asc(obligations.position));
}

/** Ile sekcji konfiguracji jest już wypełnionych — napędza podpowiedzi „skonfiguruj →". */
export async function getConfigStatus(userId: string) {
  const [meds, training, records, week, year, project, material, savings, bills] = await Promise.all([
    getMedications(userId),
    getTrainingPlans(userId),
    getPersonalRecords(userId),
    getLearningWeek(userId),
    getLearningYear(userId),
    getProjects(userId),
    getMaterials(userId),
    getSavingsGoals(userId),
    getObligations(userId),
  ]);

  return {
    medications: meds.length,
    trainingPlans: training.length,
    personalRecords: records.length,
    learningWeek: week.length,
    learningYear: year.length,
    projects: project.length,
    materials: material.length,
    savingsGoals: savings.length,
    obligations: bills.length,
  };
}

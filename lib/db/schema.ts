import { relations, sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Zasada przewodnia schematu: nic, co dotyczy użytkownika, nie jest zaszyte w kodzie.
 * Dyscypliny sportowe, dziedziny nauki, nazwy leków, metryki rekordów i cele to zwykłe
 * wiersze zakładane przez użytkownika w kreatorze i edytowalne w panelu zarządzania.
 *
 * Pozycje konfiguracyjne (leki, plan treningu, plan nauki) mają `active` oraz zakres dat,
 * dzięki czemu zmiana dawki czy godziny nie fałszuje historii — stary wpis jest zamykany,
 * a nie nadpisywany.
 */

export type MedicationKind = "lek" | "suplement";
export type ContractStatus = "negocjacje" | "podpisana" | "anulowana";
export type TaskKind = "priorytet" | "side";
export type ProjectStatus = "aktywny" | "wstrzymany" | "zakonczony";
export type MaterialType = "wideo" | "pdf" | "kurs" | "ksiazka" | "inne";
export type RecommendationStatus = "nowa" | "przyjeta" | "zrobiona" | "odrzucona";
export type MentorMode = "mentor" | "trener" | "pm";

/* ------------------------------------------------------------------ konto */

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    name: text("name"),
    /** Null dopóki kreator profilu nie zostanie ukończony. */
    onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
    /** Ostatni ukończony krok kreatora — pozwala wrócić tam, gdzie się skończyło. */
    onboardingStep: integer("onboarding_step").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_key").on(sql`lower(${t.email})`)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Przechowujemy wyłącznie skrót tokenu — wyciek bazy nie daje dostępu do sesji. */
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("sessions_token_hash_key").on(t.tokenHash), index("sessions_user_idx").on(t.userId)],
);

/* ------------------------------------------------------- ustawienia i cele */

export const settings = pgTable("settings", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  timezone: text("timezone").notNull().default("Europe/Warsaw"),
  currency: text("currency").notNull().default("PLN"),
  /** 1 = poniedziałek (ISO). */
  weekStartsOn: integer("week_starts_on").notNull().default(1),

  // Nawodnienie — cel i własne progi kategorii "dobrze / w normie / źle".
  waterGoalMl: integer("water_goal_ml"),
  waterGoodPct: integer("water_good_pct").notNull().default(100),
  waterOkPct: integer("water_ok_pct").notNull().default(80),

  // Plan wagowy: punkt startowy i cel z terminem pozwalają ocenić, czy tempo jest zgodne z planem.
  weightTargetKg: numeric("weight_target_kg", { precision: 5, scale: 2, mode: "number" }),
  weightTargetDate: date("weight_target_date", { mode: "string" }),
  weightStartKg: numeric("weight_start_kg", { precision: 5, scale: 2, mode: "number" }),
  weightStartDate: date("weight_start_date", { mode: "string" }),

  // Cele sprzedażowe.
  goalCallsPerDay: integer("goal_calls_per_day"),
  goalMeetingsScheduledPerDay: integer("goal_meetings_scheduled_per_day"),
  goalMeetingsHeldPerDay: integer("goal_meetings_held_per_day"),
  goalContractsPerWeek: integer("goal_contracts_per_week"),
  monthlyRevenueGoalPln: numeric("monthly_revenue_goal_pln", { precision: 12, scale: 2, mode: "number" }),

  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------------------------------------ dzień: dane */

export const dailyLogs = pgTable(
  "daily_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    cashBalancePln: numeric("cash_balance_pln", { precision: 12, scale: 2, mode: "number" }),
    weightKg: numeric("weight_kg", { precision: 5, scale: 2, mode: "number" }),
    waterMl: integer("water_ml"),
    sleepH: numeric("sleep_h", { precision: 3, scale: 1, mode: "number" }),
    mood: integer("mood"),
    energy: integer("energy"),
    /** Poziom stresu 1–5, gdzie 5 to najwyższy. */
    stress: integer("stress"),
    /** Co chodzi po głowie — swobodny wpis, wyłącznie dla użytkownika i mentora. */
    thoughts: text("thoughts"),
    /** Co dobrego się dziś wydarzyło. */
    goodThings: text("good_things"),
    notes: text("notes"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("daily_logs_user_date_key").on(t.userId, t.date)],
);

/* ---------------------------------------------------------------- sprzedaż */

export const salesDaily = pgTable(
  "sales_daily",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    calls: integer("calls").notNull().default(0),
    meetingsScheduled: integer("meetings_scheduled").notNull().default(0),
    meetingsHeld: integer("meetings_held").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("sales_daily_user_date_key").on(t.userId, t.date)],
);

export const contracts = pgTable(
  "contracts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    signedOn: date("signed_on", { mode: "string" }).notNull(),
    clientName: text("client_name").notNull(),
    valuePln: numeric("value_pln", { precision: 12, scale: 2, mode: "number" }).notNull(),
    status: text("status").$type<ContractStatus>().notNull().default("podpisana"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("contracts_user_date_idx").on(t.userId, t.signedOn)],
);

/* --------------------------------------------------- zdrowie: leki i suple */

export const medications = pgTable(
  "medications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    kind: text("kind").$type<MedicationKind>().notNull().default("lek"),
    doseAmount: numeric("dose_amount", { precision: 10, scale: 3, mode: "number" }),
    /** Jednostka wpisywana przez użytkownika: mg, ml, kapsułka, IU… */
    doseUnit: text("dose_unit"),
    /** Pory przyjęcia — dowolne etykiety ("rano") lub godziny ("07:30"). */
    timesOfDay: jsonb("times_of_day").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    /** Dni tygodnia ISO 1–7. Pusta tablica = codziennie. */
    daysOfWeek: jsonb("days_of_week").$type<number[]>().notNull().default(sql`'[]'::jsonb`),
    active: boolean("active").notNull().default(true),
    startDate: date("start_date", { mode: "string" }),
    endDate: date("end_date", { mode: "string" }),
    notes: text("notes"),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("medications_user_idx").on(t.userId, t.active)],
);

export const medicationLogs = pgTable(
  "medication_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    medicationId: uuid("medication_id")
      .notNull()
      .references(() => medications.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    slot: text("slot").notNull(),
    taken: boolean("taken").notNull().default(false),
    takenAt: timestamp("taken_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("medication_logs_unique").on(t.medicationId, t.date, t.slot),
    index("medication_logs_user_date_idx").on(t.userId, t.date),
  ],
);

/* ------------------------------------------------------ zadania i projekty */

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    goal: text("goal"),
    status: text("status").$type<ProjectStatus>().notNull().default("aktywny"),
    deadline: date("deadline", { mode: "string" }),
    nextAction: text("next_action"),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("projects_user_idx").on(t.userId, t.status)],
);

export const projectMilestones = pgTable(
  "project_milestones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    dueDate: date("due_date", { mode: "string" }),
    done: boolean("done").notNull().default(false),
    position: integer("position").notNull().default(0),
  },
  (t) => [index("project_milestones_project_idx").on(t.projectId)],
);

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    title: text("title").notNull(),
    kind: text("kind").$type<TaskKind>().notNull().default("priorytet"),
    /** 1–3 dla priorytetów, kolejność dla side questów. */
    position: integer("position").notNull().default(0),
    done: boolean("done").notNull().default(false),
    doneAt: timestamp("done_at", { withTimezone: true }),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    /** Ustawiane, gdy zadanie zostało przeniesione z wcześniejszego dnia. */
    carriedFrom: date("carried_from", { mode: "string" }),
  },
  (t) => [index("tasks_user_date_idx").on(t.userId, t.date)],
);

/* ------------------------------------------------------ trening i rekordy */

export const trainingPlans = pgTable(
  "training_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Dzień tygodnia ISO: 1 = poniedziałek … 7 = niedziela. */
    weekday: integer("weekday").notNull(),
    /** Dyscyplina wpisywana przez użytkownika — nic nie jest zamknięte listą. */
    discipline: text("discipline").notNull(),
    title: text("title"),
    startTime: time("start_time"),
    durationMin: integer("duration_min"),
    note: text("note"),
    active: boolean("active").notNull().default(true),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("training_plans_user_idx").on(t.userId, t.weekday, t.active)],
);

export const trainingLogs = pgTable(
  "training_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    discipline: text("discipline").notNull(),
    title: text("title"),
    done: boolean("done").notNull().default(true),
    durationMin: integer("duration_min"),
    distanceKm: numeric("distance_km", { precision: 8, scale: 3, mode: "number" }),
    rpe: integer("rpe"),
    note: text("note"),
    planId: uuid("plan_id").references(() => trainingPlans.id, { onDelete: "set null" }),
  },
  (t) => [index("training_logs_user_date_idx").on(t.userId, t.date)],
);

export const personalRecords = pgTable(
  "personal_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    discipline: text("discipline").notNull(),
    /** Metryka wpisywana przez użytkownika: "dystans", "czas na 1 km", "ciężar"… */
    metric: text("metric").notNull(),
    unit: text("unit"),
    value: numeric("value", { precision: 12, scale: 3, mode: "number" }).notNull(),
    /** Czy wyższa wartość jest lepsza (dystans, ciężar) czy niższa (czas, tempo). */
    higherIsBetter: boolean("higher_is_better").notNull().default(true),
    achievedOn: date("achieved_on", { mode: "string" }).notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("personal_records_user_idx").on(t.userId, t.discipline, t.metric)],
);

/* ------------------------------------------------------------------- nauka */

export const learningPlanWeek = pgTable(
  "learning_plan_week",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    weekday: integer("weekday").notNull(),
    /** Dziedzina wpisywana z ręki: "hiszpański", "rolnictwo", "narzędzia AI"… */
    skill: text("skill").notNull(),
    startTime: time("start_time"),
    durationMin: integer("duration_min"),
    active: boolean("active").notNull().default(true),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("learning_plan_week_user_idx").on(t.userId, t.weekday, t.active)],
);

export const learningPlanYear = pgTable(
  "learning_plan_year",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    periodStart: date("period_start", { mode: "string" }).notNull(),
    periodEnd: date("period_end", { mode: "string" }).notNull(),
    skill: text("skill").notNull(),
    /** Zakres tematyczny zawężający blok tygodniowy w tym okresie. */
    focus: text("focus"),
    target: text("target"),
    position: integer("position").notNull().default(0),
  },
  (t) => [index("learning_plan_year_user_idx").on(t.userId, t.periodStart, t.periodEnd)],
);

export const materials = pgTable(
  "materials",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    skill: text("skill").notNull(),
    title: text("title").notNull(),
    type: text("type").$type<MaterialType>().notNull().default("inne"),
    url: text("url"),
    progressPct: integer("progress_pct").notNull().default(0),
    note: text("note"),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("materials_user_idx").on(t.userId, t.skill)],
);

export const learningLogs = pgTable(
  "learning_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    skill: text("skill").notNull(),
    minutes: integer("minutes"),
    done: boolean("done").notNull().default(true),
    materialId: uuid("material_id").references(() => materials.id, { onDelete: "set null" }),
    note: text("note"),
    planId: uuid("plan_id").references(() => learningPlanWeek.id, { onDelete: "set null" }),
  },
  (t) => [index("learning_logs_user_date_idx").on(t.userId, t.date)],
);

/* --------------------------------------------------------------- raporty */

export const reportSubmissions = pgTable(
  "report_submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    /** Surowa treść raportu — audyt i możliwość odtworzenia zapisu. */
    payload: jsonb("payload").notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("report_submissions_user_date_idx").on(t.userId, t.date)],
);

/* ---------------------------------------------------------------- mentor */

export const mentorRuns = pgTable(
  "mentor_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    forDate: date("for_date", { mode: "string" }).notNull(),
    mode: text("mode").$type<MentorMode>().notNull().default("mentor"),
    summary: text("summary"),
    model: text("model"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("mentor_runs_user_date_idx").on(t.userId, t.forDate)],
);

export const recommendations = pgTable(
  "recommendations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    runId: uuid("run_id").references(() => mentorRuns.id, { onDelete: "cascade" }),
    forDate: date("for_date", { mode: "string" }).notNull(),
    category: text("category").notNull(),
    observation: text("observation").notNull(),
    action: text("action").notNull(),
    /** 1 = najważniejsze. */
    priority: integer("priority").notNull().default(3),
    horizon: text("horizon"),
    status: text("status").$type<RecommendationStatus>().notNull().default("nowa"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("recommendations_user_idx").on(t.userId, t.forDate, t.status)],
);

/* ------------------------------------------------------------- relacje */

export const usersRelations = relations(users, ({ one, many }) => ({
  settings: one(settings, { fields: [users.id], references: [settings.userId] }),
  medications: many(medications),
  projects: many(projects),
}));

export const projectsRelations = relations(projects, ({ many }) => ({
  milestones: many(projectMilestones),
  tasks: many(tasks),
}));

export const medicationsRelations = relations(medications, ({ many }) => ({
  logs: many(medicationLogs),
}));

export const mentorRunsRelations = relations(mentorRuns, ({ many }) => ({
  recommendations: many(recommendations),
}));

/* --------------------------------------------------------------- typy */

export type User = typeof users.$inferSelect;
export type Settings = typeof settings.$inferSelect;
export type DailyLog = typeof dailyLogs.$inferSelect;
export type SalesDaily = typeof salesDaily.$inferSelect;
export type Contract = typeof contracts.$inferSelect;
export type Medication = typeof medications.$inferSelect;
export type MedicationLog = typeof medicationLogs.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type ProjectMilestone = typeof projectMilestones.$inferSelect;
export type TrainingPlan = typeof trainingPlans.$inferSelect;
export type TrainingLog = typeof trainingLogs.$inferSelect;
export type PersonalRecord = typeof personalRecords.$inferSelect;
export type LearningPlanWeek = typeof learningPlanWeek.$inferSelect;
export type LearningPlanYear = typeof learningPlanYear.$inferSelect;
export type LearningLog = typeof learningLogs.$inferSelect;
export type Material = typeof materials.$inferSelect;
export type Recommendation = typeof recommendations.$inferSelect;
export type MentorRun = typeof mentorRuns.$inferSelect;

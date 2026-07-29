import { z } from "zod";

/**
 * Schematy współdzielone przez kreator profilu (/start) i panel zarządzania
 * (/ustawienia) — jedno miejsce, w którym opisane jest, co jest poprawne.
 */

const trimmed = z.string().trim();

/** Puste pole w formularzu ma znaczyć "nie podano", a nie 0. */
const optionalNumber = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}, z.number().nullable());

const requiredNumber = z.preprocess((value) => {
  if (typeof value === "number") return value;
  return Number(String(value ?? "").replace(",", "."));
}, z.number({ invalid_type_error: "Podaj liczbę." }));

const optionalText = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  trimmed.nullable().optional().transform((v) => v ?? null),
);

const optionalDate = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data musi mieć format RRRR-MM-DD.")
    .nullable()
    .optional()
    .transform((v) => v ?? null),
);

const optionalTime = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/, "Godzina musi mieć format GG:MM.")
    .nullable()
    .optional()
    .transform((v) => (v ? (v.length === 5 ? `${v}:00` : v) : null)),
);

/** "rano, 14:00, wieczór" → ["rano", "14:00", "wieczór"] */
const stringList = z.preprocess((value) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}, z.array(trimmed.min(1)));

const weekdayList = z.preprocess((value) => {
  if (!Array.isArray(value)) return [];
  return value.map(Number).filter((n) => Number.isInteger(n) && n >= 1 && n <= 7);
}, z.array(z.number().int().min(1).max(7)));

const id = z.string().uuid().optional();

/* ------------------------------------------------------------------ leki */

export const medicationSchema = z.object({
  id,
  name: trimmed.min(1, "Podaj nazwę."),
  kind: z.enum(["lek", "suplement"]).default("lek"),
  doseAmount: optionalNumber,
  doseUnit: optionalText,
  timesOfDay: stringList,
  daysOfWeek: weekdayList,
  startDate: optionalDate,
  endDate: optionalDate,
  notes: optionalText,
});

/* --------------------------------------------------------------- trening */

export const trainingPlanSchema = z.object({
  id,
  weekday: z.coerce.number().int().min(1).max(7),
  discipline: trimmed.min(1, "Podaj dyscyplinę."),
  title: optionalText,
  startTime: optionalTime,
  durationMin: optionalNumber,
  note: optionalText,
});

export const personalRecordSchema = z.object({
  id,
  discipline: trimmed.min(1, "Podaj dyscyplinę."),
  metric: trimmed.min(1, "Podaj metrykę, np. dystans albo czas."),
  unit: optionalText,
  value: requiredNumber,
  higherIsBetter: z.coerce.boolean().default(true),
  achievedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Podaj datę ustanowienia rekordu."),
  note: optionalText,
});

/* ----------------------------------------------------------------- nauka */

export const learningWeekSchema = z.object({
  id,
  weekday: z.coerce.number().int().min(1).max(7),
  skill: trimmed.min(1, "Podaj dziedzinę."),
  startTime: optionalTime,
  durationMin: optionalNumber,
});

export const learningYearSchema = z
  .object({
    id,
    periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Podaj początek okresu."),
    periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Podaj koniec okresu."),
    skill: trimmed.min(1, "Podaj dziedzinę."),
    focus: optionalText,
    target: optionalText,
  })
  .refine((data) => data.periodStart <= data.periodEnd, {
    message: "Koniec okresu nie może być wcześniejszy niż początek.",
    path: ["periodEnd"],
  });

export const materialSchema = z.object({
  id,
  skill: trimmed.min(1, "Podaj dziedzinę."),
  title: trimmed.min(1, "Podaj tytuł."),
  type: z.enum(["wideo", "pdf", "kurs", "ksiazka", "inne"]).default("inne"),
  url: optionalText,
  progressPct: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? 0 : Number(v)),
    z.number().min(0).max(100).default(0),
  ),
  note: optionalText,
});

/* ---------------------------------------------------------- oszczędności */

export const savingsGoalSchema = z.object({
  id,
  name: trimmed.min(1, "Podaj nazwę celu."),
  targetPln: requiredNumber.refine((value) => value > 0, "Kwota celu musi być większa od zera."),
  /** Kwota już odłożona — punkt startowy, nie dopłata. */
  initialPln: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? 0 : Number(String(v).replace(",", "."))),
    z.number().min(0, "Kwota startowa nie może być ujemna.").default(0),
  ),
  deadline: optionalDate,
  note: optionalText,
});

/* ------------------------------------------------------ lejek sprzedaży */

export const dealSchema = z.object({
  id,
  clientName: trimmed.min(1, "Podaj nazwę klienta."),
  valuePln: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? 0 : Number(String(v).replace(",", "."))),
    z.number().min(0, "Kwota nie może być ujemna.").default(0),
  ),
  expectedDate: optionalDate,
  stage: z.enum(["do-podpisania", "podpisana", "przepadla"]).default("do-podpisania"),
  note: optionalText,
  nextAction: optionalText,
  nextActionDate: optionalDate,
  /** Szansa wygranej 0–100; pusta = licz stawką globalną. */
  probability: z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? null : Number(value)),
    z.number().int().min(0).max(100).nullable().default(null),
  ),
});

/* ------------------------------------------------------------------ rodzina */

export const familyMemberSchema = z.object({
  id,
  name: trimmed.min(1, "Podaj imię."),
  relation: optionalText,
  birthDate: optionalDate,
  note: optionalText,
});

export const familyEventSchema = z.object({
  id,
  name: trimmed.min(1, "Podaj nazwę wydarzenia."),
  date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Podaj datę wydarzenia w formacie RRRR-MM-DD."),
  kind: z.enum(["rocznica", "urodziny", "randka", "wyjazd", "wydarzenie"]).default("wydarzenie"),
  recurring: z.coerce.boolean().default(false),
  note: optionalText,
});

/* ------------------------------------------------------------ odliczanie */

export const countdownSchema = z.object({
  id,
  name: trimmed.min(1, "Podaj, do czego odliczamy."),
  targetDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Podaj datę wydarzenia w formacie RRRR-MM-DD."),
  note: optionalText,
});

/* ---------------------------------------------------------- zobowiązania */

const requiredDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Podaj termin pierwszej płatności w formacie RRRR-MM-DD.");

export const obligationSchema = z
  .object({
    id,
    name: trimmed.min(1, "Podaj nazwę płatności."),
    amountPln: requiredNumber.refine((value) => value > 0, "Kwota płatności musi być większa od zera."),
    category: optionalText,
    cadence: z
      .enum(["jednorazowo", "tygodniowo", "miesiecznie", "kwartalnie", "polrocznie", "rocznie"])
      .default("miesiecznie"),
    firstDueDate: requiredDate,
    endDate: optionalDate,
    note: optionalText,
  })
  .refine((data) => !data.endDate || data.endDate >= data.firstDueDate, {
    message: "Koniec zobowiązania nie może być wcześniejszy niż pierwsza płatność.",
    path: ["endDate"],
  });

/* -------------------------------------------------------------- projekty */

export const projectSchema = z.object({
  id,
  name: trimmed.min(1, "Podaj nazwę projektu."),
  goal: optionalText,
  status: z.enum(["aktywny", "wstrzymany", "zakonczony"]).default("aktywny"),
  deadline: optionalDate,
  nextAction: optionalText,
});

/* ------------------------------------------------------------ ustawienia */

export const profileSchema = z.object({
  name: optionalText,
  timezone: trimmed.min(1).default("Europe/Warsaw"),
  currency: trimmed.min(1).max(8).default("PLN"),
  weekStartsOn: z.coerce.number().int().min(1).max(7).default(1),
});

export const financeStartSchema = z.object({
  cashBalancePln: optionalNumber,
  monthlyRevenueGoalPln: optionalNumber,
});

export const goalsSchema = z.object({
  /** Wpisana w kreatorze waga trafia do dziennika jako dzisiejszy pomiar. */
  currentWeightKg: optionalNumber.optional(),
  /** Plan wagowy: skąd, dokąd i do kiedy. */
  weightStartKg: optionalNumber,
  weightStartDate: optionalDate,
  weightTargetDate: optionalDate,
  waterGoalMl: optionalNumber,
  familyGesturesPerWeek: z.coerce.number().int().min(0).max(7).default(2),
  waterGoodPct: z.coerce.number().int().min(1).max(200).default(100),
  waterOkPct: z.coerce.number().int().min(1).max(200).default(80),
  weightTargetKg: optionalNumber,
  goalCallsPerDay: optionalNumber,
  goalMeetingsScheduledPerDay: optionalNumber,
  goalMeetingsHeldPerDay: optionalNumber,
  goalContractsPerWeek: optionalNumber,
  monthlyRevenueGoalPln: optionalNumber,
});

export const rowsPayload = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => {
    if (typeof value !== "string") return value;
    try {
      return JSON.parse(value);
    } catch {
      return [];
    }
  }, z.array(schema));

export type MedicationInput = z.infer<typeof medicationSchema>;
export type TrainingPlanInput = z.infer<typeof trainingPlanSchema>;
export type PersonalRecordInput = z.infer<typeof personalRecordSchema>;
export type LearningWeekInput = z.infer<typeof learningWeekSchema>;
export type LearningYearInput = z.infer<typeof learningYearSchema>;
export type MaterialInput = z.infer<typeof materialSchema>;
export type ProjectInput = z.infer<typeof projectSchema>;
export type SavingsGoalInput = z.infer<typeof savingsGoalSchema>;
export type ObligationInput = z.infer<typeof obligationSchema>;
export type CountdownInput = z.infer<typeof countdownSchema>;
export type DealInput = z.infer<typeof dealSchema>;
export type FamilyMemberInput = z.infer<typeof familyMemberSchema>;
export type FamilyEventInput = z.infer<typeof familyEventSchema>;

import { z } from "zod";

/** Puste pole znaczy „nie podano” — nie zeruje wartości. */
const nullableNumber = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}, z.number().nullable());

const nullableText = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.string().trim().nullable().optional().transform((v) => v ?? null),
);

const countValue = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(Math.round(parsed), 0) : 0;
}, z.number().int().min(0));

export const reportSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Nieprawidłowa data."),

  cashBalancePln: nullableNumber,

  sales: z.object({
    calls: countValue,
    meetingsScheduled: countValue,
    meetingsHeld: countValue,
  }),

  contracts: z.array(
    z.object({
      clientName: z.string().trim().min(1, "Podaj nazwę klienta."),
      valuePln: z.preprocess(
        (v) => (v === "" || v === null || v === undefined ? 0 : Number(String(v).replace(",", "."))),
        z.number(),
      ),
      status: z.enum(["podpisana", "negocjacje", "anulowana"]).default("podpisana"),
      note: nullableText,
    }),
  ),

  doses: z.array(
    z.object({
      medicationId: z.string().uuid(),
      slot: z.string().min(1),
      taken: z.boolean(),
    }),
  ),

  weightKg: nullableNumber,
  waterMl: nullableNumber,
  sleepH: nullableNumber,
  energy: nullableNumber,
  mood: nullableNumber,
  notes: nullableText,

  priorities: z.array(z.object({ title: z.string().trim(), done: z.boolean() })),
  side: z.array(z.object({ title: z.string().trim(), done: z.boolean() })),

  training: z.array(
    z.object({
      planId: z.string().uuid(),
      discipline: z.string().trim().min(1),
      title: nullableText,
      done: z.boolean(),
      durationMin: nullableNumber,
      distanceKm: nullableNumber,
      rpe: nullableNumber,
      note: nullableText,
    }),
  ),

  learning: z.array(
    z.object({
      planId: z.string().uuid(),
      skill: z.string().trim().min(1),
      done: z.boolean(),
      minutes: nullableNumber,
      note: nullableText,
    }),
  ),

  newRecords: z.array(
    z.object({
      discipline: z.string().trim().min(1, "Podaj dyscyplinę rekordu."),
      metric: z.string().trim().min(1, "Podaj metrykę rekordu."),
      unit: nullableText,
      value: z.preprocess(
        (v) => (v === "" || v === null || v === undefined ? Number.NaN : Number(String(v).replace(",", "."))),
        z.number({ invalid_type_error: "Podaj wynik rekordu." }),
      ),
      higherIsBetter: z.boolean().default(true),
    }),
  ),
});

export type ReportInput = z.infer<typeof reportSchema>;

import { z } from "zod";

import { MENTAL_TESTS, isMentalTestId } from "@/lib/domain/mental-tests";

/**
 * Walidacja wypełnionego kwestionariusza. Odpowiedzi przychodzą z formularza
 * jako tablica JSON w jednym ukrytym polu — tak samo jak listy w kreatorze.
 *
 * Test musi być wypełniony w całości: liczba odpowiedzi i zakres punktów są
 * sprawdzane względem definicji konkretnego narzędzia, bo tylko komplet
 * odpowiedzi daje wynik porównywalny z progami z badań.
 */
export const assessmentSchema = z
  .object({
    test: z.string().refine(isMentalTestId, "Nieznany test."),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data musi mieć format RRRR-MM-DD."),
    answers: z.preprocess((value) => {
      if (typeof value !== "string") return value;
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }, z.array(z.number().int().min(0).max(5))),
    note: z.preprocess(
      (value) => (typeof value === "string" && value.trim() === "" ? null : value),
      z.string().trim().max(2000, "Notatka jest za długa.").nullable().optional().transform((v) => v ?? null),
    ),
  })
  .superRefine((value, ctx) => {
    if (!isMentalTestId(value.test)) return;
    const test = MENTAL_TESTS[value.test];

    if (value.answers.length !== test.items.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["answers"],
        message: "Odpowiedz na wszystkie pytania — częściowy wynik nie da się porównać z progami.",
      });
      return;
    }

    const maxOption = Math.max(...test.options.map((option) => option.value));
    if (value.answers.some((answer) => answer > maxOption)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["answers"],
        message: "Odpowiedź spoza skali tego testu.",
      });
    }
  });

export type AssessmentInput = z.infer<typeof assessmentSchema>;

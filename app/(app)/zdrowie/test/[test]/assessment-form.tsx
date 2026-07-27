"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Field, FormError, Textarea } from "@/components/ui/field";
import { saveAssessment, type AssessmentState } from "@/lib/actions/mental";
import type { MentalTest } from "@/lib/domain/mental-tests";
import { cn } from "@/lib/utils";

function Submit({ ready, count }: { ready: boolean; count: string }) {
  const { pending } = useFormStatus();
  return (
    <div className="flex items-center gap-3">
      <Button type="submit" disabled={pending || !ready}>
        {pending ? "Zapisywanie…" : "Zapisz wynik"}
      </Button>
      <span className="text-xs text-muted">{ready ? "Wszystkie pytania wypełnione." : `Odpowiedzi: ${count}`}</span>
    </div>
  );
}

/**
 * Kwestionariusz: jedno pytanie na wiersz, ta sama skala odpowiedzi dla całego
 * testu. Wynik liczy serwer — formularz wysyła wyłącznie odpowiedzi.
 *
 * Zapisać da się dopiero komplet: niepełny test nie ma wyniku porównywalnego
 * z progami, więc lepiej nie udawać, że ma.
 */
export function AssessmentForm({
  test,
  date,
  initialAnswers,
  initialNote,
}: {
  test: MentalTest;
  date: string;
  /** Odpowiedzi z dzisiejszego wypełnienia, jeśli już było — do poprawki. */
  initialAnswers: number[] | null;
  initialNote: string | null;
}) {
  const [state, formAction] = useActionState<AssessmentState, FormData>(saveAssessment, undefined);
  const [answers, setAnswers] = useState<Array<number | null>>(
    () => initialAnswers ?? test.items.map(() => null),
  );

  const answered = answers.filter((answer) => answer !== null).length;
  const ready = answered === test.items.length;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="test" value={test.id} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="answers" value={JSON.stringify(answers.map((answer) => answer ?? 0))} />

      <FormError>{state?.error}</FormError>

      <ol className="flex flex-col gap-2">
        {test.items.map((item, index) => (
          <li key={item} className="rounded-lg border border-edge bg-surface-2 p-3">
            <p className="text-sm text-ink">
              <span className="tabular mr-2 text-muted">{index + 1}.</span>
              {item}
            </p>
            {/* Siatka zamiast zawijania — inaczej ostatnia odpowiedź spada sama do nowej linii. */}
            <div
              className={cn(
                "mt-2 grid gap-1.5",
                test.options.length > 4 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-4",
              )}
            >
              {test.options.map((option) => {
                const selected = answers[index] === option.value;
                return (
                  <label
                    key={option.value}
                    className={cn(
                      "flex cursor-pointer items-center justify-center rounded-lg border px-2 py-1.5 text-center text-xs",
                      selected ? "border-series-1 bg-series-1/15 text-ink" : "border-edge text-ink-2 hover:bg-line",
                    )}
                  >
                    <input
                      type="radio"
                      name={`pytanie-${index}`}
                      value={option.value}
                      checked={selected}
                      onChange={() =>
                        setAnswers((previous) => {
                          const next = [...previous];
                          next[index] = option.value;
                          return next;
                        })
                      }
                      className="sr-only"
                    />
                    {option.label}
                  </label>
                );
              })}
            </div>
          </li>
        ))}
      </ol>

      <Field
        label="Notatka do wyniku"
        htmlFor="note"
        hint="Opcjonalna. Co się działo w tych dwóch tygodniach — przyda się przy porównaniu z kolejnym wypełnieniem."
      >
        <Textarea id="note" name="note" defaultValue={initialNote ?? ""} />
      </Field>

      <Submit ready={ready} count={`${answered} z ${test.items.length}`} />
    </form>
  );
}

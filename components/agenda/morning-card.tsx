"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Sunrise } from "lucide-react";

import { saveMorning } from "@/lib/actions/morning";
import type { QuickState } from "@/lib/actions/quick";
import type { MorningState } from "@/lib/domain/morning";
import { cn } from "@/lib/utils";

/**
 * Poranny rytuał nad planem dnia: jedna intencja i nastrój na start.
 * Rano formularz jest otwarty, po 12:00 zwija się do linijki, a po zapisie
 * zostaje kompaktowe przypomnienie intencji na cały dzień.
 */

function Zapisz() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-9 items-center justify-center rounded-lg bg-series-1 px-4 text-sm font-medium text-white hover:brightness-110 disabled:opacity-50"
    >
      {pending ? "Zapisywanie…" : "Zacznij dzień"}
    </button>
  );
}

export function MorningCard({
  state,
  intention,
  mood,
}: {
  state: MorningState;
  intention: string | null;
  mood: number | null;
}) {
  const [open, setOpen] = useState(state === "prosi");
  const [editing, setEditing] = useState(false);
  const [selectedMood, setSelectedMood] = useState<number | null>(mood);
  const [result, formAction] = useActionState<QuickState, FormData>(saveMorning, undefined);

  // Po udanym zapisie strona odświeża się serwerowo — formularz ma się domknąć.
  useEffect(() => {
    if (result?.ok) {
      setEditing(false);
      setOpen(false);
    }
  }, [result]);

  const showForm = (state !== "wypelniony" && open) || editing;

  return (
    <section
      data-morning={state}
      className="rounded-xl border border-edge bg-surface p-4 md:col-span-2 xl:col-span-6"
    >
      {showForm ? (
        <form action={formAction} className="flex flex-col gap-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Sunrise className="h-4 w-4 text-warning" />
            Poranek: z jaką intencją zaczynasz dzień?
          </p>
          {result?.error ? (
            <p role="alert" className="rounded-lg border border-critical/40 bg-critical/10 px-3 py-2 text-xs text-ink">
              {result.error}
            </p>
          ) : null}
          <input
            name="intention"
            type="text"
            defaultValue={intention ?? ""}
            placeholder="np. spokojnie domknąć ofertę dla Nowaka"
            aria-label="Intencja dnia"
            className="w-full rounded-lg border border-edge bg-surface-2 px-3 py-2 text-sm text-ink placeholder:text-muted"
          />
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-muted">Nastrój na start:</span>
            <input type="hidden" name="mood" value={selectedMood ?? ""} />
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-label={`Nastrój ${value} z 5`}
                  onClick={() => setSelectedMood(value)}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-medium",
                    selectedMood === value
                      ? "border-series-1 bg-series-1/10 text-ink"
                      : "border-edge text-ink-2 hover:bg-surface-2",
                  )}
                >
                  {value}
                </button>
              ))}
            </div>
            <Zapisz />
          </div>
        </form>
      ) : state === "wypelniony" ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex min-w-0 items-center gap-2 text-sm text-ink">
            <Sunrise className="h-4 w-4 shrink-0 text-warning" />
            <span className="truncate">
              {intention ? (
                <>
                  Intencja: <span className="font-medium">{intention}</span>
                </>
              ) : (
                "Poranek odhaczony"
              )}
              {mood !== null ? <span className="text-muted"> · nastrój {mood}/5</span> : null}
            </span>
          </p>
          <button type="button" onClick={() => setEditing(true)} className="shrink-0 text-xs text-muted hover:text-ink">
            Zmień
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm text-muted">
            <Sunrise className="h-4 w-4 shrink-0 text-warning" />
            Poranek bez intencji — możesz ją dopisać w każdej chwili.
          </p>
          <button type="button" onClick={() => setOpen(true)} className="shrink-0 text-xs text-muted hover:text-ink">
            Uzupełnij
          </button>
        </div>
      )}
    </section>
  );
}

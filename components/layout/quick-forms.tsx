"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { Check } from "lucide-react";

import { addCashFlow, addQuickEntry, addQuickTask, type QuickState } from "@/lib/actions/quick";
import { cn } from "@/lib/utils";

/**
 * Wspólne klocki szybkiego dodawania — używa ich pływający widżet przy dolnej
 * krawędzi i kontekstowy przycisk „Dodaj" w górnym pasku kategorii.
 */

export const control =
  "w-full rounded-lg border border-edge bg-surface-2 px-3 py-2 text-sm text-ink placeholder:text-muted";

export function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-series-1 text-sm font-medium text-white hover:brightness-110 disabled:opacity-50"
    >
      {pending ? "Zapisywanie…" : label}
    </button>
  );
}

export function Result({ state }: { state: QuickState }) {
  if (state?.error) {
    return (
      <p role="alert" className="rounded-lg border border-critical/40 bg-critical/10 px-3 py-2 text-xs text-ink">
        {state.error}
      </p>
    );
  }
  if (state?.ok) {
    return (
      <p className="flex items-center gap-1.5 rounded-lg border border-good/40 bg-good/10 px-3 py-2 text-xs text-ink">
        <Check className="h-3.5 w-3.5 shrink-0 text-good" />
        {state.ok}
      </p>
    );
  }
  return null;
}

/**
 * Jedno pole na wszystko: parser rozpoznaje koszt, zysk albo zadanie z datą,
 * a komunikat po zapisie mówi, jak wpis został zrozumiany.
 */
export function SmartForm({ onSaved }: { onSaved: (komunikat: string) => void }) {
  const [state, formAction] = useActionState<QuickState, FormData>(addQuickEntry, undefined);

  useEffect(() => {
    if (state?.ok) onSaved(state.ok);
  }, [state, onSaved]);

  return (
    <div className="flex flex-col gap-2">
      {state?.error ? <Result state={state} /> : null}
      <form action={formAction} className="flex gap-2">
        <input
          name="text"
          type="text"
          required
          placeholder="np. paliwo 150 albo zadzwonić do Nowaka jutro"
          aria-label="Szybki wpis jednym zdaniem"
          className={control}
        />
        <SmartSubmit />
      </form>
    </div>
  );
}

function SmartSubmit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-[38px] shrink-0 items-center justify-center rounded-lg bg-series-1 px-3 text-sm font-medium text-white hover:brightness-110 disabled:opacity-50"
    >
      {pending ? "…" : "Dodaj"}
    </button>
  );
}

/**
 * Kwota dokłada się do sumy dnia, więc po zapisie pola się czyszczą i można od
 * razu dorzucić kolejny wpis, ale pusty formularz zaraz po zapisie wygląda tak
 * samo jak formularz, który się nie wysłał. Dlatego po zapisie wracamy do menu
 * z potwierdzeniem: widać, że wpis poszedł, a kolejny jest o jedno kliknięcie.
 */
export function CashForm({ kind, onSaved }: { kind: "koszt" | "zysk"; onSaved: (komunikat: string) => void }) {
  const [state, formAction] = useActionState<QuickState, FormData>(addCashFlow, undefined);

  useEffect(() => {
    if (state?.ok) onSaved(state.ok);
  }, [state, onSaved]);

  return (
    <div className="flex flex-col gap-2">
      <Result state={state} />
      <form action={formAction} className="flex flex-col gap-2">
        <input type="hidden" name="kind" value={kind} />
        <input
          name="amount"
          type="text"
          inputMode="decimal"
          autoFocus
          required
          placeholder="Kwota"
          aria-label={kind === "zysk" ? "Kwota zysku" : "Kwota kosztu"}
          className={cn(control, "tabular")}
        />
        <input
          name="description"
          type="text"
          placeholder={kind === "zysk" ? "Za co, np. faktura Nowak" : "Na co, np. paliwo"}
          aria-label="Opis"
          className={control}
        />
        <Submit label={kind === "zysk" ? "Zapisz zysk" : "Zapisz koszt"} />
      </form>
      <p className="text-xs text-muted">
        Opis trafia do notatki dnia, żeby suma w raporcie miała źródło.
      </p>
    </div>
  );
}

export function TaskForm({ onSaved }: { onSaved: (komunikat: string) => void }) {
  const [state, formAction] = useActionState<QuickState, FormData>(addQuickTask, undefined);

  useEffect(() => {
    if (state?.ok) onSaved(state.ok);
  }, [state, onSaved]);

  return (
    <div className="flex flex-col gap-2">
      <Result state={state} />
      <form action={formAction} className="flex flex-col gap-2">
        <input
          name="title"
          type="text"
          autoFocus
          required
          placeholder="Co masz zrobić"
          aria-label="Treść zadania"
          className={control}
        />
        <label className="flex items-center gap-2 px-0.5 text-xs text-ink-2">
          <input
            type="checkbox"
            name="kind"
            value="priorytet"
            className="h-4 w-4 shrink-0 rounded border-edge accent-[var(--series-1)]"
          />
          Priorytet dnia (są 3 miejsca)
        </label>
        <Submit label="Zapisz zadanie" />
      </form>
    </div>
  );
}

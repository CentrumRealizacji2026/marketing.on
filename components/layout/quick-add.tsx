"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowLeft, Check, ListTodo, Plus, TrendingDown, TrendingUp, X } from "lucide-react";

import { addCashFlow, addQuickTask, type QuickState } from "@/lib/actions/quick";
import { cn } from "@/lib/utils";

type View = "koszt" | "zysk" | "zadanie";

const VIEWS: Array<{ id: View; label: string; hint: string; icon: typeof Plus; tone: string }> = [
  { id: "koszt", label: "Dodaj koszt", hint: "Dopisze się do wydatków dnia", icon: TrendingDown, tone: "text-critical" },
  { id: "zysk", label: "Dodaj zysk", hint: "Dopisze się do wpływów dnia", icon: TrendingUp, tone: "text-[var(--delta-up)]" },
  { id: "zadanie", label: "Dodaj zadanie", hint: "Na dziś — priorytet albo side quest", icon: ListTodo, tone: "text-series-1" },
];

const control =
  "w-full rounded-lg border border-edge bg-surface-2 px-3 py-2 text-sm text-ink placeholder:text-muted";

function Submit({ label }: { label: string }) {
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

function Result({ state }: { state: QuickState }) {
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
 * Kwota dokłada się do sumy dnia, więc po zapisie pola się czyszczą i można od
 * razu dorzucić kolejny wpis — stąd remount formularza kluczem zamiast zamykania
 * panelu. Potwierdzenie zostaje na wierzchu, bo leży poza formularzem.
 */
function CashForm({ kind }: { kind: "koszt" | "zysk" }) {
  const [state, formAction] = useActionState<QuickState, FormData>(addCashFlow, undefined);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (state?.ok) setNonce((value) => value + 1);
  }, [state]);

  return (
    <div className="flex flex-col gap-2">
      <Result state={state} />
      <form key={nonce} action={formAction} className="flex flex-col gap-2">
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

function TaskForm() {
  const [state, formAction] = useActionState<QuickState, FormData>(addQuickTask, undefined);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (state?.ok) setNonce((value) => value + 1);
  }, [state]);

  return (
    <div className="flex flex-col gap-2">
      <Result state={state} />
      <form key={nonce} action={formAction} className="flex flex-col gap-2">
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

/**
 * Przycisk szybkiego dostępu przy dolnej krawędzi — koszt, zysk i zadanie bez
 * otwierania całego raportu dziennego.
 *
 * Siedzi po lewej, bo prawy dolny róg na telefonie zajmuje przycisk kategorii.
 */
export function QuickAdd() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View | null>(null);

  // Escape zamyka panel z klawiatury, tak samo jak kliknięcie w tło.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const active = VIEWS.find((entry) => entry.id === view) ?? null;

  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label="Zamknij szybkie dodawanie"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/40"
        />
      ) : null}

      <div className="fixed bottom-4 left-4 z-50 lg:bottom-6 lg:left-6">
        {open ? (
          <div className="mb-2 w-[min(320px,calc(100vw-2rem))] rounded-xl border border-edge bg-surface p-3 shadow-lg">
            <div className="mb-2 flex items-center gap-2">
              {active ? (
                <button
                  type="button"
                  onClick={() => setView(null)}
                  aria-label="Wróć do listy"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              ) : null}
              <p className="flex-1 text-xs font-semibold tracking-wide text-muted uppercase">
                {active ? active.label : "Szybkie dodawanie"}
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Zamknij"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {active === null ? (
              <ul className="flex flex-col gap-1">
                {VIEWS.map((entry) => {
                  const Icon = entry.icon;
                  return (
                    <li key={entry.id}>
                      <button
                        type="button"
                        onClick={() => setView(entry.id)}
                        className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-surface-2"
                      >
                        <Icon className={cn("h-4 w-4 shrink-0", entry.tone)} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm text-ink">{entry.label}</span>
                          <span className="block text-xs text-muted">{entry.hint}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : active.id === "zadanie" ? (
              <TaskForm />
            ) : (
              <CashForm kind={active.id} />
            )}
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => {
            setOpen((value) => !value);
            setView(null);
          }}
          aria-expanded={open}
          aria-label={open ? "Zamknij szybkie dodawanie" : "Szybkie dodawanie"}
          className="flex h-12 items-center gap-2 rounded-full bg-series-1 pr-4 pl-3.5 text-sm font-medium text-white shadow-lg hover:brightness-110"
        >
          <Plus className={cn("h-5 w-5 transition-transform", open && "rotate-45")} />
          Szybkie dodawanie
        </button>
      </div>
    </>
  );
}

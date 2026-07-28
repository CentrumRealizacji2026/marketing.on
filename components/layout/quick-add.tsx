"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Check, ListTodo, Plus, TrendingDown, TrendingUp, X } from "lucide-react";

import { CashForm, SmartForm, TaskForm } from "@/components/layout/quick-forms";
import { cn } from "@/lib/utils";

type View = "koszt" | "zysk" | "zadanie";

const VIEWS: Array<{ id: View; label: string; hint: string; icon: typeof Plus; tone: string }> = [
  { id: "koszt", label: "Dodaj koszt", hint: "Dopisze się do wydatków dnia", icon: TrendingDown, tone: "text-critical" },
  { id: "zysk", label: "Dodaj zysk", hint: "Dopisze się do wpływów dnia", icon: TrendingUp, tone: "text-[var(--delta-up)]" },
  { id: "zadanie", label: "Dodaj zadanie", hint: "Na dziś — priorytet albo side quest", icon: ListTodo, tone: "text-series-1" },
];

/**
 * Przycisk szybkiego dostępu przy dolnej krawędzi — koszt, zysk i zadanie bez
 * otwierania całego raportu dziennego. Formularze są wspólne z kontekstowym
 * przyciskiem „Dodaj" w górnym pasku (components/layout/quick-forms.tsx).
 *
 * Siedzi po lewej, bo prawy dolny róg na telefonie zajmuje przycisk kategorii.
 */
export function QuickAdd() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View | null>(null);
  const [potwierdzenie, setPotwierdzenie] = useState<string | null>(null);
  // Remount formularzy po zapisie — czyści pola bez ręcznego zerowania stanu.
  const [runda, setRunda] = useState(0);

  // Po zapisie wracamy do menu i zostawiamy potwierdzenie — pusty formularz
  // wyglądałby jak formularz, który się nie wysłał.
  const poZapisie = useCallback((komunikat: string) => {
    setPotwierdzenie(komunikat);
    setView(null);
    setRunda((value) => value + 1);
  }, []);

  function otworzWidok(id: View) {
    setPotwierdzenie(null);
    setView(id);
  }

  function zamknij() {
    setOpen(false);
    setPotwierdzenie(null);
    setView(null);
  }

  // Escape zamyka panel z klawiatury, tak samo jak kliknięcie w tło.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") zamknij();
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
          onClick={zamknij}
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
                  onClick={() => {
                    setPotwierdzenie(null);
                    setView(null);
                  }}
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
                onClick={zamknij}
                aria-label="Zamknij"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {active === null && potwierdzenie ? (
              <p className="mb-2 flex items-center gap-1.5 rounded-lg border border-good/40 bg-good/10 px-3 py-2 text-xs text-ink">
                <Check className="h-3.5 w-3.5 shrink-0 text-good" />
                {potwierdzenie}
              </p>
            ) : null}

            {active === null ? (
              <div key={runda} className="mb-2 border-b border-line pb-2">
                <SmartForm onSaved={poZapisie} />
              </div>
            ) : null}

            {active === null ? (
              <ul className="flex flex-col gap-1">
                {VIEWS.map((entry) => {
                  const Icon = entry.icon;
                  return (
                    <li key={entry.id}>
                      <button
                        type="button"
                        onClick={() => otworzWidok(entry.id)}
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
              <TaskForm onSaved={poZapisie} />
            ) : (
              <CashForm kind={active.id} onSaved={poZapisie} />
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

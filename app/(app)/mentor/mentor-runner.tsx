"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/field";
import { runMentor, type MentorState } from "@/lib/actions/mentor";
import { cn } from "@/lib/utils";

const MODES = [
  { value: "mentor", label: "Mentor", desc: "Nawyki, dyscyplina, cele." },
  { value: "trener", label: "Trener", desc: "Trening, regeneracja, nawodnienie, waga." },
  { value: "pm", label: "Kierownik projektów", desc: "Wąskie gardła i następne kroki." },
] as const;

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Analizuję dane…" : "Przelicz teraz"}
    </Button>
  );
}

export function MentorRunner({ configured }: { configured: boolean }) {
  const [mode, setMode] = useState<string>("mentor");
  const [state, formAction] = useActionState<MentorState, FormData>(runMentor, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="mode" value={mode} />
      <FormError>{state?.error}</FormError>
      {state?.ok ? (
        <p className="rounded-lg border border-good/40 bg-good/10 px-3 py-2 text-sm text-ink">
          Gotowe — rekomendacje poniżej.
        </p>
      ) : null}

      {!configured ? (
        <p className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-ink">
          Mentor potrzebuje klucza <code className="text-xs">ANTHROPIC_API_KEY</code> w konfiguracji aplikacji.
          Bez niego reszta kokpitu działa normalnie.
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {MODES.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setMode(option.value)}
            aria-pressed={mode === option.value}
            className={cn(
              "rounded-lg border p-3 text-left transition-colors",
              mode === option.value
                ? "border-series-1 bg-series-1/10"
                : "border-edge hover:bg-surface-2",
            )}
          >
            <span className="block text-sm font-medium text-ink">{option.label}</span>
            <span className="mt-0.5 block text-xs text-muted">{option.desc}</span>
          </button>
        ))}
      </div>

      <div>
        <Submit />
      </div>
    </form>
  );
}

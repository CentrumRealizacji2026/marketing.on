"use client";

import { useActionState } from "react";

import { Result, Submit } from "@/components/layout/quick-forms";
import { saveNotificationPrefs } from "@/lib/actions/push";
import type { QuickState } from "@/lib/actions/quick";

/** Sześć kategorii przypomnień — proste checkboxy, zapis jednym przyciskiem. */

const KATEGORIE: Array<{ name: string; label: string; hint: string }> = [
  { name: "pushMeds", label: "Leki i suplementy", hint: "W oknie pory: rano, południe, wieczór…" },
  { name: "pushBills", label: "Raty i rachunki", hint: "3 dni przed terminem i w dniu terminu, po 8:00." },
  { name: "pushTraining", label: "Trening", hint: "90 minut przed godziną z planu." },
  { name: "pushLearning", label: "Nauka", hint: "90 minut przed blokiem z planu." },
  { name: "pushMorning", label: "Poranny rytuał", hint: "Między 7:00 a 12:00, dopóki nie wpiszesz intencji." },
  { name: "pushEvening", label: "Wieczorny raport", hint: "Od 20:30, dopóki raport nie jest zapisany." },
];

export function NotificationPrefs({ initial }: { initial: Record<string, boolean> }) {
  const [state, formAction] = useActionState<QuickState, FormData>(saveNotificationPrefs, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Result state={state} />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {KATEGORIE.map((kategoria) => (
          <label
            key={kategoria.name}
            className="flex cursor-pointer items-start gap-3 rounded-lg border border-edge p-3 hover:bg-surface-2"
          >
            <input
              type="checkbox"
              name={kategoria.name}
              value="1"
              defaultChecked={initial[kategoria.name] ?? true}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-edge accent-[var(--series-1)]"
            />
            <span className="min-w-0">
              <span className="block text-sm text-ink">{kategoria.label}</span>
              <span className="block text-xs text-muted">{kategoria.hint}</span>
            </span>
          </label>
        ))}
      </div>
      <div className="self-start">
        <Submit label="Zapisz kategorie" />
      </div>
    </form>
  );
}

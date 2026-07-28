import { Check } from "lucide-react";

import { LearningBlockStatus } from "@/components/learning/block-status";
import { setLearningStatus, toggleDose, toggleTask, toggleTraining } from "@/lib/actions/quick";
import type { AgendaAction } from "@/lib/domain/agenda";
import { cn } from "@/lib/utils";

/**
 * Odhaczenie pozycji wprost z planu dnia — jeden komponent, cztery typy akcji.
 *
 * Formularze serwerowe zamiast przycisków z JavaScriptem, jak wszędzie w repo:
 * działa zanim strona się w pełni załaduje i nie trzyma stanu w kliencie.
 *
 * sm = kwadracik na osi dnia; lg = duży przycisk w sekcji „Teraz / Następne".
 */
export function AgendaCheck({
  action,
  date,
  size = "sm",
}: {
  action: AgendaAction;
  date: string;
  size?: "sm" | "lg";
}) {
  // Nauka w rozmiarze lg dostaje pełny tri-state — spotlight to miejsce decyzji,
  // więc „nie zrobione" musi być dostępne. Na osi wystarcza cykl zrobione↔brak.
  if (action.type === "learning" && size === "lg") {
    return <LearningBlockStatus planId={action.planId} date={date} done={action.done} />;
  }

  const done = action.type === "dose" ? action.taken : action.done === true;

  const fields =
    action.type === "dose"
      ? [
          ["medicationId", action.medicationId],
          ["slot", action.slot],
          ["date", date],
          ["taken", action.taken ? "0" : "1"],
        ]
      : action.type === "training"
        ? [
            ["planId", action.planId],
            ["date", date],
            ["done", action.done ? "0" : "1"],
          ]
        : action.type === "learning"
          ? [
              ["planId", action.planId],
              ["date", date],
              ["status", action.done === true ? "brak" : "zrobione"],
            ]
          : [["taskId", action.taskId]];

  const serverAction =
    action.type === "dose"
      ? toggleDose
      : action.type === "training"
        ? toggleTraining
        : action.type === "learning"
          ? setLearningStatus
          : toggleTask;

  if (size === "lg") {
    return (
      <form action={serverAction}>
        {fields.map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <button
          type="submit"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium",
            done ? "border-good bg-good/10 text-ink" : "border-edge bg-surface text-ink hover:bg-surface-2",
          )}
        >
          {done ? <Check className="h-4 w-4 text-good" /> : null}
          {done ? "Zrobione" : "Odhacz"}
        </button>
      </form>
    );
  }

  return (
    <form action={serverAction} className="shrink-0">
      {fields.map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <button
        type="submit"
        aria-label={done ? "Zrobione — kliknij, żeby cofnąć" : "Odhacz"}
        title={done ? "Kliknij, żeby cofnąć" : "Odhacz"}
        className={cn(
          "flex h-4.5 w-4.5 items-center justify-center rounded border",
          done ? "border-good bg-good text-white" : "border-edge hover:bg-surface-2",
        )}
      >
        {done ? <Check className="h-3 w-3" /> : null}
      </button>
    </form>
  );
}

import { Check, X } from "lucide-react";

import { LearningBlockStatus } from "@/components/learning/block-status";
import { setLearningStatus, toggleDose, toggleTask, toggleTraining } from "@/lib/actions/quick";
import type { AgendaAction } from "@/lib/domain/agenda";
import { cn } from "@/lib/utils";

type Pola = Array<[string, string]>;

/**
 * Odhaczenie pozycji wprost z planu dnia — jeden komponent, cztery typy akcji.
 *
 * Leki, trening i nauka mają trzy stany: zrobione / świadomie pominięte /
 * bez decyzji. Zadania zostają dwustanowe — niezrobione zadanie przechodzi
 * na jutro, zamiast być „pomijane".
 *
 * Formularze serwerowe zamiast przycisków z JavaScriptem, jak wszędzie w repo:
 * działa zanim strona się w pełni załaduje i nie trzyma stanu w kliencie.
 *
 * sm = kwadraciki na osi dnia; lg = duże przyciski w sekcji „Teraz / Następne".
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
  // Nauka w rozmiarze lg dostaje pełny tri-state — spotlight to miejsce decyzji.
  if (action.type === "learning" && size === "lg") {
    return <LearningBlockStatus planId={action.planId} date={date} done={action.done} />;
  }

  const done = action.type === "dose" ? action.taken : action.done === true;
  const skipped =
    action.type === "dose" || action.type === "training"
      ? action.skipped
      : action.type === "learning"
        ? action.done === false
        : false;

  const doneFields: Pola =
    action.type === "dose"
      ? [
          ["medicationId", action.medicationId],
          ["slot", action.slot],
          ["date", date],
          ["taken", done ? "0" : "1"],
        ]
      : action.type === "training"
        ? [
            ["planId", action.planId],
            ["date", date],
            ["done", done ? "0" : "1"],
          ]
        : action.type === "learning"
          ? [
              ["planId", action.planId],
              ["date", date],
              ["status", done ? "brak" : "zrobione"],
            ]
          : [["taskId", action.taskId]];

  // Przełącznik pominięcia: klik w ✗ pomija, drugi klik cofa do „bez decyzji".
  const skipFields: Pola | null =
    action.type === "dose"
      ? [
          ["medicationId", action.medicationId],
          ["slot", action.slot],
          ["date", date],
          ["skip", skipped ? "0" : "1"],
        ]
      : action.type === "training"
        ? [
            ["planId", action.planId],
            ["date", date],
            ["skip", skipped ? "0" : "1"],
          ]
        : action.type === "learning"
          ? [
              ["planId", action.planId],
              ["date", date],
              ["status", skipped ? "brak" : "niezrobione"],
            ]
          : null;

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
      <div className="flex flex-wrap items-center gap-2">
        <form action={serverAction}>
          {doneFields.map(([name, value]) => (
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

        {skipFields && !done ? (
          <form action={serverAction}>
            {skipFields.map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={value} />
            ))}
            <button
              type="submit"
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium",
                skipped
                  ? "border-critical/50 bg-critical/10 text-ink"
                  : "border-edge bg-surface text-muted hover:bg-surface-2 hover:text-ink",
              )}
            >
              {skipped ? <X className="h-4 w-4 text-critical" /> : null}
              {skipped ? "Pominięte" : "Nie zrobione"}
            </button>
          </form>
        ) : null}
      </div>
    );
  }

  return (
    <span className="flex shrink-0 items-center gap-1">
      <form action={serverAction}>
        {doneFields.map(([name, value]) => (
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

      {skipFields && !done ? (
        <form action={serverAction}>
          {skipFields.map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <button
            type="submit"
            aria-label={skipped ? "Pominięte — kliknij, żeby cofnąć" : "Oznacz: nie zrobione"}
            title={skipped ? "Pominięte — kliknij, żeby cofnąć" : "Nie zrobione"}
            className={cn(
              "flex h-4.5 w-4.5 items-center justify-center rounded border",
              skipped
                ? "border-critical bg-critical/80 text-white"
                : "border-edge text-muted hover:bg-surface-2 hover:text-critical",
            )}
          >
            <X className="h-3 w-3" />
          </button>
        </form>
      ) : null}
    </span>
  );
}

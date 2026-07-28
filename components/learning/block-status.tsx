import { Check, X } from "lucide-react";

import { setLearningStatus } from "@/lib/actions/quick";
import { cn } from "@/lib/utils";

/**
 * Przełącznik stanu bloku nauki. Trzy stany zamiast dwóch: dopóki nic nie
 * zaznaczono, widać obie decyzje; po wybraniu jednej zostaje sama etykieta,
 * a kliknięcie w nią cofa do stanu nierozstrzygniętego.
 *
 * Formularze zamiast przycisków z JavaScriptem — działa też, zanim strona się
 * w pełni załaduje, i nie wymaga trzymania stanu po stronie klienta.
 */
export function LearningBlockStatus({
  planId,
  date,
  done,
  className,
}: {
  planId: string;
  date: string;
  /** null = brak wpisu, true = zrobione, false = świadomie pominięte. */
  done: boolean | null;
  className?: string;
}) {
  const base = "rounded-lg border px-2.5 py-1 text-xs font-medium whitespace-nowrap";

  if (done === null) {
    return (
      <div className={cn("flex shrink-0 flex-wrap justify-end gap-1", className)}>
        <form action={setLearningStatus}>
          <input type="hidden" name="planId" value={planId} />
          <input type="hidden" name="date" value={date} />
          <input type="hidden" name="status" value="zrobione" />
          <button type="submit" className={cn(base, "border-edge text-ink-2 hover:bg-surface-2")}>
            Odhacz
          </button>
        </form>
        <form action={setLearningStatus}>
          <input type="hidden" name="planId" value={planId} />
          <input type="hidden" name="date" value={date} />
          <input type="hidden" name="status" value="niezrobione" />
          <button
            type="submit"
            title="Zaznacz, że tego bloku nie było"
            className={cn(base, "border-edge text-muted hover:bg-surface-2 hover:text-ink")}
          >
            Nie zrobione
          </button>
        </form>
      </div>
    );
  }

  // Stan już ustalony — etykieta jest jednocześnie przyciskiem cofnięcia.
  return (
    <form action={setLearningStatus} className={cn("shrink-0", className)}>
      <input type="hidden" name="planId" value={planId} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="status" value="brak" />
      <button
        type="submit"
        title="Kliknij, żeby cofnąć"
        className={cn(
          base,
          "inline-flex items-center gap-1.5",
          done ? "border-good bg-good/10 text-ink" : "border-edge bg-surface-2 text-muted",
        )}
      >
        {done ? <Check className="h-3 w-3 text-good" /> : <X className="h-3 w-3" />}
        {done ? "Zrobione" : "Nie zrobione"}
      </button>
    </form>
  );
}

import Link from "next/link";
import { AlertTriangle, CheckCircle2, LifeBuoy, XCircle } from "lucide-react";

import { Meter } from "@/components/charts/sparkline";
import { StatusPill } from "@/components/ui/card";
import { CRISIS_CONTACTS, MENTAL_TESTS, type BandTone, type TestBand } from "@/lib/domain/mental-tests";
import type { TestState } from "@/lib/queries/mental";
import { formatDatePl } from "@/lib/domain/dates";
import { formatNumber } from "@/lib/utils";

export const BAND_COLOR: Record<BandTone, string> = {
  good: "var(--good)",
  warning: "var(--warning)",
  critical: "var(--critical)",
};

const BAND_ICON = { good: CheckCircle2, warning: AlertTriangle, critical: XCircle } as const;

export function BandPill({ band }: { band: TestBand }) {
  return (
    <StatusPill tone={band.tone} icon={BAND_ICON[band.tone]}>
      {band.label}
    </StatusPill>
  );
}

/**
 * Wynik jednego testu: punkty, przedział, zmiana względem poprzedniego razu.
 *
 * Pasek pokazuje wynik wprost, a znaczenie niesie kolor przedziału — w WHO-5
 * pełny pasek to dobrostan, w GAD-7 i PHQ-9 pełny pasek to maksimum objawów.
 * Dlatego nazwa testu stoi nad paskiem, a nie sam procent.
 */
export function TestScore({ state, compact = false }: { state: TestState; compact?: boolean }) {
  const test = MENTAL_TESTS[state.testId];
  const latest = state.latest;

  if (!latest) {
    return (
      <div className="flex flex-col gap-1">
        <p className="text-xs text-muted">{test.name}</p>
        <p className="text-sm text-ink-2">Nie wypełniony.</p>
        <Link href={`/zdrowie/test/${test.id}`} className="text-xs font-medium text-series-1 hover:underline">
          Wypełnij test →
        </Link>
      </div>
    );
  }

  const change = state.change;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs text-muted">{test.name}</p>
        <BandPill band={latest.band} />
      </div>

      <p className="tabular flex items-baseline gap-1 text-2xl leading-tight font-semibold text-ink">
        {latest.score}
        <span className="text-sm font-normal text-ink-2">/ {latest.max}</span>
      </p>

      <Meter
        value={latest.score}
        max={latest.max}
        tone={BAND_COLOR[latest.band.tone]}
        label={`Wynik ${test.name}`}
      />

      <p className="text-xs text-muted">
        {formatDatePl(latest.date)}
        {change.improved === null
          ? state.previousScore === null
            ? " · pierwszy pomiar"
            : " · bez zmiany"
          : ` · ${change.improved ? "lepiej" : "gorzej"} o ${formatNumber(Math.abs(change.delta))} pkt`}
      </p>

      {compact ? null : <p className="text-xs text-ink-2">{latest.band.advice}</p>}
    </div>
  );
}

/**
 * Numery wsparcia. Przy zaznaczonym pytaniu o myśli samobójcze albo przy wyniku
 * z najgorszego przedziału ramka jest wyróżniona — wtedy to nie jest przypis,
 * tylko treść główna.
 */
export function CrisisBox({ urgent = false }: { urgent?: boolean }) {
  return (
    <div
      className={
        urgent
          ? "rounded-lg border border-critical/60 bg-critical/10 px-3 py-3"
          : "rounded-lg border border-edge bg-surface-2 px-3 py-2"
      }
    >
      <p className={urgent ? "flex items-center gap-2 text-sm font-medium text-ink" : "text-xs text-muted"}>
        {urgent ? <LifeBuoy className="h-4 w-4 shrink-0 text-critical" /> : null}
        {urgent
          ? "Zaznaczyłeś odpowiedź, przy której nie zostawia się tego samemu sobie."
          : "Kokpit nie zastępuje pomocy specjalisty."}
      </p>
      <ul className={urgent ? "mt-2 flex flex-col gap-1" : "mt-1 flex flex-wrap gap-x-3 gap-y-0.5"}>
        {CRISIS_CONTACTS.map((contact) => (
          <li key={contact.number} className="text-xs text-muted">
            <span className="text-ink">{contact.number}</span> — {contact.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

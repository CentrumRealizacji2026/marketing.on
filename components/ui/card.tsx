import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
  id,
}: {
  className?: string;
  children: ReactNode;
  /** Kotwica dla podkategorii z prawego paska. */
  id?: string;
}) {
  return (
    <section id={id} className={cn("scroll-mt-20 rounded-xl border border-edge bg-surface p-4", className)}>
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  icon: Icon,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <header className="mb-3 flex items-start justify-between gap-3">
      <div className="flex items-start gap-2">
        {Icon ? <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted" /> : null}
        <div>
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-xs text-muted">{subtitle}</p> : null}
        </div>
      </div>
      {action ? <div className="shrink-0 text-xs">{action}</div> : null}
    </header>
  );
}

/**
 * Kafelek liczbowy: etykieta, wartość, opcjonalna zmiana względem nazwanego okresu
 * i opcjonalny wykres przebiegu. Wartość zostaje w cyfrach proporcjonalnych —
 * tabelaryczne rozstrzelają duże liczby.
 */
export function StatTile({
  label,
  value,
  unit,
  delta,
  footer,
  children,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  unit?: ReactNode;
  delta?: { value: string; direction: "up" | "down" | "flat"; goodDirection?: "up" | "down"; period: string };
  footer?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const deltaTone =
    delta && delta.direction !== "flat" && delta.goodDirection
      ? delta.direction === delta.goodDirection
        ? "text-[var(--delta-up)]"
        : "text-critical"
      : "text-ink-2";

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <p className="text-xs text-muted">{label}</p>
      <p className="flex items-baseline gap-1.5 text-2xl font-semibold leading-tight text-ink">
        {value}
        {unit ? <span className="text-sm font-normal text-ink-2">{unit}</span> : null}
      </p>
      {delta ? (
        <p className={cn("text-xs", deltaTone)}>
          {delta.direction === "up" ? "▲" : delta.direction === "down" ? "▼" : "="} {delta.value}
          <span className="text-muted"> {delta.period}</span>
        </p>
      ) : null}
      {children}
      {footer ? <div className="mt-1 text-xs text-muted">{footer}</div> : null}
    </div>
  );
}

/**
 * Pusta sekcja prowadzi do miejsca, w którym się ją wypełnia — dashboard nigdy
 * nie zostawia użytkownika z pustym kafelkiem bez wyjaśnienia.
 */
export function EmptyState({
  message,
  href,
  cta = "Skonfiguruj",
}: {
  message: string;
  href?: string;
  cta?: string;
}) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-lg border border-dashed border-edge px-3 py-4">
      <p className="text-xs text-muted">{message}</p>
      {href ? (
        <Link href={href} className="inline-flex items-center gap-1 text-xs font-medium text-series-1 hover:underline">
          {cta} <ArrowRight className="h-3 w-3" />
        </Link>
      ) : null}
    </div>
  );
}

export function StatusPill({
  tone,
  icon: Icon,
  children,
}: {
  tone: "good" | "warning" | "critical" | "neutral";
  icon?: React.ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  const tones = {
    good: "border-good/40 bg-good/10",
    warning: "border-warning/40 bg-warning/10",
    critical: "border-critical/40 bg-critical/10",
    neutral: "border-edge bg-surface-2",
  } as const;

  const dots = {
    good: "bg-good",
    warning: "bg-warning",
    critical: "bg-critical",
    neutral: "bg-muted",
  } as const;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium text-ink",
        tones[tone],
      )}
    >
      {Icon ? <Icon className="h-3 w-3" /> : <span className={cn("h-1.5 w-1.5 rounded-full", dots[tone])} />}
      {children}
    </span>
  );
}

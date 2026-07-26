import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

const controlBase =
  "w-full rounded-lg border border-edge bg-surface-2 px-3 py-2 text-sm text-ink placeholder:text-muted disabled:opacity-50";

export function Field({
  label,
  hint,
  htmlFor,
  className,
  children,
}: {
  label?: ReactNode;
  hint?: ReactNode;
  htmlFor?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label ? (
        <label htmlFor={htmlFor} className="text-xs font-medium text-ink-2">
          {label}
        </label>
      ) : null}
      {children}
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(controlBase, className)} {...props} />;
}

export function NumberInput({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      type="number"
      inputMode="decimal"
      className={cn(controlBase, "tabular", className)}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(controlBase, "min-h-20 resize-y", className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select className={cn(controlBase, "appearance-none pr-8", className)} {...props}>
      {children}
    </select>
  );
}

export function Checkbox({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      type="checkbox"
      className={cn("h-4 w-4 shrink-0 rounded border-edge accent-[var(--series-1)]", className)}
      {...props}
    />
  );
}

/** Lista podpowiedzi do pól tekstowych — sugeruje, ale niczego nie ogranicza. */
export function Suggestions({ id, options }: { id: string; options: readonly string[] }) {
  return (
    <datalist id={id}>
      {options.map((option) => (
        <option key={option} value={option} />
      ))}
    </datalist>
  );
}

export function FormError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-lg border border-critical/40 bg-critical/10 px-3 py-2 text-sm text-ink">
      {children}
    </p>
  );
}

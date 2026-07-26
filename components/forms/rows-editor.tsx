"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox, Field, FormError, Input, NumberInput, Select, Suggestions } from "@/components/ui/field";
import type { FormState } from "@/lib/actions/config";
import { WEEKDAYS, weekdayLabel } from "@/lib/domain/dates";
import { cn } from "@/lib/utils";

export type FieldSpec = {
  name: string;
  label: string;
  type: "text" | "number" | "time" | "date" | "select" | "weekday" | "list" | "days" | "checkbox";
  options?: readonly { value: string; label: string }[];
  suggestions?: readonly string[];
  placeholder?: string;
  hint?: string;
  /** Szerokość w siatce 6-kolumnowej. */
  span?: number;
  step?: string;
};

export type Row = Record<string, unknown> & { _key: string };

const spanClass: Record<number, string> = {
  1: "sm:col-span-1",
  2: "sm:col-span-2",
  3: "sm:col-span-3",
  4: "sm:col-span-4",
  5: "sm:col-span-5",
  6: "sm:col-span-6",
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Zapisywanie…" : label}
    </Button>
  );
}

function DayToggles({
  value,
  onChange,
}: {
  value: number[];
  onChange: (next: number[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {WEEKDAYS.map((day) => {
        const selected = value.includes(day.value);
        return (
          <button
            key={day.value}
            type="button"
            aria-pressed={selected}
            onClick={() =>
              onChange(selected ? value.filter((d) => d !== day.value) : [...value, day.value].sort())
            }
            className={cn(
              "h-8 w-9 rounded-lg border text-xs font-medium transition-colors",
              selected
                ? "border-series-1 bg-series-1/15 text-ink"
                : "border-edge text-muted hover:bg-surface-2 hover:text-ink",
            )}
          >
            {day.short}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Edytor dynamicznej listy: „+ dodaj" dokłada wiersz, kosz usuwa, strzałki zmieniają
 * kolejność. Stan trafia do jednego ukrytego pola jako JSON, a serwer waliduje go
 * tym samym schematem, którego używa kreator i panel zarządzania.
 */
export function RowsEditor({
  fields,
  initial,
  action,
  defaultRow,
  addLabel = "Dodaj pozycję",
  submitLabel = "Zapisz",
  emptyHint,
  titleFields,
  weekdayField,
  itemNoun = "Pozycja",
  hiddenFields,
  footer,
}: {
  fields: FieldSpec[];
  initial: Array<Record<string, unknown>>;
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  defaultRow: Record<string, unknown>;
  addLabel?: string;
  submitLabel?: string;
  emptyHint?: string;
  /** Z których pól złożyć nagłówek wiersza (opisowo, bo funkcji nie da się przekazać z serwera). */
  titleFields?: string[];
  /** Pole z dniem tygodnia — trafia na początek nagłówka jako nazwa dnia. */
  weekdayField?: string;
  /** Rzeczownik w nagłówku, gdy wiersz jest jeszcze pusty: „Pozycja 2”, „Projekt 2”. */
  itemNoun?: string;
  hiddenFields?: Record<string, string>;
  footer?: React.ReactNode;
}) {
  const counter = useRef(0);
  const [rows, setRows] = useState<Row[]>(() =>
    initial.map((row, index) => ({ ...row, _key: `i${index}` })),
  );
  const [state, formAction] = useActionState<FormState, FormData>(action, undefined);

  const addRow = () => {
    counter.current += 1;
    setRows((prev) => [...prev, { ...defaultRow, _key: `n${counter.current}` }]);
  };

  const removeRow = (key: string) => setRows((prev) => prev.filter((row) => row._key !== key));

  const move = (index: number, delta: number) =>
    setRows((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const update = (key: string, name: string, value: unknown) =>
    setRows((prev) => prev.map((row) => (row._key === key ? { ...row, [name]: value } : row)));

  const rowLabel = (row: Row, index: number) => {
    const parts: string[] = [];
    if (weekdayField) {
      const day = Number(row[weekdayField]);
      if (Number.isInteger(day)) parts.push(weekdayLabel(day));
    }
    for (const field of titleFields ?? []) {
      const value = row[field];
      if (typeof value === "string" && value.trim()) parts.push(value.trim());
    }
    return parts.length > 0 ? parts.join(" · ") : `${itemNoun} ${index + 1}`;
  };

  const payload = JSON.stringify(
    rows.map(({ _key, ...rest }) => {
      void _key;
      return rest;
    }),
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="rows" value={payload} />
      {Object.entries(hiddenFields ?? {}).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}

      <FormError>{state?.error}</FormError>
      {state?.ok ? (
        <p className="rounded-lg border border-good/40 bg-good/10 px-3 py-2 text-sm text-ink">Zapisano.</p>
      ) : null}

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-edge px-3 py-6 text-center text-sm text-muted">
          {emptyHint ?? "Nie ma tu jeszcze żadnej pozycji. Dodaj pierwszą."}
        </p>
      ) : null}

      <ul className="flex flex-col gap-3">
        {rows.map((row, index) => (
          <li key={row._key} className="rounded-xl border border-edge bg-surface p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted">{rowLabel(row, index)}</span>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label="Przenieś wyżej"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-ink disabled:opacity-30"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === rows.length - 1}
                  aria-label="Przenieś niżej"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-ink disabled:opacity-30"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => removeRow(row._key)}
                  aria-label="Usuń pozycję"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-critical/10 hover:text-critical"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
              {fields.map((field) => {
                const id = `${row._key}-${field.name}`;
                const value = row[field.name];
                const listId = field.suggestions ? `${field.name}-suggestions` : undefined;

                return (
                  <Field
                    key={field.name}
                    label={field.label}
                    hint={field.hint}
                    htmlFor={id}
                    className={spanClass[field.span ?? 3] ?? "sm:col-span-3"}
                  >
                    {field.type === "select" ? (
                      <Select
                        id={id}
                        value={String(value ?? "")}
                        onChange={(event) => update(row._key, field.name, event.target.value)}
                      >
                        {field.options?.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                    ) : field.type === "weekday" ? (
                      <Select
                        id={id}
                        value={String(value ?? 1)}
                        onChange={(event) => update(row._key, field.name, Number(event.target.value))}
                      >
                        {WEEKDAYS.map((day) => (
                          <option key={day.value} value={day.value}>
                            {day.label}
                          </option>
                        ))}
                      </Select>
                    ) : field.type === "days" ? (
                      <DayToggles
                        value={Array.isArray(value) ? (value as number[]) : []}
                        onChange={(next) => update(row._key, field.name, next)}
                      />
                    ) : field.type === "checkbox" ? (
                      <label className="flex h-10 items-center gap-2 text-sm text-ink-2">
                        <Checkbox
                          id={id}
                          checked={Boolean(value)}
                          onChange={(event) => update(row._key, field.name, event.target.checked)}
                        />
                        {field.placeholder ?? "Tak"}
                      </label>
                    ) : field.type === "number" ? (
                      <NumberInput
                        id={id}
                        step={field.step ?? "any"}
                        placeholder={field.placeholder}
                        value={value === null || value === undefined ? "" : String(value)}
                        onChange={(event) => update(row._key, field.name, event.target.value)}
                      />
                    ) : (
                      <>
                        <Input
                          id={id}
                          type={field.type === "time" ? "time" : field.type === "date" ? "date" : "text"}
                          list={listId}
                          placeholder={field.placeholder}
                          value={value === null || value === undefined ? "" : String(value)}
                          onChange={(event) => update(row._key, field.name, event.target.value)}
                        />
                        {field.suggestions && listId ? (
                          <Suggestions id={listId} options={field.suggestions} />
                        ) : null}
                      </>
                    )}
                  </Field>
                );
              })}
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" onClick={addRow}>
          <Plus className="h-4 w-4" />
          {addLabel}
        </Button>
        <div className="flex-1" />
        {footer}
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}

"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormError, Input, NumberInput, Select } from "@/components/ui/field";
import type { FormState } from "@/lib/actions/config";
import { DEAL_STAGE_OPTIONS, DEALS_STARTING_ROWS } from "@/lib/domain/deals";
import { cn, formatMoney, formatNumber } from "@/lib/utils";

type Row = {
  key: string;
  id?: string;
  clientName: string;
  valuePln: string;
  expectedDate: string;
  stage: string;
};

export type DealRow = {
  id: string;
  clientName: string;
  valuePln: number;
  expectedDate: string | null;
  stage: string;
};

function emptyRow(index: number): Row {
  return { key: `new-${index}-${Math.random().toString(36).slice(2, 8)}`, clientName: "", valuePln: "", expectedDate: "", stage: "do-podpisania" };
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Zapisywanie…" : "Zapisz tabelę"}
    </Button>
  );
}

/**
 * Tabela klientów do podpisania. Pod spodem podsumowanie liczone na żywo z tego,
 * co jest w polach — żeby suma „do zdobycia" zmieniała się w trakcie wpisywania,
 * a nie dopiero po zapisie.
 */
export function DealsTable({
  initial,
  action,
  currency,
}: {
  initial: DealRow[];
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  currency: string;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, undefined);

  const [rows, setRows] = useState<Row[]>(() => {
    const existing = initial.map((row) => ({
      key: row.id,
      id: row.id,
      clientName: row.clientName,
      valuePln: String(row.valuePln),
      expectedDate: row.expectedDate ?? "",
      stage: row.stage,
    }));
    // Na start dziesięć miejsc; przy uzupełnionej tabeli dokładamy jeden wolny wiersz.
    const blanks = existing.length === 0 ? DEALS_STARTING_ROWS : 1;
    return [...existing, ...Array.from({ length: blanks }, (_, i) => emptyRow(existing.length + i))];
  });

  const update = (index: number, patch: Partial<Row>) =>
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const filled = rows.filter((row) => row.clientName.trim() !== "");
  const open = filled.filter((row) => row.stage === "do-podpisania");
  const openPln = open.reduce((sum, row) => sum + (Number(row.valuePln.replace(",", ".")) || 0), 0);
  const won = filled.filter((row) => row.stage === "podpisana");
  const wonPln = won.reduce((sum, row) => sum + (Number(row.valuePln.replace(",", ".")) || 0), 0);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {/* Klucz Reacta nie jedzie do serwera — wysyłamy tylko dane wiersza. */}
      <input
        type="hidden"
        name="rows"
        value={JSON.stringify(
          filled.map((row) => ({
            id: row.id,
            clientName: row.clientName,
            valuePln: row.valuePln,
            expectedDate: row.expectedDate,
            stage: row.stage,
          })),
        )}
      />
      <FormError>{state?.error}</FormError>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              <th className="pb-2 font-medium">Klient / firma</th>
              <th className="pb-2 font-medium">Szacowana kwota</th>
              <th className="pb-2 font-medium">Spodziewany podpis</th>
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.key} className="border-b border-line last:border-0">
                <td className="py-1.5 pr-2">
                  <Input
                    type="text"
                    placeholder={`Klient ${index + 1}`}
                    value={row.clientName}
                    onChange={(e) => update(index, { clientName: e.target.value })}
                  />
                </td>
                <td className="py-1.5 pr-2">
                  <NumberInput
                    step="0.01"
                    min="0"
                    placeholder={`0 ${currency}`}
                    value={row.valuePln}
                    onChange={(e) => update(index, { valuePln: e.target.value })}
                  />
                </td>
                <td className="py-1.5 pr-2">
                  <Input
                    type="date"
                    value={row.expectedDate}
                    onChange={(e) => update(index, { expectedDate: e.target.value })}
                  />
                </td>
                <td className="py-1.5 pr-2">
                  <Select value={row.stage} onChange={(e) => update(index, { stage: e.target.value })}>
                    {DEAL_STAGE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </td>
                <td className="py-1.5">
                  <button
                    type="button"
                    aria-label="Usuń wiersz"
                    onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-critical/10 hover:text-critical"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>

          {/* Podsumowanie pod tabelą — kontrakty i kwota do zdobycia. */}
          <tfoot>
            <tr className="border-t-2 border-line">
              <td className="pt-3 text-sm font-medium text-ink">
                Do zdobycia: {formatNumber(open.length)}{" "}
                {open.length === 1 ? "kontrakt" : open.length >= 2 && open.length <= 4 ? "kontrakty" : "kontraktów"}
              </td>
              <td className="tabular pt-3 text-base font-semibold text-ink">{formatMoney(openPln, currency)}</td>
              <td colSpan={3} className={cn("pt-3 text-xs", won.length > 0 ? "text-[var(--delta-up)]" : "text-muted")}>
                {won.length > 0
                  ? `Podpisane w tabeli: ${formatNumber(won.length)} na ${formatMoney(wonPln, currency)}`
                  : "Podpisane pozycje nie liczą się do sumy."}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setRows((prev) => [...prev, emptyRow(prev.length)])}
        >
          <Plus className="h-4 w-4" />
          Dodaj wiersz
        </Button>
        <SubmitButton />
      </div>
    </form>
  );
}

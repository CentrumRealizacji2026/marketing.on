"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus, Trash2 } from "lucide-react";

import { Meter } from "@/components/charts/sparkline";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Checkbox, Field, FormError, Input, NumberInput, Select, Suggestions, Textarea } from "@/components/ui/field";
import { submitReport, type ReportState } from "@/lib/actions/report";
import { dayCashFlow } from "@/lib/domain/finance";
import { formatDose } from "@/lib/domain/medication";
import { CONTRACT_STATUS_OPTIONS, DISCIPLINE_SUGGESTIONS, RECORD_METRIC_SUGGESTIONS } from "@/lib/domain/suggestions";
import type { ReportFormData } from "@/lib/queries/report";
import { formatMoney, formatTime } from "@/lib/utils";

type ContractRow = { clientName: string; valuePln: string; status: string; note: string };
type RecordRow = { discipline: string; metric: string; unit: string; value: string; higherIsBetter: boolean };
type TaskRow = { title: string; done: boolean };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? "Zapisywanie…" : "Zapisz raport"}
    </Button>
  );
}

function numberValue(value: number | null | undefined) {
  return value === null || value === undefined ? "" : String(value);
}

export function ReportForm({
  data,
  today,
  currency,
  waterGoalMl,
}: {
  data: ReportFormData;
  today: string;
  currency: string;
  waterGoalMl: number | null;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState<ReportState, FormData>(submitReport, undefined);

  const [cash, setCash] = useState(numberValue(data.daily?.cashBalancePln));
  const [expenses, setExpenses] = useState(numberValue(data.daily?.expensesPln));
  const [income, setIncome] = useState(numberValue(data.daily?.incomePln));
  const [calls, setCalls] = useState(numberValue(data.sales?.calls ?? 0));
  const [scheduled, setScheduled] = useState(numberValue(data.sales?.meetingsScheduled ?? 0));
  const [held, setHeld] = useState(numberValue(data.sales?.meetingsHeld ?? 0));

  const [contractRows, setContractRows] = useState<ContractRow[]>(
    data.contracts.map((row) => ({
      clientName: row.clientName,
      valuePln: String(row.valuePln),
      status: row.status,
      note: row.note ?? "",
    })),
  );

  const [doses, setDoses] = useState(
    data.doses.map((dose) => ({
      medicationId: dose.medicationId,
      slot: dose.slot,
      taken: dose.taken,
      name: dose.name,
      kind: dose.kind,
      doseAmount: dose.doseAmount,
      doseUnit: dose.doseUnit,
    })),
  );

  const [weight, setWeight] = useState(numberValue(data.daily?.weightKg));
  const [water, setWater] = useState(numberValue(data.daily?.waterMl));
  const [sleep, setSleep] = useState(numberValue(data.daily?.sleepH));
  const [energy, setEnergy] = useState(numberValue(data.daily?.energy));
  const [mood, setMood] = useState(numberValue(data.daily?.mood));
  const [stress, setStress] = useState(numberValue(data.daily?.stress));
  const [thoughts, setThoughts] = useState(data.daily?.thoughts ?? "");
  const [goodThings, setGoodThings] = useState(data.daily?.goodThings ?? "");
  const [notes, setNotes] = useState(data.daily?.notes ?? "");

  const [priorities, setPriorities] = useState<TaskRow[]>(() => {
    const base = data.priorities.map((task) => ({ title: task.title, done: task.done }));
    while (base.length < 3) base.push({ title: "", done: false });
    return base.slice(0, 3);
  });

  const [side, setSide] = useState<TaskRow[]>(data.side.map((task) => ({ title: task.title, done: task.done })));

  const [training, setTraining] = useState(
    data.training.map(({ plan, log }) => ({
      planId: plan.id,
      discipline: plan.discipline,
      title: plan.title ?? "",
      label: plan.title || plan.discipline,
      startTime: plan.startTime,
      done: Boolean(log?.done),
      durationMin: numberValue(log?.durationMin ?? plan.durationMin),
      distanceKm: numberValue(log?.distanceKm),
      rpe: numberValue(log?.rpe),
      note: log?.note ?? "",
    })),
  );

  const [learning, setLearning] = useState(
    data.learning.map(({ block, log }) => ({
      planId: block.planId,
      skill: block.skill,
      startTime: block.startTime,
      focus: block.focus,
      done: Boolean(log?.done),
      minutes: numberValue(log?.minutes ?? block.durationMin),
      note: log?.note ?? "",
    })),
  );

  const [newRecords, setNewRecords] = useState<RecordRow[]>([]);

  const [savings, setSavings] = useState(
    data.savings.map((goal) => ({ ...goal, amount: numberValue(goal.amountPln) })),
  );

  const [payments, setPayments] = useState(
    data.payments.map((payment) => ({
      obligationId: payment.obligationId,
      dueDate: payment.dueDate,
      name: payment.name,
      status: payment.status,
      plannedPln: payment.amountPln,
      paid: payment.status === "zaplacone",
      amount: numberValue(payment.amountPln),
    })),
  );

  const savedToday = savings.reduce((sum, goal) => sum + (Number(goal.amount.replace(",", ".")) || 0), 0);
  const paidToday = payments
    .filter((payment) => payment.paid)
    .reduce((sum, payment) => sum + (Number(payment.amount.replace(",", ".")) || payment.plannedPln), 0);

  // Podgląd wyniku dnia liczony z tych samych reguł, co widoki — od razu widać, co się zapisze.
  const dayResult = dayCashFlow({
    expensesPln: expenses === "" ? null : Number(expenses.replace(",", ".")),
    incomePln: income === "" ? null : Number(income.replace(",", ".")),
  }).netPln;

  const payload = JSON.stringify({
    date: data.date,
    cashBalancePln: cash,
    expensesPln: expenses,
    incomePln: income,
    savings: savings.map((goal) => ({ goalId: goal.goalId, amountPln: goal.amount })),
    payments: payments.map((payment) => ({
      obligationId: payment.obligationId,
      dueDate: payment.dueDate,
      paid: payment.paid,
      amountPln: payment.amount,
    })),
    sales: { calls, meetingsScheduled: scheduled, meetingsHeld: held },
    contracts: contractRows,
    doses: doses.map(({ medicationId, slot, taken }) => ({ medicationId, slot, taken })),
    weightKg: weight,
    waterMl: water,
    sleepH: sleep,
    energy,
    mood,
    stress,
    thoughts,
    goodThings,
    notes,
    priorities,
    side,
    training: training.map(({ planId, discipline, title, done, durationMin, distanceKm, rpe, note }) => ({
      planId,
      discipline,
      title,
      done,
      durationMin,
      distanceKm,
      rpe,
      note,
    })),
    learning: learning.map(({ planId, skill, done, minutes, note }) => ({ planId, skill, done, minutes, note })),
    newRecords,
  });

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="payload" value={payload} />
      <FormError>{state?.error}</FormError>

      {/* ------------------------------------------------------------ data */}
      <Card>
        <Field label="Dzień raportu" htmlFor="report-date" hint="Możesz uzupełnić raport wstecz.">
          <Input
            id="report-date"
            type="date"
            defaultValue={data.date}
            max={today}
            onChange={(event) => {
              if (event.target.value) router.push(`/raport?data=${event.target.value}`);
            }}
          />
        </Field>
      </Card>

      {/* --------------------------------------------------------- finanse */}
      <Card>
        <CardHeader title="Finanse" subtitle="Kwoty wpisujesz bez minusa — kierunek wynika z pola." />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label={`Stan środków na dziś (${currency})`} htmlFor="cash">
            <NumberInput id="cash" step="0.01" value={cash} onChange={(e) => setCash(e.target.value)} />
          </Field>
          <Field label={`Wydane dziś (${currency})`} htmlFor="expenses" hint="Ile środków wyszło.">
            <NumberInput
              id="expenses"
              step="0.01"
              min="0"
              value={expenses}
              onChange={(e) => setExpenses(e.target.value)}
            />
          </Field>
          <Field label={`Wpłynęło dziś (${currency})`} htmlFor="income" hint="Wpłaty, przelewy, gotówka.">
            <NumberInput id="income" step="0.01" min="0" value={income} onChange={(e) => setIncome(e.target.value)} />
          </Field>
        </div>
        {dayResult !== null ? (
          <p className="mt-3 text-xs text-muted">
            Wynik dnia:{" "}
            <span
              className={
                dayResult > 0 ? "text-[var(--delta-up)]" : dayResult < 0 ? "text-critical" : "text-ink"
              }
            >
              {dayResult > 0 ? "+" : dayResult < 0 ? "−" : ""}
              {formatMoney(Math.abs(dayResult), currency)}
            </span>
          </p>
        ) : null}

        {/* Odkładanie i rachunki są osobnymi strumieniami — bez tej informacji łatwo
            policzyć je dwa razy albo pominąć w wydatkach. */}
        {savedToday > 0 || paidToday > 0 ? (
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
            {savedToday > 0 ? <span>Odłożone na cele: {formatMoney(savedToday, currency)}.</span> : null}
            {paidToday > 0 ? (
              <>
                <span>Zaznaczone rachunki: {formatMoney(paidToday, currency)}.</span>
                <button
                  type="button"
                  onClick={() =>
                    setExpenses(
                      String(Math.round(((Number(expenses.replace(",", ".")) || 0) + paidToday) * 100) / 100),
                    )
                  }
                  className="text-series-1 hover:underline"
                >
                  + dolicz do wydanych
                </button>
              </>
            ) : null}
          </p>
        ) : null}
      </Card>

      {/* --------------------------------------------------- oszczędności */}
      {savings.length > 0 ? (
        <Card>
          <CardHeader
            title="Oszczędności na cele"
            subtitle="Ile z dzisiejszych środków odkładasz. Odłożona kwota nie jest wydatkiem — zmienia tylko przeznaczenie."
          />
          <ul className="flex flex-col gap-2">
            {savings.map((goal, index) => {
              // Podgląd na żywo: to, co już zapisane, minus dzisiejszy wpis, plus to, co właśnie wpisujesz.
              const typed = Number(goal.amount.replace(",", ".")) || 0;
              const preview = goal.savedPln - (goal.amountPln ?? 0) + typed;
              const pct = goal.targetPln > 0 ? Math.min((preview / goal.targetPln) * 100, 100) : 0;

              return (
                <li key={goal.goalId} className="rounded-lg border border-edge p-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <span className="text-sm font-medium text-ink">{goal.name}</span>
                    <span className="tabular text-xs text-muted">
                      {formatMoney(preview, currency)} z {formatMoney(goal.targetPln, currency)} ·{" "}
                      <span className="text-ink">{Math.round(pct)}%</span>
                    </span>
                  </div>
                  <Meter
                    value={preview}
                    max={goal.targetPln}
                    tone="var(--series-3)"
                    className="mt-2"
                    label={`${goal.name}: ${Math.round(pct)}% celu`}
                  />
                  <Field label={`Odłożone dziś (${currency})`} className="mt-2">
                    <NumberInput
                      step="0.01"
                      min="0"
                      value={goal.amount}
                      onChange={(e) =>
                        setSavings((prev) => prev.map((g, i) => (i === index ? { ...g, amount: e.target.value } : g)))
                      }
                    />
                  </Field>
                </li>
              );
            })}
          </ul>
        </Card>
      ) : null}

      {/* -------------------------------------------------------- rachunki */}
      {payments.length > 0 ? (
        <Card>
          <CardHeader title="Płatności" subtitle="Rachunki z terminem na ten dzień oraz zaległe." />
          <ul className="flex flex-col gap-2">
            {payments.map((payment, index) => (
              <li
                key={`${payment.obligationId}-${payment.dueDate}`}
                className="rounded-lg border border-edge p-3"
              >
                <label className="flex cursor-pointer flex-wrap items-center gap-x-2.5 gap-y-1">
                  <Checkbox
                    checked={payment.paid}
                    onChange={(e) =>
                      setPayments((prev) =>
                        prev.map((p, i) => (i === index ? { ...p, paid: e.target.checked } : p)),
                      )
                    }
                  />
                  <span className="flex-1 text-sm font-medium text-ink">{payment.name}</span>
                  {payment.status === "zalegle" && !payment.paid ? (
                    <span className="rounded-full bg-critical/10 px-2 py-0.5 text-xs text-critical">
                      zaległa · termin {payment.dueDate}
                    </span>
                  ) : (
                    <span className="text-xs text-muted">termin {payment.dueDate}</span>
                  )}
                  <span className="tabular text-sm text-ink">{formatMoney(payment.plannedPln, currency)}</span>
                </label>

                {payment.paid ? (
                  <Field label={`Zapłacona kwota (${currency})`} className="mt-2" hint="Zostaw puste, jeśli zgadza się z planowaną.">
                    <NumberInput
                      step="0.01"
                      min="0"
                      value={payment.amount}
                      onChange={(e) =>
                        setPayments((prev) =>
                          prev.map((p, i) => (i === index ? { ...p, amount: e.target.value } : p)),
                        )
                      }
                    />
                  </Field>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {/* -------------------------------------------------------- sprzedaż */}
      <Card>
        <CardHeader title="Sprzedaż" subtitle="Liczby z dzisiejszego dnia." />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Rozmowy z klientami" htmlFor="calls">
            <NumberInput id="calls" step="1" min="0" value={calls} onChange={(e) => setCalls(e.target.value)} />
          </Field>
          <Field label="Spotkania umówione" htmlFor="scheduled">
            <NumberInput id="scheduled" step="1" min="0" value={scheduled} onChange={(e) => setScheduled(e.target.value)} />
          </Field>
          <Field label="Spotkania odbyte" htmlFor="held">
            <NumberInput id="held" step="1" min="0" value={held} onChange={(e) => setHeld(e.target.value)} />
          </Field>
        </div>

        <div className="mt-4 border-t border-line pt-3">
          <p className="mb-2 text-xs font-medium tracking-wide text-muted uppercase">Umowy</p>
          <div className="flex flex-col gap-2">
            {contractRows.map((row, index) => (
              <div key={index} className="grid grid-cols-1 gap-2 rounded-lg border border-edge p-2 sm:grid-cols-12">
                <Input
                  className="sm:col-span-4"
                  placeholder="Klient"
                  value={row.clientName}
                  onChange={(e) =>
                    setContractRows((prev) =>
                      prev.map((r, i) => (i === index ? { ...r, clientName: e.target.value } : r)),
                    )
                  }
                />
                <NumberInput
                  className="sm:col-span-3"
                  step="0.01"
                  placeholder={`Wartość (${currency})`}
                  value={row.valuePln}
                  onChange={(e) =>
                    setContractRows((prev) => prev.map((r, i) => (i === index ? { ...r, valuePln: e.target.value } : r)))
                  }
                />
                <Select
                  className="sm:col-span-3"
                  value={row.status}
                  onChange={(e) =>
                    setContractRows((prev) => prev.map((r, i) => (i === index ? { ...r, status: e.target.value } : r)))
                  }
                >
                  {CONTRACT_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                <div className="flex items-center justify-end sm:col-span-2">
                  <button
                    type="button"
                    aria-label="Usuń umowę"
                    onClick={() => setContractRows((prev) => prev.filter((_, i) => i !== index))}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-critical/10 hover:text-critical"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-2"
            onClick={() =>
              setContractRows((prev) => [...prev, { clientName: "", valuePln: "", status: "podpisana", note: "" }])
            }
          >
            <Plus className="h-4 w-4" />
            Dodaj umowę
          </Button>
        </div>
      </Card>

      {/* --------------------------------------------------------- zdrowie */}
      <Card>
        <CardHeader title="Zdrowie" />

        {doses.length > 0 ? (
          <div className="mb-4">
            <p className="mb-2 text-xs font-medium tracking-wide text-muted uppercase">
              Leki i suplementy na dziś
            </p>
            <ul className="flex flex-col gap-1">
              {doses.map((dose, index) => (
                <li key={`${dose.medicationId}-${dose.slot}`}>
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-surface-2">
                    <Checkbox
                      checked={dose.taken}
                      onChange={(e) =>
                        setDoses((prev) => prev.map((d, i) => (i === index ? { ...d, taken: e.target.checked } : d)))
                      }
                    />
                    <span className="flex-1 text-sm text-ink">{dose.name}</span>
                    <span className="text-xs text-muted">
                      {dose.slot}
                      {formatDose(dose) ? ` · ${formatDose(dose)}` : ""}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ) : data.hasMedications ? (
          <p className="mb-4 text-xs text-muted">Na ten dzień nie zaplanowano żadnej dawki.</p>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Waga (kg)" htmlFor="weight">
            <NumberInput id="weight" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </Field>
          <Field
            label="Wypite płyny (ml)"
            htmlFor="water"
            hint={waterGoalMl ? `Cel dzienny: ${waterGoalMl} ml.` : undefined}
          >
            <div className="flex gap-2">
              <NumberInput id="water" step="50" value={water} onChange={(e) => setWater(e.target.value)} />
              {[250, 500].map((amount) => (
                <Button
                  key={amount}
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setWater(String((Number(water) || 0) + amount))}
                >
                  +{amount}
                </Button>
              ))}
            </div>
          </Field>
        </div>
      </Card>

      {/* --------------------------------------------------------- zadania */}
      <Card>
        <CardHeader title="Zadania" subtitle="Trzy priorytety dnia i side questy." />

        <div className="flex flex-col gap-2">
          {priorities.map((task, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-edge text-sm font-semibold text-muted">
                {index + 1}
              </span>
              <Input
                placeholder={`Priorytet ${index + 1}`}
                value={task.title}
                onChange={(e) =>
                  setPriorities((prev) => prev.map((t, i) => (i === index ? { ...t, title: e.target.value } : t)))
                }
              />
              <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted">
                <Checkbox
                  checked={task.done}
                  onChange={(e) =>
                    setPriorities((prev) => prev.map((t, i) => (i === index ? { ...t, done: e.target.checked } : t)))
                  }
                />
                zrobione
              </label>
            </div>
          ))}
        </div>

        <div className="mt-4 border-t border-line pt-3">
          <p className="mb-2 text-xs font-medium tracking-wide text-muted uppercase">Side questy</p>
          <div className="flex flex-col gap-2">
            {side.map((task, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  placeholder="Zadanie poboczne"
                  value={task.title}
                  onChange={(e) =>
                    setSide((prev) => prev.map((t, i) => (i === index ? { ...t, title: e.target.value } : t)))
                  }
                />
                <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted">
                  <Checkbox
                    checked={task.done}
                    onChange={(e) =>
                      setSide((prev) => prev.map((t, i) => (i === index ? { ...t, done: e.target.checked } : t)))
                    }
                  />
                  zrobione
                </label>
                <button
                  type="button"
                  aria-label="Usuń zadanie"
                  onClick={() => setSide((prev) => prev.filter((_, i) => i !== index))}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-critical/10 hover:text-critical"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-2"
            onClick={() => setSide((prev) => [...prev, { title: "", done: false }])}
          >
            <Plus className="h-4 w-4" />
            Dodaj side quest
          </Button>
        </div>
      </Card>

      {/* --------------------------------------------------------- trening */}
      <Card>
        <CardHeader title="Trening" subtitle="Jednostki zaplanowane na ten dzień." />
        {training.length === 0 ? (
          <p className="text-xs text-muted">Na ten dzień nie masz zaplanowanego treningu.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {training.map((entry, index) => (
              <li key={entry.planId} className="rounded-lg border border-edge p-3">
                <label className="flex cursor-pointer items-center gap-2.5">
                  <Checkbox
                    checked={entry.done}
                    onChange={(e) =>
                      setTraining((prev) => prev.map((t, i) => (i === index ? { ...t, done: e.target.checked } : t)))
                    }
                  />
                  <span className="flex-1 text-sm font-medium text-ink">{entry.label}</span>
                  <span className="text-xs text-muted">
                    {entry.discipline}
                    {entry.startTime ? ` · ${formatTime(entry.startTime)}` : ""}
                  </span>
                </label>

                {entry.done ? (
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Field label="Czas (min)">
                      <NumberInput
                        step="1"
                        value={entry.durationMin}
                        onChange={(e) =>
                          setTraining((prev) =>
                            prev.map((t, i) => (i === index ? { ...t, durationMin: e.target.value } : t)),
                          )
                        }
                      />
                    </Field>
                    <Field label="Dystans (km)">
                      <NumberInput
                        step="0.01"
                        value={entry.distanceKm}
                        onChange={(e) =>
                          setTraining((prev) =>
                            prev.map((t, i) => (i === index ? { ...t, distanceKm: e.target.value } : t)),
                          )
                        }
                      />
                    </Field>
                    <Field label="Odczuwalny wysiłek (1–10)">
                      <NumberInput
                        step="1"
                        min="1"
                        max="10"
                        value={entry.rpe}
                        onChange={(e) =>
                          setTraining((prev) => prev.map((t, i) => (i === index ? { ...t, rpe: e.target.value } : t)))
                        }
                      />
                    </Field>
                    <Field label="Notatka">
                      <Input
                        value={entry.note}
                        onChange={(e) =>
                          setTraining((prev) => prev.map((t, i) => (i === index ? { ...t, note: e.target.value } : t)))
                        }
                      />
                    </Field>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 border-t border-line pt-3">
          <p className="mb-2 text-xs font-medium tracking-wide text-muted uppercase">Nowy rekord</p>
          <div className="flex flex-col gap-2">
            {newRecords.map((row, index) => (
              <div key={index} className="grid grid-cols-1 gap-2 rounded-lg border border-edge p-2 sm:grid-cols-12">
                <Input
                  className="sm:col-span-3"
                  list="pr-disciplines"
                  placeholder="Dyscyplina"
                  value={row.discipline}
                  onChange={(e) =>
                    setNewRecords((prev) => prev.map((r, i) => (i === index ? { ...r, discipline: e.target.value } : r)))
                  }
                />
                <Input
                  className="sm:col-span-3"
                  list="pr-metrics"
                  placeholder="Metryka"
                  value={row.metric}
                  onChange={(e) =>
                    setNewRecords((prev) => prev.map((r, i) => (i === index ? { ...r, metric: e.target.value } : r)))
                  }
                />
                <NumberInput
                  className="sm:col-span-2"
                  step="0.001"
                  placeholder="Wynik"
                  value={row.value}
                  onChange={(e) =>
                    setNewRecords((prev) => prev.map((r, i) => (i === index ? { ...r, value: e.target.value } : r)))
                  }
                />
                <Input
                  className="sm:col-span-2"
                  placeholder="Jednostka"
                  value={row.unit}
                  onChange={(e) =>
                    setNewRecords((prev) => prev.map((r, i) => (i === index ? { ...r, unit: e.target.value } : r)))
                  }
                />
                <div className="flex items-center justify-between gap-2 sm:col-span-2">
                  <label className="flex items-center gap-1.5 text-xs text-muted">
                    <Checkbox
                      checked={row.higherIsBetter}
                      onChange={(e) =>
                        setNewRecords((prev) =>
                          prev.map((r, i) => (i === index ? { ...r, higherIsBetter: e.target.checked } : r)),
                        )
                      }
                    />
                    więcej = lepiej
                  </label>
                  <button
                    type="button"
                    aria-label="Usuń rekord"
                    onClick={() => setNewRecords((prev) => prev.filter((_, i) => i !== index))}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-critical/10 hover:text-critical"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <Suggestions id="pr-disciplines" options={DISCIPLINE_SUGGESTIONS} />
          <Suggestions id="pr-metrics" options={RECORD_METRIC_SUGGESTIONS.map((m) => m.metric)} />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-2"
            onClick={() =>
              setNewRecords((prev) => [
                ...prev,
                { discipline: "", metric: "", unit: "", value: "", higherIsBetter: true },
              ])
            }
          >
            <Plus className="h-4 w-4" />
            Zgłoś rekord
          </Button>
        </div>
      </Card>

      {/* ----------------------------------------------------------- nauka */}
      <Card>
        <CardHeader title="Nauka" subtitle="Bloki zaplanowane na ten dzień." />
        {learning.length === 0 ? (
          <p className="text-xs text-muted">Na ten dzień nie masz bloku nauki.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {learning.map((entry, index) => (
              <li key={entry.planId} className="rounded-lg border border-edge p-3">
                <label className="flex cursor-pointer items-center gap-2.5">
                  <Checkbox
                    checked={entry.done}
                    onChange={(e) =>
                      setLearning((prev) => prev.map((t, i) => (i === index ? { ...t, done: e.target.checked } : t)))
                    }
                  />
                  <span className="flex-1 text-sm font-medium text-ink">{entry.skill}</span>
                  {entry.startTime ? (
                    <span className="tabular text-xs text-muted">{formatTime(entry.startTime)}</span>
                  ) : null}
                </label>
                {entry.focus ? <p className="mt-1 ml-7 text-xs text-muted">Zakres: {entry.focus}</p> : null}

                {entry.done ? (
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label="Minuty">
                      <NumberInput
                        step="5"
                        value={entry.minutes}
                        onChange={(e) =>
                          setLearning((prev) => prev.map((t, i) => (i === index ? { ...t, minutes: e.target.value } : t)))
                        }
                      />
                    </Field>
                    <Field label="Notatka">
                      <Input
                        value={entry.note}
                        onChange={(e) =>
                          setLearning((prev) => prev.map((t, i) => (i === index ? { ...t, note: e.target.value } : t)))
                        }
                      />
                    </Field>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* ----------------------------------------------- zdrowie psychiczne */}
      <Card>
        <CardHeader
          title="Zdrowie psychiczne"
          subtitle="Samopoczucie, myśli i to, co dobrego się wydarzyło. Wszystko jest opcjonalne."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <Field label="Sen (godziny)" htmlFor="sleep">
            <NumberInput id="sleep" step="0.5" value={sleep} onChange={(e) => setSleep(e.target.value)} />
          </Field>
          <Field label="Samopoczucie (1–5)" htmlFor="mood" hint="5 = bardzo dobre">
            <NumberInput id="mood" step="1" min="1" max="5" value={mood} onChange={(e) => setMood(e.target.value)} />
          </Field>
          <Field label="Energia (1–5)" htmlFor="energy" hint="5 = pełna">
            <NumberInput id="energy" step="1" min="1" max="5" value={energy} onChange={(e) => setEnergy(e.target.value)} />
          </Field>
          <Field label="Stres (1–5)" htmlFor="stress" hint="5 = bardzo wysoki">
            <NumberInput id="stress" step="1" min="1" max="5" value={stress} onChange={(e) => setStress(e.target.value)} />
          </Field>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Co dziś chodzi Ci po głowie"
            htmlFor="thoughts"
            hint="Myśli, obawy, to co wraca. Piszesz dla siebie."
          >
            <Textarea id="thoughts" value={thoughts} onChange={(e) => setThoughts(e.target.value)} />
          </Field>
          <Field
            label="Co dobrego się dziś wydarzyło"
            htmlFor="goodThings"
            hint="Choćby drobiazg — to najczęściej pomijana część dnia."
          >
            <Textarea id="goodThings" value={goodThings} onChange={(e) => setGoodThings(e.target.value)} />
          </Field>
        </div>

        <Field label="Notatka dnia" htmlFor="notes" className="mt-4">
          <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        <p className="mt-4 rounded-lg border border-edge bg-surface-2 px-3 py-2 text-xs text-muted">
          Kokpit nie zastępuje pomocy specjalisty. Jeśli jest Ci ciężko, darmowe całodobowe wsparcie:
          <span className="text-ink"> 800 70 2222</span> (Centrum Wsparcia) lub
          <span className="text-ink"> 116 123</span> (kryzysowy telefon zaufania). W sytuacji zagrożenia życia —
          <span className="text-ink"> 112</span>.
        </p>
      </Card>

      <div className="sticky bottom-4 flex justify-end">
        <Submit />
      </div>
    </form>
  );
}

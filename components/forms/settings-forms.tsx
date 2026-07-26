"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Field, FormError, Input, NumberInput, Select } from "@/components/ui/field";
import { saveFinanceStart, saveGoals, saveProfile, type FormState } from "@/lib/actions/config";
import { WEEKDAYS } from "@/lib/domain/dates";

function Submit({ label = "Zapisz" }: { label?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Zapisywanie…" : label}
    </Button>
  );
}

function Saved({ state }: { state: FormState }) {
  if (!state?.ok) return null;
  return <p className="rounded-lg border border-good/40 bg-good/10 px-3 py-2 text-sm text-ink">Zapisano.</p>;
}

const TIMEZONES = [
  "Europe/Warsaw",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Madrid",
  "America/New_York",
  "UTC",
];

export function ProfileForm({
  initial,
  hiddenFields,
  submitLabel,
  footer,
}: {
  initial: { name: string; timezone: string; currency: string; weekStartsOn: number };
  hiddenFields?: Record<string, string>;
  submitLabel?: string;
  footer?: React.ReactNode;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(saveProfile, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {Object.entries(hiddenFields ?? {}).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <FormError>{state?.error}</FormError>
      <Saved state={state} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Imię" htmlFor="name" hint="Pojawia się w powitaniu na dashboardzie.">
          <Input id="name" name="name" defaultValue={initial.name} placeholder="np. Michał" />
        </Field>

        <Field label="Strefa czasowa" htmlFor="timezone" hint="Decyduje, o której zmienia się „dzisiaj”.">
          <Select id="timezone" name="timezone" defaultValue={initial.timezone}>
            {TIMEZONES.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Waluta" htmlFor="currency">
          <Input id="currency" name="currency" defaultValue={initial.currency} maxLength={8} />
        </Field>

        <Field label="Tydzień zaczyna się od" htmlFor="weekStartsOn">
          <Select id="weekStartsOn" name="weekStartsOn" defaultValue={String(initial.weekStartsOn)}>
            {WEEKDAYS.map((day) => (
              <option key={day.value} value={day.value}>
                {day.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1" />
        {footer}
        <Submit label={submitLabel} />
      </div>
    </form>
  );
}

export function FinanceStartForm({
  initial,
  hiddenFields,
  submitLabel,
  footer,
}: {
  initial: { cashBalancePln: number | null; monthlyRevenueGoalPln: number | null };
  hiddenFields?: Record<string, string>;
  submitLabel?: string;
  footer?: React.ReactNode;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(saveFinanceStart, undefined);
  const value = (v: number | null) => (v === null || v === undefined ? "" : String(v));

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {Object.entries(hiddenFields ?? {}).map(([name, v]) => (
        <input key={name} type="hidden" name={name} value={v} />
      ))}
      <FormError>{state?.error}</FormError>
      <Saved state={state} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Stan środków dziś"
          htmlFor="cashBalancePln"
          hint="Punkt startowy. Kolejne dni aktualizujesz w raporcie dziennym."
        >
          <NumberInput
            id="cashBalancePln"
            name="cashBalancePln"
            step="0.01"
            defaultValue={value(initial.cashBalancePln)}
          />
        </Field>

        <Field label="Cel przychodu miesięcznie" htmlFor="monthlyRevenueGoalPln" hint="Możesz zostawić puste.">
          <NumberInput
            id="monthlyRevenueGoalPln"
            name="monthlyRevenueGoalPln"
            step="100"
            defaultValue={value(initial.monthlyRevenueGoalPln)}
          />
        </Field>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1" />
        {footer}
        <Submit label={submitLabel} />
      </div>
    </form>
  );
}

export function GoalsForm({
  initial,
  hiddenFields,
  submitLabel,
  footer,
  sections = "all",
  showCurrentWeight = false,
}: {
  initial: {
    waterGoalMl: number | null;
    waterGoodPct: number;
    waterOkPct: number;
    weightTargetKg: number | null;
    goalCallsPerDay: number | null;
    goalMeetingsScheduledPerDay: number | null;
    goalMeetingsHeldPerDay: number | null;
    goalContractsPerWeek: number | null;
    monthlyRevenueGoalPln: number | null;
  };
  hiddenFields?: Record<string, string>;
  submitLabel?: string;
  footer?: React.ReactNode;
  sections?: "all" | "sprzedaz" | "zdrowie";
  /** W kreatorze zbieramy przy okazji dzisiejszy pomiar wagi. */
  showCurrentWeight?: boolean;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(saveGoals, undefined);
  const showSales = sections === "all" || sections === "sprzedaz";
  const showHealth = sections === "all" || sections === "zdrowie";

  const value = (v: number | null) => (v === null || v === undefined ? "" : String(v));

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {Object.entries(hiddenFields ?? {}).map(([name, v]) => (
        <input key={name} type="hidden" name={name} value={v} />
      ))}
      <FormError>{state?.error}</FormError>
      <Saved state={state} />

      {/* Pola spoza wyświetlanej sekcji jadą jako ukryte, żeby zapis ich nie wyzerował. */}
      {!showSales ? (
        <>
          <input type="hidden" name="goalCallsPerDay" value={value(initial.goalCallsPerDay)} />
          <input type="hidden" name="goalMeetingsScheduledPerDay" value={value(initial.goalMeetingsScheduledPerDay)} />
          <input type="hidden" name="goalMeetingsHeldPerDay" value={value(initial.goalMeetingsHeldPerDay)} />
          <input type="hidden" name="goalContractsPerWeek" value={value(initial.goalContractsPerWeek)} />
          <input type="hidden" name="monthlyRevenueGoalPln" value={value(initial.monthlyRevenueGoalPln)} />
        </>
      ) : null}
      {!showHealth ? (
        <>
          <input type="hidden" name="waterGoalMl" value={value(initial.waterGoalMl)} />
          <input type="hidden" name="waterGoodPct" value={String(initial.waterGoodPct)} />
          <input type="hidden" name="waterOkPct" value={String(initial.waterOkPct)} />
          <input type="hidden" name="weightTargetKg" value={value(initial.weightTargetKg)} />
        </>
      ) : null}

      {showSales ? (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-xs font-semibold tracking-wide text-muted uppercase">Cele sprzedażowe</legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Rozmowy dziennie" htmlFor="goalCallsPerDay">
              <NumberInput id="goalCallsPerDay" name="goalCallsPerDay" step="1" defaultValue={value(initial.goalCallsPerDay)} />
            </Field>
            <Field label="Spotkania umówione dziennie" htmlFor="goalMeetingsScheduledPerDay">
              <NumberInput
                id="goalMeetingsScheduledPerDay"
                name="goalMeetingsScheduledPerDay"
                step="1"
                defaultValue={value(initial.goalMeetingsScheduledPerDay)}
              />
            </Field>
            <Field label="Spotkania odbyte dziennie" htmlFor="goalMeetingsHeldPerDay">
              <NumberInput
                id="goalMeetingsHeldPerDay"
                name="goalMeetingsHeldPerDay"
                step="1"
                defaultValue={value(initial.goalMeetingsHeldPerDay)}
              />
            </Field>
            <Field label="Umowy tygodniowo" htmlFor="goalContractsPerWeek">
              <NumberInput
                id="goalContractsPerWeek"
                name="goalContractsPerWeek"
                step="1"
                defaultValue={value(initial.goalContractsPerWeek)}
              />
            </Field>
            <Field label="Cel przychodu miesięcznie" htmlFor="monthlyRevenueGoalPln">
              <NumberInput
                id="monthlyRevenueGoalPln"
                name="monthlyRevenueGoalPln"
                step="100"
                defaultValue={value(initial.monthlyRevenueGoalPln)}
              />
            </Field>
          </div>
        </fieldset>
      ) : null}

      {showHealth ? (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-xs font-semibold tracking-wide text-muted uppercase">
            Nawodnienie i waga
          </legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Dzienny cel wody (ml)" htmlFor="waterGoalMl">
              <NumberInput id="waterGoalMl" name="waterGoalMl" step="100" defaultValue={value(initial.waterGoalMl)} />
            </Field>
            <Field label="Próg „dobrze” (% celu)" htmlFor="waterGoodPct" hint="Domyślnie 100 %.">
              <NumberInput id="waterGoodPct" name="waterGoodPct" step="5" defaultValue={String(initial.waterGoodPct)} />
            </Field>
            <Field label="Próg „w normie” (% celu)" htmlFor="waterOkPct" hint="Poniżej tego progu: „źle”.">
              <NumberInput id="waterOkPct" name="waterOkPct" step="5" defaultValue={String(initial.waterOkPct)} />
            </Field>
            <Field label="Waga docelowa (kg)" htmlFor="weightTargetKg">
              <NumberInput
                id="weightTargetKg"
                name="weightTargetKg"
                step="0.1"
                defaultValue={value(initial.weightTargetKg)}
              />
            </Field>
            {showCurrentWeight ? (
              <Field
                label="Aktualna waga (kg)"
                htmlFor="currentWeightKg"
                hint="Zapisze się jako dzisiejszy pomiar. Kolejne wpisujesz w raporcie dziennym."
              >
                <NumberInput id="currentWeightKg" name="currentWeightKg" step="0.1" />
              </Field>
            ) : null}
          </div>
        </fieldset>
      ) : null}

      <div className="flex items-center gap-2">
        <div className="flex-1" />
        {footer}
        <Submit label={submitLabel} />
      </div>
    </form>
  );
}

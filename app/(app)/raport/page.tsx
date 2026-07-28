import type { Metadata } from "next";

import { ReportForm } from "./report-form";
import { getUserSettings, requireOnboardedUser } from "@/lib/auth/session";
import { addDays, formatFullDatePl, todayInTz } from "@/lib/domain/dates";
import { liveBalance } from "@/lib/domain/finance";
import { MENTAL_TESTS } from "@/lib/domain/mental-tests";
import { getBalanceRowsBefore } from "@/lib/queries/finance";
import { getWellbeingSummary } from "@/lib/queries/mental";
import { getReportFormData } from "@/lib/queries/report";

export const metadata: Metadata = { title: "Raport dzienny" };
export const dynamic = "force-dynamic";

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ data?: string }>;
}) {
  const user = await requireOnboardedUser();
  const settings = await getUserSettings(user.id);
  const params = await searchParams;

  const today = todayInTz(settings.timezone);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.data ?? "") ? params.data! : today;

  // Podpowiedź salda tylko dla dzisiejszego raportu — edycja przeszłego dnia ma
  // pokazywać to, co wtedy zapisano, a nie dzisiejsze wyliczenie.
  const [data, wellbeing, balanceRows] = await Promise.all([
    getReportFormData(user.id, date),
    getWellbeingSummary(user.id, today),
    date === today ? getBalanceRowsBefore(user.id, addDays(today, 1)) : Promise.resolve([]),
  ]);
  const cashSuggestionPln = date === today ? (liveBalance(balanceRows)?.valuePln ?? null) : null;

  const dueTests = wellbeing.states
    .filter((state) => state.due)
    .map((state) => ({ id: state.testId, name: MENTAL_TESTS[state.testId].name }));

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <header>
        <h1 className="text-xl font-semibold text-ink">Raport dzienny</h1>
        <p className="mt-1 text-sm text-muted">
          {formatFullDatePl(date)}
          {date !== today ? " · raport z innego dnia" : ""}. Wypełnij tyle, ile masz — puste pola zostają puste.
        </p>
      </header>

      <ReportForm
        data={data}
        today={today}
        currency={settings.currency}
        waterGoalMl={settings.waterGoalMl}
        dueTests={dueTests}
        cashSuggestionPln={cashSuggestionPln}
      />
    </div>
  );
}

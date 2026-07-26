import type { Metadata } from "next";

import { ReportForm } from "./report-form";
import { getUserSettings, requireOnboardedUser } from "@/lib/auth/session";
import { formatFullDatePl, todayInTz } from "@/lib/domain/dates";
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

  const data = await getReportFormData(user.id, date);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <header>
        <h1 className="text-xl font-semibold text-ink">Raport dzienny</h1>
        <p className="mt-1 text-sm text-muted">
          {formatFullDatePl(date)}
          {date !== today ? " · raport z innego dnia" : ""}. Wypełnij tyle, ile masz — puste pola zostają puste.
        </p>
      </header>

      <ReportForm data={data} today={today} currency={settings.currency} waterGoalMl={settings.waterGoalMl} />
    </div>
  );
}

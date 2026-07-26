import Link from "next/link";
import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { ClipboardList } from "lucide-react";

import { Card, CardHeader, EmptyState } from "@/components/ui/card";
import { requireOnboardedUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { reportSubmissions } from "@/lib/db/schema";
import { formatFullDatePl } from "@/lib/domain/dates";

export const metadata: Metadata = { title: "Historia raportów" };
export const dynamic = "force-dynamic";

const plDateTime = new Intl.DateTimeFormat("pl-PL", { dateStyle: "short", timeStyle: "short" });

export default async function ReportHistoryPage() {
  const user = await requireOnboardedUser();

  const rows = await db
    .select({
      id: reportSubmissions.id,
      date: reportSubmissions.date,
      submittedAt: reportSubmissions.submittedAt,
    })
    .from(reportSubmissions)
    .where(eq(reportSubmissions.userId, user.id))
    .orderBy(desc(reportSubmissions.submittedAt))
    .limit(100);

  // Jeden dzień może mieć kilka zapisów — pokazujemy je zgrupowane.
  const byDate = new Map<string, typeof rows>();
  for (const row of rows) {
    const list = byDate.get(row.date);
    if (list) list.push(row);
    else byDate.set(row.date, [row]);
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <Card>
        <CardHeader
          title="Historia raportów"
          subtitle="Każdy zapis raportu zostaje w bazie — możesz wrócić do dowolnego dnia i poprawić dane."
          icon={ClipboardList}
          action={
            <Link href="/raport" className="text-muted hover:text-ink">
              Nowy raport
            </Link>
          }
        />

        {rows.length === 0 ? (
          <EmptyState message="Nie wysłałeś jeszcze żadnego raportu." href="/raport" cta="Wypełnij pierwszy" />
        ) : (
          <ul className="flex flex-col gap-1">
            {[...byDate.entries()].map(([date, entries]) => (
              <li key={date}>
                <Link
                  href={`/raport?data=${date}`}
                  className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 hover:bg-surface-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-ink">{formatFullDatePl(date)}</p>
                    <p className="text-xs text-muted">
                      {entries.length === 1
                        ? `zapisany ${plDateTime.format(entries[0].submittedAt)}`
                        : `${entries.length} zapisy, ostatni ${plDateTime.format(entries[0].submittedAt)}`}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-series-1">otwórz →</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

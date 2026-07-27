import { NextResponse, type NextRequest } from "next/server";
import { eq, isNotNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { settings as settingsTable, users } from "@/lib/db/schema";
import { generateMentorAdvice } from "@/lib/ai/mentor";
import { safeEqual } from "@/lib/auth/session";
import { todayInTz } from "@/lib/domain/dates";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Poranna generacja rekomendacji. Wywoływana przez Vercel Cron, nie przez przeglądarkę —
 * dlatego chroni ją własny sekret, a nie sesja użytkownika.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Brak CRON_SECRET w konfiguracji." }, { status: 500 });
  }

  const header = request.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!provided || !safeEqual(provided, secret)) {
    return NextResponse.json({ error: "Brak uprawnień." }, { status: 401 });
  }

  const rows = await db
    .select({ userId: users.id, settings: settingsTable })
    .from(users)
    .innerJoin(settingsTable, eq(settingsTable.userId, users.id))
    .where(isNotNull(users.onboardedAt));

  const results: Array<{ userId: string; ok: boolean; error?: string }> = [];

  for (const row of rows) {
    try {
      await generateMentorAdvice({
        userId: row.userId,
        settings: row.settings,
        today: todayInTz(row.settings.timezone),
      });
      results.push({ userId: row.userId, ok: true });
    } catch (error) {
      results.push({
        userId: row.userId,
        ok: false,
        error: error instanceof Error ? error.message : "nieznany błąd",
      });
    }
  }

  return NextResponse.json({ generated: results.filter((r) => r.ok).length, results });
}

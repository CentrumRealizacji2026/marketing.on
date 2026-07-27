import "server-only";

import { and, asc, eq, gte, lte } from "drizzle-orm";

import { db } from "@/lib/db";
import { familyEvents, familyGestureLogs, familyMembers, type Settings } from "@/lib/db/schema";
import { familyDatesInRange, upcomingFamilyDates, type EventInput, type MemberInput } from "@/lib/domain/family";
import { planGesturesAround, seedFromId, type PlannedGesture } from "@/lib/domain/gestures";

export type GestureWithState = PlannedGesture & { done: boolean };

async function loadPeople(userId: string) {
  const [members, events] = await Promise.all([
    db.select().from(familyMembers).where(eq(familyMembers.userId, userId)).orderBy(asc(familyMembers.position)),
    db.select().from(familyEvents).where(eq(familyEvents.userId, userId)).orderBy(asc(familyEvents.date)),
  ]);
  return { members: members as MemberInput[], events: events as EventInput[] };
}

/**
 * Stan kategorii „Rodzina": osoby, wydarzenia, najbliższe daty i plan drobnych
 * gestów na bieżący tydzień wraz z tym, co już odhaczone.
 */
export async function getFamilyOverview(userId: string, settings: Settings, today: string) {
  const { members, events } = await loadPeople(userId);
  const upcoming = upcomingFamilyDates(members, events, today, 120);

  const planned = planGesturesAround(
    today,
    settings.familyGesturesPerWeek,
    settings.weekStartsOn,
    seedFromId(userId),
  );

  const logs =
    planned.length === 0
      ? []
      : await db
          .select()
          .from(familyGestureLogs)
          .where(
            and(
              eq(familyGestureLogs.userId, userId),
              gte(familyGestureLogs.date, planned[0].date),
              lte(familyGestureLogs.date, planned[planned.length - 1].date),
            ),
          );

  const gestures: GestureWithState[] = planned.map((entry) => ({
    ...entry,
    done: logs.some((log) => log.date === entry.date && log.gestureId === entry.gesture.id && log.done),
  }));

  return { members, events, upcoming, gestures };
}

/** Daty rodzinne wypadające w zakresie — dla kalendarza. */
export async function getFamilyDatesInRange(userId: string, from: string, to: string, today: string) {
  const { members, events } = await loadPeople(userId);
  return familyDatesInRange(members, events, from, to, today);
}

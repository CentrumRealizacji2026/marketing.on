import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { and, eq, gt, lt } from "drizzle-orm";
import bcrypt from "bcryptjs";

import { db } from "@/lib/db";
import { sessions, settings, users, type Settings, type User } from "@/lib/db/schema";

const COOKIE_NAME = "zycie_session";
const SESSION_DAYS = 30;

/**
 * Sesje są nieprzezroczystymi tokenami trzymanymi w bazie w postaci skrótu.
 * Ciasteczko samo w sobie niczego nie potwierdza — każde żądanie weryfikuje token
 * po stronie serwera, a wylogowanie natychmiast unieważnia sesję.
 */

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** Porównanie odporne na pomiar czasu — używane tam, gdzie porównujemy sekrety z env. */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);

  await db.insert(sessions).values({ userId, tokenHash: hashToken(token), expiresAt });

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  // Sprzątanie wygasłych sesji przy okazji logowania.
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  }
  store.delete(COOKIE_NAME);
}

export type SessionUser = Pick<User, "id" | "email" | "name" | "onboardedAt" | "onboardingStep">;

/**
 * `cache` sprawia, że w obrębie jednego żądania sesja jest odczytywana raz,
 * nawet jeśli pyta o nią kilka komponentów serwerowych.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      onboardedAt: users.onboardedAt,
      onboardingStep: users.onboardingStep,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);

  return rows[0] ?? null;
});

/** Zalogowany użytkownik albo przekierowanie na logowanie. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Jak wyżej, ale dodatkowo wymusza ukończenie kreatora profilu. */
export async function requireOnboardedUser(): Promise<SessionUser> {
  const user = await requireUser();
  if (!user.onboardedAt) redirect("/start");
  return user;
}

export const getUserSettings = cache(async (userId: string): Promise<Settings> => {
  const rows = await db.select().from(settings).where(eq(settings.userId, userId)).limit(1);
  if (rows[0]) return rows[0];

  const [created] = await db.insert(settings).values({ userId }).returning();
  return created;
});

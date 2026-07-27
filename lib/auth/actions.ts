"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { loginAttempts, settings, users } from "@/lib/db/schema";
import {
  LIMIT_EMAIL,
  LIMIT_IP,
  OKNO_MINUT,
  adresIp,
  ocenBlokade,
  opiszBlokade,
} from "@/lib/domain/rate-limit";
import { createSession, destroySession, hashPassword, verifyPassword } from "./session";

export type AuthState = { error?: string } | undefined;

const emailSchema = z.string().trim().toLowerCase().email("Podaj poprawny adres e-mail.");

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Podaj hasło."),
});

const registerSchema = z
  .object({
    name: z.string().trim().max(120).optional(),
    email: emailSchema,
    password: z.string().min(10, "Hasło musi mieć co najmniej 10 znaków."),
    passwordConfirm: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Hasła nie są takie same.",
    path: ["passwordConfirm"],
  });

function allowedSignupEmails(): string[] {
  return (process.env.ALLOWED_SIGNUP_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Rejestracja jest zamknięta: konto zakłada adres wskazany w ALLOWED_SIGNUP_EMAILS,
 * a przy pustej bazie — pierwsza osoba, która zdąży.
 *
 * „Pierwsza, która zdąży" jest bezpieczne lokalnie, ale nie pod publicznym adresem:
 * między wdrożeniem a Twoją rejestracją każdy, kto zna URL, mógłby zająć konto
 * właściciela. Dlatego na hostingu wymagamy listy adresów — wtedy okno znika,
 * bo liczy się nie kolejność, tylko wpisany adres.
 */
function publicznyHosting(): boolean {
  return Boolean(process.env.VERCEL);
}

export async function canRegister(email?: string): Promise<boolean> {
  const allowed = allowedSignupEmails();
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(users);

  if (count === 0 && !publicznyHosting()) return true;
  if (allowed.length === 0) return false;
  if (!email) return true;
  return allowed.includes(email.trim().toLowerCase());
}

/**
 * Blokada po nieudanych próbach. Zwraca komunikat, gdy trzeba odmówić,
 * albo null, gdy można sprawdzać hasło.
 */
async function sprawdzBlokade(email: string, ip: string): Promise<string | null> {
  const teraz = new Date();
  const odKiedy = new Date(teraz.getTime() - OKNO_MINUT * 60_000);

  const proby = await db
    .select({ identifier: loginAttempts.identifier, attemptedAt: loginAttempts.attemptedAt })
    .from(loginAttempts)
    .where(and(inArray(loginAttempts.identifier, [email, ip]), gte(loginAttempts.attemptedAt, odKiedy)));

  for (const [identyfikator, limit] of [
    [email, LIMIT_EMAIL],
    [ip, LIMIT_IP],
  ] as const) {
    const dopasowane = proby.filter((p) => p.identifier === identyfikator).map((p) => p.attemptedAt);
    const blokada = ocenBlokade(dopasowane, limit, teraz);
    if (blokada.zablokowane) return opiszBlokade(blokada.minutDoKonca);
  }

  return null;
}

async function zapiszNieudanaProbe(email: string, ip: string): Promise<void> {
  await db.insert(loginAttempts).values([{ identifier: email }, { identifier: ip }]);

  // Sprzątanie starych wpisów przy okazji — tabela nie ma rosnąć w nieskończoność.
  await db.delete(loginAttempts).where(lt(loginAttempts.attemptedAt, new Date(Date.now() - 86_400_000)));
}

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Nieprawidłowe dane." };
  }

  const ip = adresIp(await headers());
  const blokada = await sprawdzBlokade(parsed.data.email, ip);
  if (blokada) return { error: blokada };

  const [user] = await db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = ${parsed.data.email}`)
    .limit(1);

  // Ten sam komunikat dla złego adresu i złego hasła — nie podpowiadamy, które konto istnieje.
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    await zapiszNieudanaProbe(parsed.data.email, ip);
    return { error: "Nieprawidłowy e-mail lub hasło." };
  }

  // Udane logowanie zeruje licznik — pomyłki przed trafieniem w hasło nie ciągną się dalej.
  await db.delete(loginAttempts).where(inArray(loginAttempts.identifier, [parsed.data.email, ip]));

  await createSession(user.id);
  redirect(user.onboardedAt ? "/" : "/start");
}

export async function register(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name") || undefined,
    email: formData.get("email"),
    password: formData.get("password"),
    passwordConfirm: formData.get("passwordConfirm"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Nieprawidłowe dane." };
  }

  if (!(await canRegister(parsed.data.email))) {
    return { error: "Rejestracja jest zamknięta. Dodaj swój adres do ALLOWED_SIGNUP_EMAILS." };
  }

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.email}) = ${parsed.data.email}`)
    .limit(1);

  if (existing) {
    return { error: "Konto z tym adresem już istnieje." };
  }

  const [user] = await db
    .insert(users)
    .values({
      email: parsed.data.email,
      name: parsed.data.name ?? null,
      passwordHash: await hashPassword(parsed.data.password),
    })
    .returning();

  await db.insert(settings).values({ userId: user.id }).onConflictDoNothing();
  await createSession(user.id);
  redirect("/start");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}

export async function changePassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { getCurrentUser } = await import("./session");
  const current = await getCurrentUser();
  if (!current) return { error: "Sesja wygasła. Zaloguj się ponownie." };

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");

  if (newPassword.length < 10) return { error: "Nowe hasło musi mieć co najmniej 10 znaków." };

  const [user] = await db.select().from(users).where(eq(users.id, current.id)).limit(1);
  if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) {
    return { error: "Obecne hasło jest nieprawidłowe." };
  }

  await db
    .update(users)
    .set({ passwordHash: await hashPassword(newPassword), updatedAt: new Date() })
    .where(eq(users.id, current.id));

  return { error: undefined };
}

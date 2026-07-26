"use server";

import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { settings, users } from "@/lib/db/schema";
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
 * Rejestracja jest zamknięta: konto założy pierwsza osoba (bo aplikacja jest jeszcze pusta)
 * albo adres wskazany w ALLOWED_SIGNUP_EMAILS. Publiczny adres nie zbiera więc obcych kont.
 */
export async function canRegister(email?: string): Promise<boolean> {
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
  if (count === 0) return true;
  const allowed = allowedSignupEmails();
  if (allowed.length === 0) return false;
  if (!email) return true;
  return allowed.includes(email.trim().toLowerCase());
}

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Nieprawidłowe dane." };
  }

  const [user] = await db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = ${parsed.data.email}`)
    .limit(1);

  // Ten sam komunikat dla złego adresu i złego hasła — nie podpowiadamy, które konto istnieje.
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { error: "Nieprawidłowy e-mail lub hasło." };
  }

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

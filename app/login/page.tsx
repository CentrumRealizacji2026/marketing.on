import Link from "next/link";
import type { Metadata } from "next";

import { LoginForm } from "./login-form";
import { canRegister } from "@/lib/auth/actions";

export const metadata: Metadata = { title: "Logowanie" };

export default async function LoginPage() {
  const registrationOpen = await canRegister();

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-ink">Kokpit</h1>
        <p className="mt-1 mb-6 text-sm text-muted">
          Finanse, sprzedaż, zdrowie, zadania, trening i nauka w jednym miejscu.
        </p>

        <LoginForm />

        {registrationOpen ? (
          <p className="mt-6 text-center text-xs text-muted">
            Nie masz jeszcze konta?{" "}
            <Link href="/rejestracja" className="font-medium text-series-1 hover:underline">
              Załóż konto
            </Link>
          </p>
        ) : null}
      </div>
    </div>
  );
}

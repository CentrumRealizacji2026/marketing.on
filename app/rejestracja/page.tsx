import Link from "next/link";
import type { Metadata } from "next";

import { RegisterForm } from "./register-form";
import { canRegister } from "@/lib/auth/actions";

export const metadata: Metadata = { title: "Załóż konto" };

// Dostępność rejestracji zależy od stanu bazy, więc strony nie wolno prerenderować.
export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const open = await canRegister();

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-ink">Załóż konto</h1>
        <p className="mt-1 mb-6 text-sm text-muted">
          Po rejestracji przejdziesz przez kreator, w którym ustawisz swój profil.
        </p>

        {open ? (
          <RegisterForm />
        ) : (
          <div className="rounded-xl border border-edge bg-surface p-5 text-sm text-ink-2">
            <p>
              Rejestracja jest zamknięta. Aby dopuścić kolejny adres, dopisz go do zmiennej
              <code className="mx-1 rounded bg-surface-2 px-1.5 py-0.5 text-xs">ALLOWED_SIGNUP_EMAILS</code>
              w konfiguracji aplikacji.
            </p>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-muted">
          Masz już konto?{" "}
          <Link href="/login" className="font-medium text-series-1 hover:underline">
            Zaloguj się
          </Link>
        </p>
      </div>
    </div>
  );
}

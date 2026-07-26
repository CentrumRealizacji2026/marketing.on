"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { changePassword, type AuthState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input } from "@/components/ui/field";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Zmienianie…" : "Zmień hasło"}
    </Button>
  );
}

export function PasswordForm() {
  const [state, formAction] = useActionState<AuthState, FormData>(changePassword, undefined);
  const saved = state !== undefined && !state.error;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormError>{state?.error}</FormError>
      {saved ? (
        <p className="rounded-lg border border-good/40 bg-good/10 px-3 py-2 text-sm text-ink">Hasło zmienione.</p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Obecne hasło" htmlFor="currentPassword">
          <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
        </Field>
        <Field label="Nowe hasło" htmlFor="newPassword" hint="Minimum 10 znaków.">
          <Input
            id="newPassword"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={10}
          />
        </Field>
      </div>

      <div>
        <Submit />
      </div>
    </form>
  );
}

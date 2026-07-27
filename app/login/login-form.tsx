"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { login, type AuthState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input } from "@/components/ui/field";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Logowanie…" : "Zaloguj się"}
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState<AuthState, FormData>(login, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-xl border border-edge bg-surface p-5">
      <FormError>{state?.error}</FormError>

      <Field label="E-mail" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
      </Field>

      <Field label="Hasło" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>

      <SubmitButton />
    </form>
  );
}

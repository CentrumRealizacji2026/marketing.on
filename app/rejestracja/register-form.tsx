"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { register, type AuthState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input } from "@/components/ui/field";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Zakładanie konta…" : "Załóż konto i zacznij"}
    </Button>
  );
}

export function RegisterForm() {
  const [state, formAction] = useActionState<AuthState, FormData>(register, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-xl border border-edge bg-surface p-5">
      <FormError>{state?.error}</FormError>

      <Field label="Imię" htmlFor="name" hint="Używane tylko w powitaniu na dashboardzie.">
        <Input id="name" name="name" autoComplete="given-name" />
      </Field>

      <Field label="E-mail" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>

      <Field label="Hasło" htmlFor="password" hint="Minimum 10 znaków.">
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} />
      </Field>

      <Field label="Powtórz hasło" htmlFor="passwordConfirm">
        <Input
          id="passwordConfirm"
          name="passwordConfirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
        />
      </Field>

      <SubmitButton />
    </form>
  );
}

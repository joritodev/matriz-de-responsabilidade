"use client";

import { useActionState } from "react";
import { Field } from "@/components/Field";
import { Button } from "@/components/Button";
import { loginAction, type LoginState } from "./actions";

export function LoginForm({ initialError }: { initialError: string | null }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, { error: initialError, email: "" });
  return (
    <form action={action} className="mt-7 flex flex-col gap-4" noValidate>
      <Field label="E-mail" htmlFor="login-email">
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          defaultValue={state.email}
          required
          className="field bg-surface-muted"
          aria-invalid={state.error ? true : undefined}
        />
      </Field>
      <Field label="Senha" htmlFor="login-password" error={state.error}>
        <input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="field bg-surface-muted"
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "login-password-error" : undefined}
        />
      </Field>
      <Button type="submit" size="form" className="mt-2 w-full" loading={pending}>
        Entrar
      </Button>
    </form>
  );
}

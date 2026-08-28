"use client";

import { useState } from "react";
import { loginAction } from "@/lib/actions";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await loginAction(formData);
    if (result?.error) {
      setError(result.error);
      setPending(false);
    }
  }

  return (
    <form action={onSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        E-mail
        <input
          name="email"
          type="email"
          required
          autoComplete="username"
          className="rounded-sm border border-[#d6d3cd] bg-white px-3 py-2"
          defaultValue="admin@local.test"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Senha
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="rounded-sm border border-[#d6d3cd] bg-white px-3 py-2"
        />
      </label>
      {error ? <p className="text-sm text-red-800">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="mt-2 bg-[#0f3d3e] px-4 py-2 text-sm font-medium text-[#fbfaf6] disabled:opacity-60"
      >
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}

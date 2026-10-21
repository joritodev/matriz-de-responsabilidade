"use client";

import { WarningCircleIcon } from "@phosphor-icons/react";
import { Button } from "@/components/Button";

export default function RootError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <section role="alert" className="flex w-full max-w-[460px] flex-col items-start gap-4 rounded-card bg-surface p-6 md:p-8">
        <WarningCircleIcon size={28} className="text-late-fg" aria-hidden="true" />
        <div>
          <h1 className="text-[22px] leading-7 font-bold tracking-[-0.02em]">O Prazo não conseguiu abrir.</h1>
          <p className="mt-2 text-[15px] leading-[22px] text-ink-2">
            O servidor da API não respondeu. Se você está rodando localmente, confira se <code className="text-ink">pnpm dev</code> subiu a API na porta 4318.
          </p>
        </div>
        <Button onClick={reset}>Tentar de novo</Button>
      </section>
    </main>
  );
}

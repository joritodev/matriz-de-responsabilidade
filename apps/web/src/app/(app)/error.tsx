"use client";

import { WarningCircleIcon } from "@phosphor-icons/react";
import { Button } from "@/components/Button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="flex flex-col items-start gap-4 rounded-card bg-surface p-6 md:p-8" role="alert">
      <WarningCircleIcon size={28} className="text-late-fg" aria-hidden="true" />
      <div>
        <h1 className="text-[22px] leading-7 font-bold tracking-[-0.02em]">Não deu para carregar esta tela.</h1>
        <p className="mt-2 max-w-[560px] text-[15px] leading-[22px] text-ink-2">
          {error.message && !error.digest ? error.message : "O servidor não respondeu como esperado. Confira a conexão e tente de novo."}
        </p>
      </div>
      <Button onClick={reset}>Tentar de novo</Button>
    </section>
  );
}

"use client";

import { useState } from "react";
import type { ReminderTarget } from "@/lib/queries";

export function ReminderActions({ targets }: { targets: ReminderTarget[] }) {
  const [copied, setCopied] = useState<string | null>(null);

  if (targets.length === 0) {
    return <p className="mt-3 text-xs text-stone-500">Nenhum responsável ativo nesta tarefa.</p>;
  }

  async function copy(target: ReminderTarget) {
    try {
      await navigator.clipboard.writeText(target.message);
      setCopied(target.responsibleId);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  }

  return (
    <div className="mt-3 border-t border-[#e5e2db] pt-3">
      <p className="text-xs uppercase tracking-wide text-stone-500">Lembrar responsável</p>
      <ul className="mt-2 space-y-2">
        {targets.map((target) => (
          <li key={target.responsibleId} className="flex flex-wrap items-center gap-2">
            <span className="text-sm">{target.name}</span>
            {target.blockedReason ? (
              <span className="text-xs text-stone-500">— {target.blockedReason}</span>
            ) : (
              <>
                <a
                  href={target.chatLink ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border border-[#0f3d3e] bg-[#0f3d3e] px-2.5 py-1 text-xs text-[#fbfaf6]"
                >
                  Abrir no WhatsApp
                </a>
                <button
                  type="button"
                  onClick={() => copy(target)}
                  className="border border-[#d6d3cd] px-2.5 py-1 text-xs text-stone-700"
                >
                  {copied === target.responsibleId ? "Copiado" : "Copiar texto"}
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-stone-500">
        O texto abre já preenchido na sua conversa. O envio continua sendo seu — nenhuma mensagem sai sozinha.
      </p>
    </div>
  );
}

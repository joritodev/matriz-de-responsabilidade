"use client";

import { PlusIcon } from "@phosphor-icons/react";
import { useNewTaskPanel } from "./NewTaskPanel";

/** Celular: botão flutuante de nova demanda. Única sombra do app. */
export function Fab() {
  const { setOpen } = useNewTaskPanel();
  return (
    <button
      type="button"
      aria-label="Nova demanda"
      onClick={() => setOpen(true)}
      className="pressable fixed right-4 bottom-[92px] z-30 flex h-14 w-14 items-center justify-center rounded-full bg-ink text-white shadow-[var(--shadow-fab)] md:hidden"
    >
      <PlusIcon size={24} weight="regular" aria-hidden="true" />
    </button>
  );
}

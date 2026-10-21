"use client";

import { useEffect, useRef } from "react";
import { Button } from "./Button";

/** Modal só para ação destrutiva. */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  onConfirm,
  onClose,
  pending = false,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  pending?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="confirm-title"
      className="m-auto w-[min(420px,calc(100vw-32px))] rounded-card bg-surface p-6 text-ink backdrop:bg-[rgba(22,24,29,.4)]"
    >
      <h2 id="confirm-title" className="text-[20px] leading-6 font-bold tracking-[-0.02em]">
        {title}
      </h2>
      <p className="mt-2 text-[15px] leading-[22px] text-ink-2">{body}</p>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Voltar
        </Button>
        <Button variant="danger" onClick={onConfirm} loading={pending}>
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}

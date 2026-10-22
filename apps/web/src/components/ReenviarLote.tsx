"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requeueBatchAction } from "@/app/(app)/actions";
import { Button } from "./Button";
import { ConfirmDialog } from "./ConfirmDialog";
import { useCanWrite } from "./Role";
import { useToast } from "./Toast";

/** Lote "recebida pelo Make" de dia anterior sem confirmação: libera a reserva para a próxima cobrança. */
export function ReenviarLote({ id, firstName }: { id: string; firstName: string }) {
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const canWrite = useCanWrite();

  const resend = () =>
    start(async () => {
      const res = await requeueBatchAction(id);
      setConfirm(false);
      if (!res.ok) return setError(res.message);
      setError(null);
      toast(`Cobrança de ${firstName} liberada: sai de novo no próximo dia útil.`);
      router.refresh();
    });

  if (!canWrite) return null;

  return (
    <>
      <Button variant="secondary" size="row" className="mt-2" onClick={() => setConfirm(true)} disabled={pending}>
        Reenviar
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-[13px] text-late-fg">
          {error}
        </p>
      )}
      <ConfirmDialog
        open={confirm}
        title={`Reenviar a cobrança de ${firstName}?`}
        body="O Make recebeu, mas nunca confirmou o envio. A reserva é liberada e a cobrança volta a ser planejada no próximo dia útil — pode chegar uma mensagem repetida."
        confirmLabel="Reenviar"
        pending={pending}
        onConfirm={resend}
        onClose={() => setConfirm(false)}
      />
    </>
  );
}

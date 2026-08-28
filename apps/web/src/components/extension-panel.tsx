"use client";

import {
  approveExtensionAction,
  rejectExtensionAction,
  requestExtensionAction,
} from "@/lib/actions";
import { CopyButton } from "@/components/copy-button";

export type ExtensionRow = {
  id: string;
  status: string;
  reason: string | null;
  previousDueDate: string | null;
  requestedDueDate: string | null;
  approvedDueDate: string | null;
  requestedAt: Date;
};

export function ExtensionPanel({
  taskId,
  matrixId,
  extensionStatus,
  extensions,
  chefsCopyText,
  responsibleApprovedText,
  responsibleRejectedText,
  canRequest,
}: {
  taskId: string;
  matrixId: string;
  extensionStatus: string;
  extensions: ExtensionRow[];
  chefsCopyText: string | null;
  responsibleApprovedText: string | null;
  responsibleRejectedText: string | null;
  canRequest: boolean;
}) {
  const open = extensions.find((e) => e.status === "REQUESTED");

  return (
    <section className="mt-6 border border-[#d6d3cd] bg-[#fbfaf6] p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Prorrogação</h2>
      <p className="mt-1 text-xs text-stone-500">
        Pedido não altera o prazo até você aprovar. O grupo dos chefes recebe texto copiável — o app não envia sozinho.
      </p>

      {canRequest && extensionStatus !== "REQUESTED" ? (
        <form action={requestExtensionAction} className="mt-4 space-y-2 text-sm">
          <input type="hidden" name="taskId" value={taskId} />
          <input type="hidden" name="matrixId" value={matrixId} />
          <label className="flex flex-col gap-1">
            Nova data pedida (opcional)
            <input type="date" name="requestedDueDate" className="border border-[#d6d3cd] bg-white px-2 py-2" />
          </label>
          <label className="flex flex-col gap-1">
            Motivo
            <textarea name="reason" required rows={2} className="border border-[#d6d3cd] bg-white px-2 py-2" />
          </label>
          <button type="submit" className="bg-[#0f3d3e] px-3 py-2 text-[#fbfaf6]">
            Registrar pedido
          </button>
        </form>
      ) : null}

      {open && chefsCopyText ? (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium">Pedido em análise</p>
          <pre className="whitespace-pre-wrap border-l-2 border-[#d6d3cd] bg-white/60 p-3 text-xs text-stone-700">
            {chefsCopyText}
          </pre>
          <CopyButton text={chefsCopyText} label="Copiar para o grupo dos chefes" />
          <form action={approveExtensionAction} className="mt-3 flex flex-wrap items-end gap-2 text-sm">
            <input type="hidden" name="extensionId" value={open.id} />
            <input type="hidden" name="taskId" value={taskId} />
            <input type="hidden" name="matrixId" value={matrixId} />
            <label className="flex flex-col gap-1">
              Data aprovada
              <input
                type="date"
                name="approvedDueDate"
                required
                defaultValue={open.requestedDueDate ?? ""}
                className="border border-[#d6d3cd] bg-white px-2 py-2"
              />
            </label>
            <button type="submit" className="bg-[#0f3d3e] px-3 py-2 text-[#fbfaf6]">
              Aprovar prorrogação
            </button>
          </form>
          <form action={rejectExtensionAction} className="flex flex-wrap items-end gap-2 text-sm">
            <input type="hidden" name="extensionId" value={open.id} />
            <input type="hidden" name="taskId" value={taskId} />
            <input type="hidden" name="matrixId" value={matrixId} />
            <button type="submit" className="border border-[#0f3d3e] px-3 py-2 text-[#0f3d3e]">
              Rejeitar
            </button>
          </form>
        </div>
      ) : null}

      {responsibleApprovedText ? (
        <div className="mt-4">
          <p className="text-xs text-stone-500">Texto para o responsável (aprovado):</p>
          <pre className="mt-1 whitespace-pre-wrap text-xs text-stone-700">{responsibleApprovedText}</pre>
          <CopyButton text={responsibleApprovedText} label="Copiar para o responsável" />
        </div>
      ) : null}

      {responsibleRejectedText ? (
        <div className="mt-4">
          <p className="text-xs text-stone-500">Texto para o responsável (rejeitado):</p>
          <pre className="mt-1 whitespace-pre-wrap text-xs text-stone-700">{responsibleRejectedText}</pre>
          <CopyButton text={responsibleRejectedText} label="Copiar para o responsável" />
        </div>
      ) : null}

      {extensions.length > 0 ? (
        <ul className="mt-4 space-y-1 text-xs text-stone-600">
          {extensions.map((ext) => (
            <li key={ext.id}>
              {ext.status} · pedido {ext.requestedAt.toISOString().slice(0, 10)}
              {ext.approvedDueDate ? ` · aprovado ${ext.approvedDueDate}` : ""}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

import Link from "next/link";
import { extensionStatusLabel } from "@/lib/labels";
import { formatDatePtBr } from "@/lib/dates";
import { listExtensionHistory } from "@/lib/queries";

export default async function ExtensionsPage() {
  const rows = await listExtensionHistory();

  return (
    <div>
      <h1 className="font-[family-name:var(--font-source-serif)] text-3xl">Prorrogações</h1>
      <p className="mt-1 text-sm text-stone-600">
        Histórico de pedidos, aprovações e rejeições. Novos pedidos são feitos no detalhe da tarefa.
      </p>

      {rows.length === 0 ? (
        <p className="mt-6 border border-[#d6d3cd] bg-[#fbfaf6] p-4 text-sm text-stone-600">
          Nenhuma prorrogação registrada ainda.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto border border-[#d6d3cd] bg-[#fbfaf6]">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#d6d3cd] text-left text-xs uppercase tracking-wide text-stone-500">
                <th className="px-3 py-2">Pedido em</th>
                <th className="px-3 py-2">Matriz / #</th>
                <th className="px-3 py-2">Tarefa</th>
                <th className="px-3 py-2">Responsável</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Prazo anterior</th>
                <th className="px-3 py-2">Pedido</th>
                <th className="px-3 py-2">Aprovado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-[#ece8e1]">
                  <td className="px-3 py-2 tabular-nums text-xs">{row.requestedAt.toISOString().slice(0, 10)}</td>
                  <td className="px-3 py-2">
                    {row.matrixId ? (
                      <Link href={`/matrices/${row.matrixId}`} className="underline-offset-2 hover:underline">
                        {row.matrixName} #{row.sequenceNumber}
                      </Link>
                    ) : (
                      `${row.matrixName} #${row.sequenceNumber}`
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {row.matrixId ? (
                      <Link
                        href={`/matrices/${row.matrixId}/tasks/${row.taskId}`}
                        className="underline-offset-2 hover:underline"
                      >
                        {row.taskTitle}
                      </Link>
                    ) : (
                      row.taskTitle
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs">{row.responsibleNames.join(", ") || "—"}</td>
                  <td className="px-3 py-2">{extensionStatusLabel[row.status as keyof typeof extensionStatusLabel] ?? row.status}</td>
                  <td className="px-3 py-2 tabular-nums">{formatDatePtBr(row.previousDueDate)}</td>
                  <td className="px-3 py-2 tabular-nums">{formatDatePtBr(row.requestedDueDate)}</td>
                  <td className="px-3 py-2 tabular-nums">{formatDatePtBr(row.approvedDueDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

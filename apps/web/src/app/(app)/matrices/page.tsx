import Link from "next/link";
import { archiveMatrixAction } from "@/lib/actions";
import { getCurrentUser } from "@/lib/auth";
import { listMatrices } from "@/lib/queries";
import { matrixTypeLabel } from "@/lib/labels";
import { formatDatePtBr } from "@/lib/dates";

export default async function MatricesPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>;
}) {
  const params = await searchParams;
  const includeArchived = params.archived === "1";
  const user = await getCurrentUser();
  const rows = await listMatrices(includeArchived);

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-source-serif)] text-3xl">Matrizes</h1>
          <p className="mt-1 text-sm text-stone-600">Arquivadas saem da lista padrão. Tipo Geral não é a Visão Geral.</p>
        </div>
        <Link href="/matrices/new" className="bg-[#0f3d3e] px-3 py-2 text-sm text-[#fbfaf6]">
          Nova matriz
        </Link>
      </div>
      <p className="mt-3 text-sm">
        <Link href={includeArchived ? "/matrices" : "/matrices?archived=1"} className="underline">
          {includeArchived ? "Ocultar arquivadas" : "Mostrar arquivadas"}
        </Link>
      </p>
      <table className="mt-4 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-[#d6d3cd] text-left text-xs uppercase tracking-wide text-stone-500">
            <th className="py-2 pr-3">Nome</th>
            <th className="py-2 pr-3">Tipo</th>
            <th className="py-2 pr-3">Demandas</th>
            <th className="py-2 pr-3">Atenção</th>
            <th className="py-2 pr-3">Atualizada</th>
            <th className="py-2">Ações</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-10 text-stone-500">
                Nenhuma matriz. Crie “Matriz Geral” ou “OD Academy”.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id} className="border-b border-[#ece8e1]">
                <td className="py-2 pr-3">
                  <Link href={`/matrices/${row.id}`} className="font-medium underline-offset-2 hover:underline">
                    {row.name}
                  </Link>
                  {row.description ? <p className="text-xs text-stone-500">{row.description}</p> : null}
                  {!row.active ? <p className="text-xs text-stone-500">Arquivada</p> : null}
                </td>
                <td className="py-2 pr-3">{matrixTypeLabel[row.type]}</td>
                <td className="py-2 pr-3 tabular-nums">{row.taskCount}</td>
                <td className="py-2 pr-3 text-xs">
                  {row.overdue} atrasadas · {row.dueToday} hoje · {row.blocked} bloqueadas
                </td>
                <td className="py-2 pr-3 tabular-nums">{formatDatePtBr(row.updatedAt.toISOString())}</td>
                <td className="py-2">
                  {row.active && user?.role === "ADMIN" ? (
                    <form action={archiveMatrixAction}>
                      <input type="hidden" name="matrixId" value={row.id} />
                      <button className="text-xs text-stone-600 underline">Arquivar</button>
                    </form>
                  ) : null}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

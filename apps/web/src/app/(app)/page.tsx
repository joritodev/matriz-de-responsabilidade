import Link from "next/link";
import { dashboardSummary } from "@/lib/queries";
import { baseStatusLabel, deadlineStatusLabel } from "@/lib/labels";
import { formatDatePtBr } from "@/lib/dates";

export default async function DashboardPage() {
  const data = await dashboardSummary();
  const cards = [
    { label: "Vencem hoje", value: data.dueToday },
    { label: "Próximos", value: data.dueSoon },
    { label: "Atrasadas", value: data.overdue },
    { label: "Bloqueadas", value: data.blocked },
    { label: "Aguardando validação", value: data.waitingValidation },
  ];

  return (
    <div>
      <h1 className="font-[family-name:var(--font-source-serif)] text-3xl">Dashboard</h1>
      <p className="mt-1 text-sm text-stone-600">O que olhar hoje. Prioridade de atenção não é o número de cadastro.</p>
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        {cards.map((card) => (
          <div key={card.label} className="border border-[#d6d3cd] bg-[#fbfaf6] px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-stone-500">{card.label}</p>
            <p className="mt-1 text-2xl tabular-nums">{card.value}</p>
          </div>
        ))}
      </div>
      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-stone-500">Fila de atenção</h2>
      <table className="mt-2 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-[#d6d3cd] text-left text-xs uppercase tracking-wide text-stone-500">
            <th className="py-2 pr-3">#</th>
            <th className="py-2 pr-3">Matriz</th>
            <th className="py-2 pr-3">Tarefa</th>
            <th className="py-2 pr-3">Operacional</th>
            <th className="py-2 pr-3">Prazo</th>
            <th className="py-2">Data</th>
          </tr>
        </thead>
        <tbody>
          {data.attention.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-8 text-stone-500">
                Nenhuma demanda em aberto. Crie uma matriz para começar.
              </td>
            </tr>
          ) : (
            data.attention.map((task) => (
              <tr key={task.id} className="border-b border-[#ece8e1]">
                <td className="py-2 pr-3 tabular-nums">#{task.sequenceNumber}</td>
                <td className="py-2 pr-3">{task.matrixName}</td>
                <td className="py-2 pr-3">
                  <Link className="underline-offset-2 hover:underline" href={`/matrices/${task.matrixId}/tasks/${task.id}`}>
                    {task.title}
                  </Link>
                </td>
                <td className="py-2 pr-3">{baseStatusLabel[task.baseStatus]}</td>
                <td className="py-2 pr-3">{deadlineStatusLabel[task.deadlineStatus]}</td>
                <td className="py-2 tabular-nums">{formatDatePtBr(task.currentDueDate)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

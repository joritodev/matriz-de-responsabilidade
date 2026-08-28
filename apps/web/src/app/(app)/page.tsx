import Link from "next/link";
import { dashboardSummary, listTodayReminders } from "@/lib/queries";
import { baseStatusLabel, deadlineStatusLabel } from "@/lib/labels";
import { formatDatePtBr } from "@/lib/dates";

export default async function DashboardPage() {
  const [data, reminders] = await Promise.all([dashboardSummary(), listTodayReminders()]);
  const cards = [
    { label: "Vencem hoje", value: data.dueToday, href: "/overview?view=due_today" },
    { label: "Próximos", value: data.dueSoon, href: "/overview?view=due_soon" },
    { label: "Atrasadas", value: data.overdue, href: "/overview?view=overdue" },
    { label: "Aguardando gatilho", value: data.waitingTrigger, href: "/overview" },
    { label: "Bloqueadas", value: data.blocked, href: "/overview?view=blocked" },
    { label: "Aguardando validação", value: data.waitingValidation, href: "/inbox?filter=DELIVERY_CLAIM" },
    { label: "Prorrogações pendentes", value: data.extensionRequests, href: "/inbox?filter=EXTENSION_REQUEST" },
  ];

  return (
    <div>
      <h1 className="font-[family-name:var(--font-source-serif)] text-3xl">Dashboard</h1>
      <p className="mt-1 text-sm text-stone-600">O que olhar hoje. Prioridade de atenção não é o número de cadastro.</p>

      {reminders.reminders.length > 0 ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border border-[#0f3d3e]/20 bg-[#0f3d3e]/5 px-4 py-3">
          <p className="text-sm text-stone-700">
            <strong>{reminders.reminders.length}</strong>{" "}
            {reminders.reminders.length === 1 ? "pessoa para lembrar" : "pessoas para lembrar"} hoje (passada do fim da
            manhã).
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/validate-dates"
              className="border border-[#0f3d3e] px-3 py-1.5 text-sm text-[#0f3d3e]"
            >
              Validar datas com responsáveis
            </Link>
            <Link
              href="/reminders"
              className="border border-[#0f3d3e] bg-[#0f3d3e] px-3 py-1.5 text-sm text-[#fbfaf6]"
            >
              Abrir lembretes de hoje
            </Link>
          </div>
        </div>
      ) : null}

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="border border-[#d6d3cd] bg-[#fbfaf6] px-4 py-3 transition hover:border-[#0f3d3e]/40"
          >
            <p className="text-xs uppercase tracking-wide text-stone-500">{card.label}</p>
            <p className="mt-1 text-2xl tabular-nums">{card.value}</p>
          </Link>
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

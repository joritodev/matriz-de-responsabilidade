import Link from "next/link";
import { CopyButton } from "@/components/copy-button";
import { deadlineStatusLabel } from "@/lib/labels";
import { listDateValidationGroups } from "@/lib/queries";

export default async function ValidateDatesPage() {
  const groups = await listDateValidationGroups();

  return (
    <div>
      <h1 className="font-[family-name:var(--font-source-serif)] text-3xl">Validar datas</h1>
      <p className="mt-1 max-w-2xl text-sm text-stone-600">
        Uma mensagem por responsável com as demandas que já estão chegando no prazo (vence em breve, hoje ou
        atrasada). Copie, envie pelo seu WhatsApp e ajuste as datas na matriz se precisar.
      </p>

      {groups.length === 0 ? (
        <p className="mt-6 max-w-xl border border-[#d6d3cd] bg-[#fbfaf6] p-4 text-sm text-stone-600">
          Ninguém com prazo pressionado no momento. Quando o worker recalcular, as demandas em breve aparecem aqui.
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {groups.map((group) => (
            <li key={group.responsibleId} className="border border-[#d6d3cd] bg-[#fbfaf6] p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium">{group.responsibleName}</p>
                <span className="text-xs text-stone-500">
                  {group.tasks.length} {group.tasks.length === 1 ? "demanda" : "demandas"}
                </span>
              </div>

              <ul className="mt-2 space-y-1 text-xs text-stone-600">
                {group.tasks.map((task) => (
                  <li key={task.taskId}>
                    <Link
                      href={`/matrices/${task.matrixId}/tasks/${task.taskId}`}
                      className="underline-offset-2 hover:underline"
                    >
                      #{task.sequenceNumber} {task.title}
                    </Link>{" "}
                    · {task.matrixName} · {deadlineStatusLabel[task.deadlineStatus]}
                  </li>
                ))}
              </ul>

              <pre className="mt-3 whitespace-pre-wrap border-l-2 border-[#d6d3cd] bg-white/60 p-3 text-sm text-stone-700">
                {group.message}
              </pre>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <CopyButton text={group.message} label="Copiar mensagem" />
                {group.blockedReason ? (
                  <span className="text-xs text-stone-500">{group.blockedReason}</span>
                ) : (
                  <a
                    href={group.chatLink ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border border-[#0f3d3e] bg-[#0f3d3e] px-3 py-1.5 text-sm text-[#fbfaf6]"
                  >
                    Abrir no WhatsApp
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

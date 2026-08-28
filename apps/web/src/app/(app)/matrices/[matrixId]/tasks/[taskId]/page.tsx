import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getTaskDetail, listResponsibles, loadTaskRows } from "@/lib/queries";
import { baseStatusLabel, deadlineStatusLabel, extensionStatusLabel } from "@/lib/labels";
import { formatDatePtBr } from "@/lib/dates";
import { TaskActions } from "@/components/task-actions";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ matrixId: string; taskId: string }>;
}) {
  const { matrixId, taskId } = await params;
  const [detail, user, people, siblings] = await Promise.all([
    getTaskDetail(taskId),
    getCurrentUser(),
    listResponsibles(),
    loadTaskRows(matrixId),
  ]);
  if (!detail || !user) notFound();
  const { task, history, audits, notes, rule } = detail;

  return (
    <div className="max-w-4xl">
      <p className="text-xs text-stone-500">
        <Link href="/matrices" className="underline">
          Matrizes
        </Link>{" "}
        /{" "}
        <Link href={`/matrices/${matrixId}`} className="underline">
          {task.matrixName}
        </Link>{" "}
        / #{task.sequenceNumber} {task.title}
      </p>
      <h1 className="mt-2 font-[family-name:var(--font-source-serif)] text-3xl">
        #{task.sequenceNumber} {task.title}
      </h1>
      <p className="mt-2 text-sm text-stone-600">{task.description || "Sem descrição."}</p>

      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <span className="border border-[#d6d3cd] bg-white px-2 py-1">{baseStatusLabel[task.baseStatus]}</span>
        <span className="border border-[#d6d3cd] bg-white px-2 py-1">{deadlineStatusLabel[task.deadlineStatus]}</span>
        <span className="border border-[#d6d3cd] bg-white px-2 py-1">
          Prorrogação: {extensionStatusLabel[task.extensionStatus]}
        </span>
        <span className="border border-[#d6d3cd] bg-white px-2 py-1">
          Prazo {formatDatePtBr(task.currentDueDate)}
        </span>
        {task.originalDueDate && task.originalDueDate !== task.currentDueDate ? (
          <span className="border border-[#d6d3cd] bg-white px-2 py-1">
            Original {formatDatePtBr(task.originalDueDate)}
          </span>
        ) : null}
      </div>

      <p className="mt-3 text-sm">
        Responsáveis:{" "}
        {task.responsibles.length ? task.responsibles.map((r) => r.name).join(", ") : "Sem responsável"}
      </p>
      <p className="text-sm">
        Pré-requisitos:{" "}
        {task.prerequisites.length
          ? task.prerequisites.map((p) => `#${p.sequenceNumber} ${p.title}`).join("; ")
          : "nenhum cadastrado (ordem não cria vínculo)"}
      </p>
      {rule ? (
        <p className="text-sm text-stone-600">
          Regra: {rule.deadlineType}
          {rule.explanation ? ` · ${JSON.stringify(rule.explanation)}` : ""}
        </p>
      ) : null}

      <TaskActions
        task={task}
        matrixId={matrixId}
        role={user.role}
        people={people}
        siblings={siblings.filter((s) => s.id !== task.id)}
      />

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Notas</h2>
        {notes.length === 0 ? <p className="mt-2 text-sm text-stone-500">Nenhuma nota.</p> : null}
        <ul className="mt-2 space-y-2 text-sm">
          {notes.map((note) => (
            <li key={note.id} className="border border-[#ece8e1] bg-white px-3 py-2">
              {note.body}
              <p className="text-xs text-stone-500">{note.createdAt.toISOString()}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Timeline operacional</h2>
        <ol className="mt-2 space-y-2 text-sm">
          {history.map((item) => (
            <li key={item.id} className="border-l-2 border-[#0f3d3e] pl-3">
              <span className="font-medium">{item.fromStatus ?? "—"}</span> →{" "}
              <span className="font-medium">{item.toStatus}</span>
              <span className="text-stone-500"> · {item.actorType}</span>
              {item.reason ? <span className="text-stone-500"> · {item.reason}</span> : null}
              <p className="text-xs text-stone-500">{item.createdAt.toISOString()}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Auditoria</h2>
        <ul className="mt-2 space-y-1 text-xs text-stone-600">
          {audits.map((item) => (
            <li key={item.id}>
              {item.createdAt.toISOString()} · {item.action} · {item.actorType} · origem {item.origin}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

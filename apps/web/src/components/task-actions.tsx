import {
  addDependencyAction,
  addNoteAction,
  assignResponsiblesAction,
  changeStatusAction,
} from "@/lib/actions";
import type { TaskRow } from "@/lib/queries";
import type { UserRole } from "@matriz/core";
import type { responsibles } from "@matriz/db";

type Person = typeof responsibles.$inferSelect;

export function TaskActions({
  task,
  matrixId,
  role,
  people,
  siblings,
}: {
  task: TaskRow;
  matrixId: string;
  role: UserRole;
  people: Person[];
  siblings: TaskRow[];
}) {
  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2">
      <form action={changeStatusAction} className="border border-[#d6d3cd] bg-white p-4 text-sm">
        <input type="hidden" name="taskId" value={task.id} />
        <input type="hidden" name="matrixId" value={matrixId} />
        <p className="font-medium">Status operacional</p>
        <select name="to" className="mt-2 w-full border border-[#d6d3cd] px-2 py-2" defaultValue={task.baseStatus}>
          <option value="PENDING">Pendente</option>
          <option value="IN_PROGRESS">Em andamento</option>
          <option value="WAITING_FOR_INPUT">Aguardando informação</option>
          <option value="BLOCKED">Bloqueada</option>
          <option value="WAITING_FOR_VALIDATION">Já entreguei (aguardar validação)</option>
          <option value="COMPLETED">Concluída (somente ADMIN)</option>
          <option value="CANCELLED">Cancelada (somente ADMIN)</option>
        </select>
        {role !== "ADMIN" ? (
          <p className="mt-2 text-xs text-stone-500">Somente administrador confirma entrega.</p>
        ) : null}
        <button type="submit" className="mt-3 bg-[#0f3d3e] px-3 py-2 text-[#fbfaf6]">
          Aplicar
        </button>
      </form>

      <form action={assignResponsiblesAction} className="border border-[#d6d3cd] bg-white p-4 text-sm">
        <input type="hidden" name="taskId" value={task.id} />
        <input type="hidden" name="matrixId" value={matrixId} />
        <p className="font-medium">Responsáveis (N, sem primário)</p>
        <select
          name="responsibleIds"
          multiple
          defaultValue={task.responsibles.map((r) => r.id)}
          className="mt-2 h-28 w-full border border-[#d6d3cd] px-2 py-2"
        >
          {people
            .filter((p) => p.active)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </select>
        <button type="submit" className="mt-3 border border-[#0f3d3e] px-3 py-2">
          Salvar responsáveis
        </button>
      </form>

      <form action={addDependencyAction} className="border border-[#d6d3cd] bg-white p-4 text-sm">
        <input type="hidden" name="taskId" value={task.id} />
        <input type="hidden" name="matrixId" value={matrixId} />
        <p className="font-medium">Adicionar pré-requisito</p>
        <select name="dependsOnTaskId" className="mt-2 w-full border border-[#d6d3cd] px-2 py-2">
          {siblings.map((s) => (
            <option key={s.id} value={s.id}>
              #{s.sequenceNumber} {s.title}
            </option>
          ))}
        </select>
        <button type="submit" className="mt-3 border border-[#0f3d3e] px-3 py-2">
          Vincular
        </button>
      </form>

      <form action={addNoteAction} className="border border-[#d6d3cd] bg-white p-4 text-sm">
        <input type="hidden" name="taskId" value={task.id} />
        <input type="hidden" name="matrixId" value={matrixId} />
        <p className="font-medium">Nota</p>
        <textarea name="body" rows={3} className="mt-2 w-full border border-[#d6d3cd] px-2 py-2" />
        <button type="submit" className="mt-3 border border-[#0f3d3e] px-3 py-2">
          Adicionar nota
        </button>
      </form>
    </div>
  );
}

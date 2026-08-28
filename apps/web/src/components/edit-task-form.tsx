"use client";

import { updateTaskAction } from "@/lib/actions";

export function EditTaskForm({
  taskId,
  matrixId,
  title,
  description,
  deadlineType,
  currentDueDate,
}: {
  taskId: string;
  matrixId: string;
  title: string;
  description: string | null;
  deadlineType: string | null;
  currentDueDate: string | null;
}) {
  return (
    <form action={updateTaskAction} className="mt-4 border border-[#d6d3cd] bg-white p-4 text-sm">
      <input type="hidden" name="taskId" value={taskId} />
      <input type="hidden" name="matrixId" value={matrixId} />
      <p className="font-medium">Editar demanda</p>
      <label className="mt-2 flex flex-col gap-1">
        Título
        <input name="title" required defaultValue={title} className="border border-[#d6d3cd] px-2 py-2" />
      </label>
      <label className="mt-2 flex flex-col gap-1">
        Descrição
        <textarea
          name="description"
          rows={2}
          defaultValue={description ?? ""}
          className="border border-[#d6d3cd] px-2 py-2"
        />
      </label>
      {deadlineType === "FIXED_DATE" ? (
        <label className="mt-2 flex flex-col gap-1">
          Prazo fixo
          <input
            type="date"
            name="fixedDate"
            defaultValue={currentDueDate ?? ""}
            className="border border-[#d6d3cd] px-2 py-2"
          />
        </label>
      ) : (
        <p className="mt-2 text-xs text-stone-500">
          Prazo calculado ({deadlineType ?? "—"}) — ajuste via prorrogação ou script administrativo.
        </p>
      )}
      <button type="submit" className="mt-3 border border-[#0f3d3e] px-3 py-2">
        Salvar alterações
      </button>
    </form>
  );
}

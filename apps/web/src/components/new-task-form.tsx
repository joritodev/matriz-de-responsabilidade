import { createTaskAction } from "@/lib/actions";
import type { TaskRow } from "@/lib/queries";
import type { responsibles } from "@matriz/db";

type Person = typeof responsibles.$inferSelect;

export function NewTaskForm({
  matrixId,
  tasks,
  people,
}: {
  matrixId: string;
  tasks: TaskRow[];
  people: Person[];
}) {
  return (
    <form action={createTaskAction} className="mt-6 grid gap-3 border border-[#d6d3cd] bg-[#fbfaf6] p-4 md:grid-cols-2">
      <input type="hidden" name="matrixId" value={matrixId} />
      <p className="md:col-span-2 text-sm font-medium">Nova demanda</p>
      <label className="flex flex-col gap-1 text-sm">
        Título
        <input name="title" required className="border border-[#d6d3cd] bg-white px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Tipo de prazo
        <select name="deadlineType" defaultValue="FIXED_DATE" className="border border-[#d6d3cd] bg-white px-3 py-2">
          <option value="FIXED_DATE">Data fixa</option>
          <option value="BUSINESS_DAYS_AFTER_CREATION">Dias úteis após cadastro</option>
          <option value="BUSINESS_DAYS_AFTER_DEPENDENCY">Dias úteis após dependência</option>
          <option value="RECURRING_BUSINESS_DAY">Recorrente (N-ésimo dia útil do mês)</option>
          <option value="MANUAL">Manual / indefinido</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm md:col-span-2">
        Descrição
        <textarea name="description" rows={2} className="border border-[#d6d3cd] bg-white px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Prazo (data fixa)
        <input name="fixedDate" type="date" className="border border-[#d6d3cd] bg-white px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Dias úteis / N do mês
        <input
          name="businessDays"
          type="number"
          min={1}
          placeholder="ex.: 15 ou 3 (recorrente)"
          className="border border-[#d6d3cd] bg-white px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Responsáveis
        <select name="responsibleIds" multiple className="h-24 border border-[#d6d3cd] bg-white px-3 py-2">
          {people
            .filter((p) => p.active)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm md:col-span-2">
        Pré-requisitos (opcional — não inferidos pela ordem)
        <select name="dependsOnIds" multiple className="h-24 border border-[#d6d3cd] bg-white px-3 py-2">
          {tasks.map((t) => (
            <option key={t.id} value={t.id}>
              #{t.sequenceNumber} {t.title}
            </option>
          ))}
        </select>
      </label>
      <div className="md:col-span-2">
        <button type="submit" className="bg-[#0f3d3e] px-4 py-2 text-sm text-[#fbfaf6]">
          Adicionar demanda
        </button>
      </div>
    </form>
  );
}

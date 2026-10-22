import { api, ApiError } from "@/lib/api";
import type { MatrixTasks } from "@/lib/api-types";
import { csvBody } from "@/lib/csv";
import { ddmm } from "@/lib/dates";

const situacao: Record<string, string> = { pending: "Em aberto", done: "Concluída", canceled: "Cancelada" };

/** CSV no formato da planilha original: Ordem, Responsável, Tarefa, Prazo, Situação, Possui pré-requisito?, Obs. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let open: MatrixTasks;
  let done: MatrixTasks;
  try {
    [open, done] = await Promise.all([
      api<MatrixTasks>(`/matrices/${encodeURIComponent(slug)}/tasks?filter=open`),
      api<MatrixTasks>(`/matrices/${encodeURIComponent(slug)}/tasks?filter=done`),
    ]);
  } catch (err) {
    const status = err instanceof ApiError ? err.status : 500;
    return new Response(err instanceof Error ? err.message : "Não foi possível exportar.", { status });
  }
  const rows = [["Ordem", "Responsável", "Tarefa", "Prazo", "Situação", "Possui pré-requisito?", "Obs"]];
  for (const t of [...open.tasks, ...done.tasks]) {
    const pre = t.prerequisite ? ("taskId" in t.prerequisite ? t.prerequisite.title : t.prerequisite.note) : "";
    rows.push([
      String(t.position),
      t.assignee.fullName,
      t.title,
      ddmm(t.dueDate),
      situacao[t.taskStatus] ?? "",
      pre ? `Sim: ${pre}` : "Não",
      t.notes ?? "",
    ]);
  }
  return new Response(csvBody(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${open.matrix.slug}.csv"`,
    },
  });
}

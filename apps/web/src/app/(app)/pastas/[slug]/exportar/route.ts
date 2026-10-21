import { api, ApiError } from "@/lib/api";
import type { MatrixTasks } from "@/lib/api-types";
import { ddmm } from "@/lib/dates";

const cell = (v: string) => (/[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** CSV no formato da planilha original: Ordem, Responsável, Tarefa, Prazo, Possui pré-requisito?, Obs. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let data: MatrixTasks;
  try {
    data = await api<MatrixTasks>(`/matrices/${encodeURIComponent(slug)}/tasks?filter=open`);
  } catch (err) {
    const status = err instanceof ApiError ? err.status : 500;
    return new Response(err instanceof Error ? err.message : "Não foi possível exportar.", { status });
  }
  const rows = [["Ordem", "Responsável", "Tarefa", "Prazo", "Possui pré-requisito?", "Obs"]];
  for (const t of data.tasks) {
    const pre = t.prerequisite ? ("taskId" in t.prerequisite ? t.prerequisite.title : t.prerequisite.note) : "";
    rows.push([String(t.position), t.assignee.fullName, t.title, ddmm(t.dueDate), pre ? `Sim: ${pre}` : "Não", t.notes ?? ""]);
  }
  const body = "\uFEFF" + rows.map((r) => r.map(cell).join(";")).join("\r\n");
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${data.matrix.slug}.csv"`,
    },
  });
}

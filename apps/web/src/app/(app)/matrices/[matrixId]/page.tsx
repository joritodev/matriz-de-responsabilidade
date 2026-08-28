import Link from "next/link";
import { notFound } from "next/navigation";
import { getMatrix, listResponsibles, loadTaskRows } from "@/lib/queries";
import { matrixTypeLabel } from "@/lib/labels";
import { TaskTable } from "@/components/task-table";
import { NewTaskForm } from "@/components/new-task-form";

export default async function MatrixPage({ params }: { params: Promise<{ matrixId: string }> }) {
  const { matrixId } = await params;
  const matrix = await getMatrix(matrixId);
  if (!matrix) notFound();
  const [rows, people] = await Promise.all([loadTaskRows(matrixId), listResponsibles()]);

  return (
    <div>
      <p className="text-xs text-stone-500">
        <Link href="/matrices" className="underline">
          Matrizes
        </Link>{" "}
        / {matrix.name}
      </p>
      <div className="mt-2 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-source-serif)] text-3xl">{matrix.name}</h1>
          <p className="text-sm text-stone-600">
            {matrixTypeLabel[matrix.type as keyof typeof matrixTypeLabel]} · Ordem (#) é cadastro, não prioridade nem
            dependência.
          </p>
        </div>
      </div>
      <NewTaskForm matrixId={matrixId} tasks={rows} people={people} />
      <TaskTable rows={rows} />
    </div>
  );
}

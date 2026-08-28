import Link from "next/link";
import { loadTaskRows } from "@/lib/queries";
import { TaskTable } from "@/components/task-table";

export default async function OverviewPage() {
  const rows = await loadTaskRows();
  return (
    <div>
      <h1 className="font-[family-name:var(--font-source-serif)] text-3xl">Visão Geral</h1>
      <p className="mt-1 text-sm text-stone-600">
        Consulta agregada de todas as matrizes. Não duplica demandas. Não confundir com uma matriz do tipo Geral.{" "}
        <Link href="/matrices" className="underline">
          Ir às matrizes
        </Link>
      </p>
      <TaskTable rows={rows} showMatrix />
    </div>
  );
}

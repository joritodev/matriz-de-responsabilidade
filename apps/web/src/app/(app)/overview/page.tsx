import Link from "next/link";
import { loadTaskRows } from "@/lib/queries";
import { TaskTable } from "@/components/task-table";

const VIEWS = [
  { key: "all", label: "Todas" },
  { key: "overdue", label: "Atrasadas" },
  { key: "due_today", label: "Vencem hoje" },
  { key: "due_soon", label: "Vencem em breve" },
  { key: "blocked", label: "Bloqueadas" },
  { key: "waiting_validation", label: "Aguardando validação" },
] as const;

type ViewKey = (typeof VIEWS)[number]["key"];

function filterRows(rows: Awaited<ReturnType<typeof loadTaskRows>>, view: ViewKey) {
  switch (view) {
    case "overdue":
      return rows.filter((t) => t.deadlineStatus === "OVERDUE");
    case "due_today":
      return rows.filter((t) => t.deadlineStatus === "DUE_TODAY");
    case "due_soon":
      return rows.filter((t) => t.deadlineStatus === "DUE_SOON");
    case "blocked":
      return rows.filter((t) => t.baseStatus === "BLOCKED");
    case "waiting_validation":
      return rows.filter((t) => t.baseStatus === "WAITING_FOR_VALIDATION");
    default:
      return rows;
  }
}

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view: rawView } = await searchParams;
  const view = (VIEWS.some((v) => v.key === rawView) ? rawView : "all") as ViewKey;
  const allRows = await loadTaskRows();
  const rows = filterRows(allRows, view);

  return (
    <div>
      <h1 className="font-[family-name:var(--font-source-serif)] text-3xl">Visão Geral</h1>
      <p className="mt-1 text-sm text-stone-600">
        Consulta agregada de todas as matrizes. Não duplica demandas. Não confundir com uma matriz do tipo Geral.{" "}
        <Link href="/matrices" className="underline">
          Ir às matrizes
        </Link>
      </p>

      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        {VIEWS.map((v) => (
          <Link
            key={v.key}
            href={v.key === "all" ? "/overview" : `/overview?view=${v.key}`}
            className={
              view === v.key
                ? "border border-[#0f3d3e] bg-[#0f3d3e] px-3 py-1 text-[#fbfaf6]"
                : "border border-[#d6d3cd] bg-white px-3 py-1 text-stone-700 hover:bg-stone-50"
            }
          >
            {v.label}
          </Link>
        ))}
      </div>

      <TaskTable rows={rows} showMatrix />
    </div>
  );
}

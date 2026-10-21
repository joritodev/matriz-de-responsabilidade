import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonClass } from "@/components/Button";
import { FolderTabs } from "@/components/FolderTabs";
import { QuickAddForm } from "@/components/QuickAddForm";
import { TaskList } from "@/components/TaskList";
import { api, ApiError } from "@/lib/api";
import type { Assignee, FolderSummary, MatrixTasks, TaskFilter } from "@/lib/api-types";
import { folderVars } from "@/lib/folder-colors";

const FILTERS: { key: TaskFilter; label: string }[] = [
  { key: "open", label: "Abertas" },
  { key: "done", label: "Concluídas" },
  { key: "extended", label: "Prorrogadas" },
];

const NUMBER_WORDS = ["Nenhuma", "Uma", "Duas", "Três", "Quatro", "Cinco", "Seis", "Sete", "Oito", "Nove", "Dez"];

function weekText(n: number) {
  if (n === 0) return "Nada vence nesta semana.";
  return `${NUMBER_WORDS[n] ?? n} ${n === 1 ? "vence" : "vencem"} nesta semana.`;
}

async function load(slug: string, filter: TaskFilter) {
  try {
    return await api<MatrixTasks>(`/matrices/${encodeURIComponent(slug)}/tasks?filter=${filter}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const folders = await api<FolderSummary[]>("/matrices");
  return { title: folders.find((f) => f.slug === slug)?.name ?? "Pasta" };
}

export default async function FolderPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ filtro?: string; demanda?: string }>;
}) {
  const { slug } = await params;
  const { filtro, demanda } = await searchParams;
  const filter: TaskFilter = FILTERS.some((f) => f.key === filtro) ? (filtro as TaskFilter) : "open";
  const [data, folders, assignees] = await Promise.all([load(slug, filter), api<FolderSummary[]>("/matrices"), api<Assignee[]>("/assignees")]);
  const { matrix, counts } = data;
  const isEmpty = counts.total - counts.canceled === 0;

  return (
    <section aria-labelledby="pasta-titulo" className="flex flex-col" style={folderVars(matrix.color)}>
      <FolderTabs folders={folders.filter((f) => !f.isArchived)} activeSlug={matrix.slug} />
      <div className="-mx-4 rounded-t-[22px] bg-f-bg p-[10px] max-md:pb-0 md:mx-0 md:rounded-[0_28px_28px_28px] md:p-[10px]">
        <div className="rounded-t-[20px] bg-surface px-4 pt-5 pb-6 md:rounded-[22px] md:px-6 md:pt-6">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 id="pasta-titulo" className="text-[28px] leading-8 font-bold tracking-[-0.03em] md:text-[34px] md:leading-10">
                {matrix.name}
              </h1>
              <p className="mt-1 text-[15px] text-ink-2">
                <span className="hidden md:inline">
                  {counts.open} {counts.open === 1 ? "demanda aberta" : "demandas abertas"} de {counts.total - counts.canceled}.
                </span>
                <span className="md:hidden">
                  {counts.open} {counts.open === 1 ? "aberta" : "abertas"} de {counts.total - counts.canceled}.
                </span>{" "}
                {weekText(data.dueThisWeek)}
              </p>
            </div>
            <div className="hidden gap-2 md:flex">
              <button
                type="button"
                disabled
                title="A importação de documento do Google Docs ainda não está disponível."
                className={buttonClass("secondary", "default")}
              >
                Importar do Docs
              </button>
              <a href={`/pastas/${matrix.slug}/exportar`} className={buttonClass("secondary", "default")} download>
                Exportar
              </a>
            </div>
          </header>

          <div className="hidden md:block">
            <QuickAddForm matrixId={matrix.id} assignees={assignees} options={data.prerequisiteOptions} today={data.today} highlight={isEmpty} />
          </div>

          {!isEmpty && (
            <nav aria-label="Filtro das demandas" className="mt-5 mb-3 flex gap-2 overflow-x-auto max-md:hidden">
              {FILTERS.map((f) => {
                const on = f.key === filter;
                return (
                  <Link
                    key={f.key}
                    href={f.key === "open" ? `/pastas/${matrix.slug}` : `/pastas/${matrix.slug}?filtro=${f.key}`}
                    aria-current={on ? "page" : undefined}
                    className={`pressable flex h-[34px] shrink-0 items-center rounded-full px-4 text-[13px] font-semibold ${on ? "bg-ink text-white" : "bg-surface-muted text-ink hover:bg-nav-hover"}`}
                  >
                    {f.label} {counts[f.key]}
                  </Link>
                );
              })}
            </nav>
          )}

          <div className="mt-4 md:mt-0">
            {isEmpty ? (
              <div className="mt-6 rounded-inner border-2 border-dashed border-dash px-5 py-10 text-center">
                <p className="text-[17px] font-semibold">Esta pasta ainda está vazia.</p>
                <p className="mt-1 text-[15px] text-ink-2">
                  <span className="hidden md:inline">Lance a primeira demanda no formulário acima.</span>
                  <span className="md:hidden">Toque no + para lançar a primeira demanda.</span>
                </p>
              </div>
            ) : (
              <TaskList
                key={filter}
                tasks={data.tasks}
                filter={filter}
                matrixId={matrix.id}
                today={data.today}
                assignees={assignees}
                options={data.prerequisiteOptions}
                initialSelected={demanda && data.tasks.some((t) => t.id === demanda) ? demanda : null}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

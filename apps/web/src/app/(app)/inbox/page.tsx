import Link from "next/link";
import { CopyButton } from "@/components/copy-button";
import { DeliveryClaimActions } from "@/components/delivery-claim-actions";
import { ReminderActions } from "@/components/reminder-actions";
import { resolveInboxItemAction } from "@/lib/actions";
import { listInboxItems } from "@/lib/queries";

const FILTERS = [
  { key: "all", label: "Todas" },
  { key: "EXTENSION_REQUEST", label: "Prorrogações" },
  { key: "DELIVERY_CLAIM", label: "Validar entrega" },
  { key: "deadline", label: "Prazos" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

function matchesFilter(kind: string, filter: FilterKey): boolean {
  if (filter === "all") return true;
  if (filter === "deadline") return kind === "CRITICAL_OVERDUE" || kind === "OTHER";
  return kind === filter;
}

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter: rawFilter } = await searchParams;
  const filter = (FILTERS.some((f) => f.key === rawFilter) ? rawFilter : "all") as FilterKey;
  const allItems = await listInboxItems();
  const items = allItems.filter((item) => matchesFilter(item.kind, filter));

  return (
    <div>
      <h1 className="font-[family-name:var(--font-source-serif)] text-3xl">Caixa de Entrada</h1>
      <p className="mt-1 text-sm text-stone-600">
        Pendências que precisam da sua decisão: prazos, prorrogações e validações. Lembretes ao responsável são
        assistidos (você envia pelo seu WhatsApp).
      </p>

      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "all" ? "/inbox" : `/inbox?filter=${f.key}`}
            className={
              filter === f.key
                ? "border border-[#0f3d3e] bg-[#0f3d3e] px-3 py-1 text-[#fbfaf6]"
                : "border border-[#d6d3cd] bg-white px-3 py-1 text-stone-700 hover:bg-stone-50"
            }
          >
            {f.label}
            {f.key === "all" && allItems.length > 0 ? ` (${allItems.length})` : ""}
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="mt-6 max-w-xl border border-[#d6d3cd] bg-[#fbfaf6] p-4 text-sm text-stone-600">
          {allItems.length === 0
            ? "Nenhuma pendência aberta. O worker recalcula status a cada 15 minutos; você também pode rodar npm run db:deadline-tick manualmente."
            : "Nenhuma pendência neste filtro."}
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {items.map((item) => (
            <li key={item.id} className="border border-[#d6d3cd] bg-[#fbfaf6] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="mt-1 text-sm text-stone-600">{item.body}</p>
                  <p className="mt-2 text-xs text-stone-500">
                    {item.kind} · {item.createdAt.toISOString()}
                  </p>
                  {item.taskId && item.matrixId ? (
                    <Link
                      href={`/matrices/${item.matrixId}/tasks/${item.taskId}`}
                      className="mt-2 inline-block text-sm underline-offset-2 hover:underline"
                    >
                      Abrir tarefa
                    </Link>
                  ) : null}
                </div>
                {item.kind === "DELIVERY_CLAIM" && item.taskId && item.matrixId ? (
                  <DeliveryClaimActions taskId={item.taskId} matrixId={item.matrixId} />
                ) : item.kind !== "EXTENSION_REQUEST" ? (
                  <form action={resolveInboxItemAction}>
                    <input type="hidden" name="itemId" value={item.id} />
                    <button type="submit" className="border border-[#0f3d3e] px-3 py-1.5 text-sm text-[#0f3d3e]">
                      Resolver
                    </button>
                  </form>
                ) : null}
              </div>
              {item.kind === "EXTENSION_REQUEST" && item.chefsCopyText ? (
                <div className="mt-3 border-t border-[#e5e2db] pt-3">
                  <pre className="whitespace-pre-wrap text-xs text-stone-700">{item.chefsCopyText}</pre>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <CopyButton text={item.chefsCopyText} label="Copiar para o grupo dos chefes" />
                    {item.taskId && item.matrixId ? (
                      <Link
                        href={`/matrices/${item.matrixId}/tasks/${item.taskId}`}
                        className="border border-[#0f3d3e] px-3 py-1.5 text-xs text-[#0f3d3e]"
                      >
                        Aprovar ou rejeitar na tarefa
                      </Link>
                    ) : null}
                  </div>
                </div>
              ) : null}
              {item.taskId && item.kind !== "EXTENSION_REQUEST" && item.kind !== "DELIVERY_CLAIM" ? (
                <ReminderActions targets={item.targets} />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

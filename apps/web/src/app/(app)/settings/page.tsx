import { listAudit } from "@/lib/queries";

export default async function SettingsPage() {
  const audits = await listAudit(25);
  return (
    <div>
      <h1 className="font-[family-name:var(--font-source-serif)] text-3xl">Configurações</h1>
      <dl className="mt-4 grid max-w-xl grid-cols-2 gap-2 text-sm">
        <dt className="text-stone-500">Timezone</dt>
        <dd>America/Sao_Paulo</dd>
        <dt className="text-stone-500">Locale</dt>
        <dd>pt-BR</dd>
        <dt className="text-stone-500">WhatsApp</dt>
        <dd>desligado</dd>
        <dt className="text-stone-500">IA</dt>
        <dd>desligada</dd>
        <dt className="text-stone-500">Feriados</dt>
        <dd>calendário vazio (seed nacional na FASE 2)</dd>
      </dl>
      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-stone-500">Últimas auditorias</h2>
      <ul className="mt-2 space-y-1 text-xs text-stone-600">
        {audits.length === 0 ? <li>Nenhuma mutação ainda.</li> : null}
        {audits.map((item) => (
          <li key={item.id}>
            {item.createdAt.toISOString()} · {item.entityType} · {item.action} · {item.origin}
          </li>
        ))}
      </ul>
    </div>
  );
}

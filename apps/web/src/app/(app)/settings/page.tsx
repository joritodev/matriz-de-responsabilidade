import Link from "next/link";
import { listAudit } from "@/lib/queries";
import { getWhatsAppSetupStatus } from "@/lib/whatsapp-setup";

export default async function SettingsPage() {
  const audits = await listAudit(25);
  const { readiness } = getWhatsAppSetupStatus();

  return (
    <div>
      <h1 className="font-[family-name:var(--font-source-serif)] text-3xl">Configurações</h1>

      <section className="mt-6 max-w-2xl border border-[#d6d3cd] bg-[#fbfaf6] p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">WhatsApp automático</h2>
        <p className="mt-2 text-sm text-stone-600">
          <strong>Adiado.</strong> O fluxo diário usa envio assistido (wa.me) em{" "}
          <Link href="/reminders" className="underline-offset-2 hover:underline">
            Lembretes de hoje
          </Link>
          . A Cloud API da Meta fica preparada para quando você quiser ligar.
        </p>
        <p className="mt-2 text-sm text-stone-600">
          Envio automático:{" "}
          <strong>{readiness.enabled ? "ligado" : "desligado"}</strong>
          {!readiness.enabled ? " — nenhuma tarifa da Meta enquanto estiver assim." : ""}
        </p>
        <p className="mt-1 text-sm text-stone-600">
          Credenciais prontas para ligar:{" "}
          <strong>{readiness.readyToEnable ? "sim" : "ainda não"}</strong>
        </p>
        {readiness.missing.length > 0 ? (
          <ul className="mt-2 list-inside list-disc text-xs text-stone-500">
            {readiness.missing.map((key) => (
              <li key={key}>Falta preencher {key} no .env</li>
            ))}
          </ul>
        ) : null}
        {readiness.webhookUrl ? (
          <p className="mt-2 text-xs text-stone-500">
            URL do webhook (cadastre na Meta):{" "}
            <code className="break-all">{readiness.webhookUrl}</code>
          </p>
        ) : null}
        <p className="mt-3 text-xs text-stone-500">
          Guia completo:{" "}
          <code className="text-[11px]">docs/runbooks/waba-mei-passo-a-passo.md</code>
        </p>
        <ul className="mt-2 space-y-1 text-xs text-stone-500">
          {readiness.notes.map((note) => (
            <li key={note}>· {note}</li>
          ))}
        </ul>
      </section>

      <dl className="mt-6 grid max-w-xl grid-cols-2 gap-2 text-sm">
        <dt className="text-stone-500">Timezone</dt>
        <dd>America/Sao_Paulo</dd>
        <dt className="text-stone-500">Locale</dt>
        <dd>pt-BR</dd>
        <dt className="text-stone-500">Envio assistido (wa.me)</dt>
        <dd>
          <Link href="/reminders" className="underline-offset-2 hover:underline">
            Lembretes de hoje
          </Link>
        </dd>
        <dt className="text-stone-500">IA</dt>
        <dd>desligada</dd>
        <dt className="text-stone-500">Motor de prazos</dt>
        <dd>Worker deadline-tick (cache + alertas in-app)</dd>
        <dt className="text-stone-500">Janela “vence em breve”</dt>
        <dd>3 dias úteis</dd>
        <dt className="text-stone-500">Feriados</dt>
        <dd>BR nacional 2026–2028 (seed federal mínimo)</dd>
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

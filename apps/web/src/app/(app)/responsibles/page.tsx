import Link from "next/link";
import { listResponsibles } from "@/lib/queries";

export default async function ResponsiblesPage() {
  const rows = await listResponsibles();
  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-source-serif)] text-3xl">Responsáveis</h1>
          <p className="mt-1 text-sm text-stone-600">Cadastro reutilizável. Sem envio de WhatsApp nesta fase.</p>
        </div>
        <Link href="/responsibles/new" className="bg-[#0f3d3e] px-3 py-2 text-sm text-[#fbfaf6]">
          Novo responsável
        </Link>
      </div>
      <table className="mt-6 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-[#d6d3cd] text-left text-xs uppercase tracking-wide text-stone-500">
            <th className="py-2 pr-3">Nome</th>
            <th className="py-2 pr-3">Papel</th>
            <th className="py-2 pr-3">WhatsApp</th>
            <th className="py-2">Ativo</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={4} className="py-10 text-stone-500">
                Ninguém cadastrado. Cadastre Matheus com o número para reutilizar nas tarefas.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id} className="border-b border-[#ece8e1]">
                <td className="py-2 pr-3">
                  <Link href={`/responsibles/${row.id}`} className="underline-offset-2 hover:underline">
                    {row.name}
                  </Link>
                </td>
                <td className="py-2 pr-3">{row.role ?? "—"}</td>
                <td className="py-2 pr-3">{row.whatsappNumber ?? "—"}</td>
                <td className="py-2">{row.active ? "sim" : "não"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

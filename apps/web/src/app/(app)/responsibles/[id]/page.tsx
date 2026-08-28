import { notFound } from "next/navigation";
import { getResponsible } from "@/lib/queries";
import { updateResponsibleAction } from "@/lib/actions";

export default async function ResponsibleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await getResponsible(id);
  if (!row) notFound();

  return (
    <div className="max-w-lg">
      <h1 className="font-[family-name:var(--font-source-serif)] text-3xl">{row.name}</h1>
      <form action={updateResponsibleAction} className="mt-6 flex flex-col gap-4">
        <input type="hidden" name="id" value={row.id} />
        <label className="flex flex-col gap-1 text-sm">
          Nome
          <input name="name" required defaultValue={row.name} className="border border-[#d6d3cd] bg-white px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Papel
          <input name="role" defaultValue={row.role ?? ""} className="border border-[#d6d3cd] bg-white px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          WhatsApp
          <input
            name="whatsapp"
            defaultValue={row.whatsappNumber ?? ""}
            className="border border-[#d6d3cd] bg-white px-3 py-2"
          />
        </label>
        <p className="text-xs text-stone-500">E.164: {row.whatsappNumberE164 ?? "—"} (não vai para log cru)</p>
        <label className="flex flex-col gap-1 text-sm">
          E-mail
          <input name="email" type="email" defaultValue={row.email ?? ""} className="border border-[#d6d3cd] bg-white px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Notas
          <textarea name="notes" rows={3} defaultValue={row.notes ?? ""} className="border border-[#d6d3cd] bg-white px-3 py-2" />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="hidden" name="active" value="false" />
          <input type="checkbox" name="active" value="true" defaultChecked={row.active} />
          Ativo
        </label>
        <button type="submit" className="bg-[#0f3d3e] px-4 py-2 text-sm text-[#fbfaf6]">
          Salvar
        </button>
      </form>
    </div>
  );
}

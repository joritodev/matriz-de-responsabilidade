import { createResponsibleAction } from "@/lib/actions";

export default function NewResponsiblePage() {
  return (
    <div className="max-w-lg">
      <h1 className="font-[family-name:var(--font-source-serif)] text-3xl">Novo responsável</h1>
      <form action={createResponsibleAction} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Nome
          <input name="name" required className="border border-[#d6d3cd] bg-white px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Papel (texto livre)
          <input name="role" className="border border-[#d6d3cd] bg-white px-3 py-2" placeholder="Professor, Marketing…" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          WhatsApp
          <input name="whatsapp" className="border border-[#d6d3cd] bg-white px-3 py-2" placeholder="11 99988-7766" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          E-mail (opcional)
          <input name="email" type="email" className="border border-[#d6d3cd] bg-white px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Notas internas
          <textarea name="notes" rows={3} className="border border-[#d6d3cd] bg-white px-3 py-2" />
        </label>
        <button type="submit" className="bg-[#0f3d3e] px-4 py-2 text-sm text-[#fbfaf6]">
          Cadastrar
        </button>
      </form>
    </div>
  );
}

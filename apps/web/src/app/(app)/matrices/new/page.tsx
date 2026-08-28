import { createMatrixAction } from "@/lib/actions";

export default function NewMatrixPage() {
  return (
    <div className="max-w-lg">
      <h1 className="font-[family-name:var(--font-source-serif)] text-3xl">Nova matriz</h1>
      <form action={createMatrixAction} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Nome
          <input name="name" required className="border border-[#d6d3cd] bg-white px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Descrição
          <textarea name="description" rows={3} className="border border-[#d6d3cd] bg-white px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Tipo
          <select name="type" className="border border-[#d6d3cd] bg-white px-3 py-2" defaultValue="GENERAL">
            <option value="GENERAL">Geral</option>
            <option value="PROJECT">Projeto</option>
            <option value="COURSE">Curso</option>
            <option value="PRODUCT">Produto</option>
            <option value="EVENT">Evento</option>
            <option value="OTHER">Outro</option>
          </select>
        </label>
        <button type="submit" className="bg-[#0f3d3e] px-4 py-2 text-sm text-[#fbfaf6]">
          Criar matriz
        </button>
      </form>
    </div>
  );
}

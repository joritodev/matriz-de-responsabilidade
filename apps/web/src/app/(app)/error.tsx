"use client";

export default function AppError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="max-w-lg border border-red-200 bg-white p-4">
      <h1 className="font-[family-name:var(--font-source-serif)] text-2xl">Não foi possível concluir</h1>
      <p className="mt-2 text-sm text-stone-700">{error.message}</p>
      <button type="button" onClick={reset} className="mt-4 border border-[#0f3d3e] px-3 py-2 text-sm">
        Tentar de novo
      </button>
    </div>
  );
}

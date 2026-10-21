export default function FolderLoading() {
  return (
    <div aria-busy="true" aria-label="Carregando a pasta" className="flex flex-col">
      <div className="flex gap-[6px] md:px-1">
        {[96, 140, 120, 90].map((w, i) => (
          <span key={i} className={`skeleton rounded-[18px_18px_0_0] ${i === 1 ? "h-[50px]" : "mt-3 h-[38px]"}`} style={{ width: w }} />
        ))}
      </div>
      <div className="rounded-[0_28px_28px_28px] bg-surface-muted p-[10px]">
        <div className="flex flex-col gap-4 rounded-[22px] bg-surface p-6">
          <span className="skeleton h-9 w-56" />
          <span className="skeleton h-5 w-80 max-w-full" />
          <span className="skeleton hidden h-[68px] md:block" />
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="skeleton h-[52px]" />
          ))}
        </div>
      </div>
    </div>
  );
}

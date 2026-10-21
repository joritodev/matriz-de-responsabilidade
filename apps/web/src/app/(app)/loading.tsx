export default function OverviewLoading() {
  return (
    <div aria-busy="true" aria-label="Carregando a Matriz geral" className="flex flex-col gap-7">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div className="flex flex-col gap-3">
          <span className="skeleton h-11 w-48" />
          <span className="skeleton h-5 w-[min(460px,80vw)]" />
        </div>
        <span className="skeleton hidden h-[78px] w-[420px] rounded-[22px] md:block" />
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-[repeat(auto-fit,minmax(250px,1fr))]">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`skeleton mt-[18px] h-[112px] rounded-[0_22px_22px_22px] ${i > 1 ? "hidden md:block" : ""}`} />
        ))}
      </div>
      <div className="flex flex-wrap gap-5">
        <div className="flex min-w-0 flex-[999_1_640px] flex-col gap-4 rounded-card bg-surface p-6">
          <span className="skeleton h-7 w-56" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="grid grid-cols-[230px_1fr] items-center gap-3 max-md:grid-cols-[46px_1fr]">
              <span className="skeleton h-9 max-md:h-[46px]" />
              <span className="skeleton h-[34px] rounded-full" style={{ width: `${40 + ((i * 13) % 45)}%` }} />
            </div>
          ))}
        </div>
        <div className="hidden flex-[1_0_340px] flex-col gap-4 rounded-card bg-surface p-6 md:flex">
          <span className="skeleton h-7 w-48" />
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="skeleton h-14" />
          ))}
        </div>
      </div>
    </div>
  );
}

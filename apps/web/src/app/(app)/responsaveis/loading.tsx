export default function PeopleLoading() {
  return (
    <div aria-busy="true" aria-label="Carregando responsáveis" className="flex flex-col gap-7">
      <div className="flex flex-col gap-3">
        <span className="skeleton h-11 w-64" />
        <span className="skeleton h-5 w-[min(420px,80vw)]" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(270px,1fr))]">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="skeleton h-[164px] rounded-card" />
        ))}
      </div>
    </div>
  );
}

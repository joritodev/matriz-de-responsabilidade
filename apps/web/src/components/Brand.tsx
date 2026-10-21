import Link from "next/link";

export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden="true" className={`relative mt-[6px] inline-block h-6 w-[30px] rounded-[0_7px_7px_7px] bg-ink ${className}`}>
      <span className="absolute top-[-6px] left-0 h-[7px] w-[14px] rounded-[5px_5px_0_0] bg-ink" />
    </span>
  );
}

export function Brand({ href }: { href?: string }) {
  const inner = (
    <>
      <BrandMark />
      <span className="text-[21px] font-extrabold tracking-[-0.03em]">Prazo</span>
    </>
  );
  if (!href) return <span className="flex items-center gap-[10px]">{inner}</span>;
  return (
    <Link href={href} className="mr-3 flex items-center gap-[10px] rounded-[10px]" aria-label="Prazo, Matriz geral">
      {inner}
    </Link>
  );
}

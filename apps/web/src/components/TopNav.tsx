"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/(auth)/login/actions";
import { Brand } from "./Brand";
import { useNewTaskPanel } from "./NewTaskPanel";
import { SearchBox } from "./SearchBox";

export const NAV = [
  { href: "/", label: "Matriz geral", short: "Geral" },
  { href: "/pastas", label: "Pastas", short: "Pastas" },
  { href: "/responsaveis", label: "Responsáveis", short: "Pessoas" },
  { href: "/cobrancas", label: "Cobranças", short: "Cobranças" },
];

export const isActive = (pathname: string, href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

export function UserMenu({ initials, email }: { initials: string; email: string }) {
  return (
    <details className="relative">
      <summary
        className="flex h-10 w-10 list-none items-center justify-center rounded-full bg-avatar text-[13px] font-bold [&::-webkit-details-marker]:hidden"
        aria-label={`Conta de ${email}`}
      >
        {initials}
      </summary>
      <div className="absolute top-12 right-0 z-50 w-64 rounded-[20px] border-[1.5px] border-line bg-surface p-2">
        <p className="truncate px-3 py-2 text-[13px] text-ink-3">{email}</p>
        <form action={logoutAction}>
          <button type="submit" className="w-full rounded-[14px] px-3 py-2 text-left text-[14px] font-semibold hover:bg-surface-muted">
            Sair
          </button>
        </form>
      </div>
    </details>
  );
}

export function TopNav({ initials, email }: { initials: string; email: string }) {
  const pathname = usePathname();
  const { open, setOpen } = useNewTaskPanel();
  return (
    <header className="relative hidden flex-wrap items-center gap-x-5 gap-y-3 md:flex">
      <Brand href="/" />
      <nav aria-label="Principal" className="flex flex-wrap gap-1 rounded-full bg-surface p-1">
        {NAV.map((item) => {
          const on = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={on ? "page" : undefined}
              className={`inline-flex h-10 items-center rounded-full px-[18px] text-[14px] font-semibold whitespace-nowrap transition-colors duration-150 ${
                on ? "bg-ink text-white" : "text-ink-2 hover:bg-nav-hover"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="ml-auto flex items-center gap-[10px]">
        <SearchBox className="w-[260px] max-w-full" />
        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="dialog"
          onClick={() => setOpen(!open)}
          className="pressable inline-flex h-10 items-center rounded-full bg-ink px-[18px] text-[14px] font-semibold text-white hover:bg-[#2A2D35]"
        >
          Nova demanda
        </button>
        <UserMenu initials={initials} email={email} />
      </div>
    </header>
  );
}

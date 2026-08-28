import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { logoutAction } from "@/lib/actions";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/inbox", label: "Caixa de Entrada" },
  { href: "/matrices", label: "Matrizes" },
  { href: "/overview", label: "Visão Geral" },
  { href: "/responsibles", label: "Responsáveis" },
  { href: "/settings", label: "Configurações" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col bg-[#1c1917] text-[#f4f1ea]">
        <div className="border-b border-white/10 px-4 py-5">
          <p className="font-[family-name:var(--font-source-serif)] text-lg leading-tight">Matriz</p>
          <p className="text-[11px] tracking-wide text-stone-400">Responsabilidade</p>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-2 text-sm">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-sm px-3 py-2 text-stone-200 hover:bg-white/10"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <form action={logoutAction} className="border-t border-white/10 p-4 text-xs text-stone-400">
          <p className="mb-2 truncate text-stone-200">{user.name}</p>
          <p className="mb-3">{user.role}</p>
          <button type="submit" className="text-stone-400 underline-offset-2 hover:underline">
            Sair
          </button>
        </form>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-[#d6d3cd] bg-[#fbfaf6] px-6 py-3">
          <p className="text-sm text-stone-600">Datas em America/Sao_Paulo · WhatsApp e IA desligados</p>
          <span className="rounded-sm border border-[#d6d3cd] px-2 py-0.5 text-[11px] uppercase tracking-wide text-stone-500">
            FASE 1
          </span>
        </header>
        <main className="px-6 py-5">{children}</main>
      </div>
    </div>
  );
}

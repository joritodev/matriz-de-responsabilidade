"use client";

import { CaretLeftIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brand } from "./Brand";
import { NAV, UserMenu } from "./TopNav";

/** Celular: cabeçalho simples no lugar do TopNav. */
export function MobileHeader({ initials, email }: { initials: string; email: string }) {
  const pathname = usePathname();
  const section = NAV.find((n) => n.href !== "/" && pathname.startsWith(n.href));
  return (
    <header className="flex items-center justify-between pt-4 md:hidden">
      {section ? (
        <Link href="/" className="flex items-center gap-3 rounded-full pr-3 text-[16px] font-semibold">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface">
            <CaretLeftIcon size={20} aria-hidden="true" />
          </span>
          {section.label}
          <span className="sr-only">, voltar para a Matriz geral</span>
        </Link>
      ) : (
        <Brand href="/" />
      )}
      <UserMenu initials={initials} email={email} />
    </header>
  );
}

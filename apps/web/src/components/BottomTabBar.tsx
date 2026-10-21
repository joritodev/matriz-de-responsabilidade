"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActive, NAV } from "./TopNav";

/** Celular: barra branca com 4 abas; ativa com ponto acima do rótulo. */
export function BottomTabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-30 flex rounded-t-[24px] bg-surface px-2 pb-[max(env(safe-area-inset-bottom),8px)] md:hidden"
    >
      {NAV.map((item) => {
        const on = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={on ? "page" : undefined}
            className={`flex h-14 flex-1 flex-col items-center justify-center gap-[3px] text-[12px] font-semibold ${on ? "text-ink" : "text-ink-3"}`}
          >
            <span aria-hidden="true" className={`h-[5px] w-[5px] rounded-full ${on ? "bg-ink" : "bg-transparent"}`} />
            {item.short}
          </Link>
        );
      })}
    </nav>
  );
}

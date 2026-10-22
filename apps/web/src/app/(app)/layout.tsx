import { BottomTabBar } from "@/components/BottomTabBar";
import { Fab } from "@/components/Fab";
import { MobileHeader } from "@/components/MobileHeader";
import { NewTaskPanel, NewTaskProvider } from "@/components/NewTaskPanel";
import { ToastProvider } from "@/components/Toast";
import { TopNav } from "@/components/TopNav";
import { api } from "@/lib/api";
import type { Me } from "@/lib/api-types";

function emailInitials(email: string) {
  const local = email.split("@")[0] ?? "";
  const parts = local.split(/[._-]+/).filter(Boolean);
  return ((parts.length > 1 ? parts[0][0] + parts[1][0] : local.slice(0, 2)) || "?").toUpperCase();
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await api<Me>("/me");
  const initials = emailInitials(me.email);
  return (
    <ToastProvider>
      <NewTaskProvider>
        <div className="mx-auto flex min-h-dvh w-full max-w-[1440px] flex-col gap-6 px-4 pb-[120px] md:gap-7 md:px-7 md:pt-5 md:pb-12">
          <div className="relative">
            <TopNav initials={initials} email={me.email} />
            <MobileHeader initials={initials} email={me.email} />
            <NewTaskPanel today={me.today} />
          </div>
          {children}
        </div>
        <Fab />
        <BottomTabBar />
      </NewTaskProvider>
    </ToastProvider>
  );
}

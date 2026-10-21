import type { Metadata } from "next";
import { Brand } from "@/components/Brand";
import { LOCAL_EMAIL_HINT, LOCAL_PASSWORD, localAuthEnabled } from "@/lib/auth-config";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-[420px] rounded-card bg-surface p-7 sm:p-9">
        <Brand />
        <h1 className="mt-8 text-[30px] leading-[34px] font-bold tracking-[-0.035em]">Entrar no Prazo</h1>
        <p className="mt-2 text-[15px] leading-[22px] text-ink-2">Use o e-mail liberado pela coordenação.</p>
        <LoginForm initialError={erro === "acesso" ? "Seu acesso ainda não foi liberado." : null} />
        {localAuthEnabled && (
          <p className="mt-6 rounded-[16px] bg-surface-muted px-4 py-3 text-[13px] leading-[18px] text-ink-2">
            Modo local, sem Supabase: entre com <b className="font-semibold text-ink">{LOCAL_EMAIL_HINT}</b> e a senha{" "}
            <b className="font-semibold text-ink">{LOCAL_PASSWORD}</b>.
          </p>
        )}
      </div>
    </main>
  );
}

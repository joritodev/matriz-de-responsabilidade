import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md border border-[#d6d3cd] bg-[#fbfaf6] p-8 shadow-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-[#0f3d3e]">Operação interna</p>
        <h1 className="mt-2 font-[family-name:var(--font-source-serif)] text-3xl text-[#1c1917]">
          Matriz de Responsabilidade
        </h1>
        <p className="mt-2 mb-6 text-sm text-stone-600">
          Um administrador. Sem WhatsApp automático nesta fase.
        </p>
        <LoginForm />
      </div>
    </main>
  );
}

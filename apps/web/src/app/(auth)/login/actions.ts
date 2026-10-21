"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_URL, LOCAL_PASSWORD, LOCAL_SESSION_COOKIE, localAuthEnabled, supabaseEnabled } from "@/lib/auth-config";
import { supabaseServer } from "@/lib/session";

export interface LoginState {
  error: string | null;
  email: string;
}

async function memberStatus(token: string): Promise<"ok" | "not_member" | "invalid" | "unreachable"> {
  try {
    const res = await fetch(`${API_URL}/v1/me`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    if (res.ok) return "ok";
    if (res.status === 403) return "not_member";
    return "invalid";
  } catch {
    return "unreachable";
  }
}

const MESSAGES = {
  wrong: "E-mail ou senha incorretos.",
  not_member: "Seu acesso ainda não foi liberado.",
  unreachable: "Não foi possível falar com o servidor. Tente de novo em instantes.",
  missing: "Informe e-mail e senha.",
};

export async function loginAction(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: MESSAGES.missing, email };

  if (supabaseEnabled) {
    const supabase = await supabaseServer();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.session) return { error: MESSAGES.wrong, email };
    const status = await memberStatus(data.session.access_token);
    if (status !== "ok") {
      await supabase.auth.signOut();
      return { error: status === "not_member" ? MESSAGES.not_member : status === "unreachable" ? MESSAGES.unreachable : MESSAGES.wrong, email };
    }
    redirect("/");
  }

  if (localAuthEnabled) {
    if (password !== LOCAL_PASSWORD) return { error: MESSAGES.wrong, email };
    const status = await memberStatus(`dev:${email}`);
    if (status !== "ok") return { error: status === "not_member" ? MESSAGES.not_member : status === "unreachable" ? MESSAGES.unreachable : MESSAGES.wrong, email };
    (await cookies()).set(LOCAL_SESSION_COOKIE, email, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
    redirect("/");
  }

  return { error: "O login não está configurado. Defina as variáveis do Supabase.", email };
}

export async function logoutAction() {
  if (supabaseEnabled) {
    const supabase = await supabaseServer();
    await supabase.auth.signOut();
  }
  (await cookies()).delete(LOCAL_SESSION_COOKIE);
  redirect("/login");
}

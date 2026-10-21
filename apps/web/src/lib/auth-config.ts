export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
export const supabaseEnabled = Boolean(SUPABASE_URL && SUPABASE_KEY);

/** Login local (sem Supabase), só fora de produção. */
export const localAuthEnabled = !supabaseEnabled && process.env.NODE_ENV !== "production";
export const LOCAL_SESSION_COOKIE = "prazo_local_session";
export const LOCAL_PASSWORD = process.env.LOCAL_LOGIN_PASSWORD ?? "prazo-local";
export const LOCAL_EMAIL_HINT = process.env.LOCAL_LOGIN_EMAIL ?? "supervisor@prazo.local";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:4318").replace(/\/$/, "");

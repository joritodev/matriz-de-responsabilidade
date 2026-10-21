import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { LOCAL_SESSION_COOKIE, localAuthEnabled, SUPABASE_KEY, SUPABASE_URL, supabaseEnabled } from "./auth-config";

export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Server Component não grava cookie; o proxy renova a sessão.
        }
      },
    },
  });
}

/** Token enviado à API: o access token do Supabase ou, no modo local, `dev:<email>`. */
export async function getAccessToken(): Promise<string | null> {
  if (supabaseEnabled) {
    const supabase = await supabaseServer();
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }
  if (localAuthEnabled) {
    const email = (await cookies()).get(LOCAL_SESSION_COOKIE)?.value;
    return email ? `dev:${email}` : null;
  }
  return null;
}

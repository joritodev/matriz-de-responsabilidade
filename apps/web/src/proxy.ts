import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { LOCAL_SESSION_COOKIE, localAuthEnabled, SUPABASE_KEY, SUPABASE_URL, supabaseEnabled } from "./lib/auth-config";

/** Renova a sessão do Supabase e manda para /login quem não está logado. */
export async function proxy(request: NextRequest) {
  const isLogin = request.nextUrl.pathname.startsWith("/login");
  let response = NextResponse.next({ request });
  let loggedIn = false;

  if (supabaseEnabled) {
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          for (const { name, value } of list) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of list) response.cookies.set(name, value, options);
        },
      },
    });
    const { data } = await supabase.auth.getClaims();
    loggedIn = Boolean(data?.claims);
  } else if (localAuthEnabled) {
    loggedIn = Boolean(request.cookies.get(LOCAL_SESSION_COOKIE)?.value);
  }

  if (!loggedIn && !isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (loggedIn && isLogin && !request.nextUrl.searchParams.has("erro")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)"],
};

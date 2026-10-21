import "server-only";
import { redirect } from "next/navigation";
import type { ApiErrorBody } from "./api-types";
import { API_URL } from "./auth-config";
import { getAccessToken } from "./session";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code: string,
  ) {
    super(message);
  }
}

/** Chama a API com o token da sessão. 401/403 levam ao login. */
export async function api<T>(path: string, init: { method?: string; body?: unknown; redirectOnAuth?: boolean } = {}): Promise<T> {
  const token = await getAccessToken();
  if (!token && init.redirectOnAuth !== false) redirect("/login");
  let res: Response;
  try {
    res = await fetch(`${API_URL}/v1${path}`, {
      method: init.method ?? "GET",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
    });
  } catch {
    throw new ApiError(503, "Não foi possível falar com o servidor. Confira a conexão e tente de novo.", "api_unreachable");
  }
  if (res.ok) return (await res.json()) as T;
  const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
  if ((res.status === 401 || (res.status === 403 && body?.code === "not_member")) && init.redirectOnAuth !== false) {
    redirect(res.status === 403 ? "/login?erro=acesso" : "/login");
  }
  throw new ApiError(res.status, body?.message ?? "Algo deu errado. Tente de novo.", body?.code ?? "error");
}

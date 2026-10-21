import "server-only";

/**
 * Origem da API, lida na hora do pedido.
 * Na Vercel, `API_URL` é injetada pelo binding do serviço `api` e não existe no build.
 * O acesso por colchetes evita que o Next grave o valor vazio durante o build.
 * Fora da Vercel, vale `NEXT_PUBLIC_API_URL` ou o servidor local.
 */
export function apiOrigin(): string {
  const bound = process.env["API_URL"];
  const explicit = process.env.NEXT_PUBLIC_API_URL;
  const raw = (bound && bound.length > 0 ? bound : explicit) || "http://127.0.0.1:4318";
  return raw.replace(/\/$/, "");
}

import postgres from "postgres";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { loadEnv } from "@matriz/config";

const env = loadEnv({ ...process.env, PROCESS_ROLE: process.env.PROCESS_ROLE ?? "web" });

async function main() {
  const sql = postgres(env.databaseUrl, { max: 1 });
  await sql`SELECT pg_advisory_lock(872364)`;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `;
    const folder = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "drizzle");
    const filename = "0000_init.sql";
    const applied = await sql<{ filename: string }[]>`
      SELECT filename FROM schema_migrations WHERE filename = ${filename}
    `;
    if (applied.length === 0) {
      const contents = await readFile(path.join(folder, filename), "utf8");
      await sql.unsafe(contents);
      await sql`INSERT INTO schema_migrations (filename) VALUES (${filename})`;
    }
  } finally {
    await sql`SELECT pg_advisory_unlock(872364)`;
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

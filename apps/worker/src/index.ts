import http from "node:http";
import PgBoss from "pg-boss";
import { loadEnv } from "@matriz/config";
import { createLogger } from "@matriz/shared";
import { createDb } from "@matriz/db";

const env = loadEnv();
const logger = createLogger({ level: env.logLevel, name: "worker" });

let dbOk = false;
let bossOk = false;

async function main() {
  if (env.processRole !== "worker") {
    logger.warn({ processRole: env.processRole }, "worker iniciado com PROCESS_ROLE inesperado");
  }

  const { client } = createDb(env.databaseUrl);
  await client`SELECT 1`;
  dbOk = true;

  const boss = new PgBoss({
    connectionString: env.databaseUrl,
    schema: env.pgBossSchema,
  });
  boss.on("error", (error) => logger.error({ err: error }, "pg-boss error"));
  await boss.start();
  bossOk = true;
  logger.info("worker up — FASE 1 (sem WhatsApp, sem IA)");

  const server = http.createServer((req, res) => {
    if (req.url === "/health" || req.url === "/api/health") {
      const ok = dbOk && bossOk;
      res.writeHead(ok ? 200 : 503, { "content-type": "application/json" });
      res.end(JSON.stringify({ status: ok ? "ok" : "degraded", role: "worker", db: dbOk, pgboss: bossOk }));
      return;
    }
    res.writeHead(404);
    res.end();
  });
  server.listen(3001, () => logger.info({ port: 3001 }, "worker health"));
}

main().catch((error) => {
  logger.error({ err: error }, "worker failed");
  process.exit(1);
});

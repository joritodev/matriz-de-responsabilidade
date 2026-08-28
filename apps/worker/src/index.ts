import http from "node:http";
import PgBoss from "pg-boss";
import { loadEnv } from "@matriz/config";
import { createDb, runDeadlineTick } from "@matriz/db";
import { createLogger } from "@matriz/shared";

const env = loadEnv();
const logger = createLogger({ level: env.logLevel, name: "worker" });

let dbOk = false;
let bossOk = false;

async function executeDeadlineTick() {
  const { db, client } = createDb(env.databaseUrl);
  try {
    const result = await runDeadlineTick(db);
    logger.info(result, "deadline-tick concluído");
    return result;
  } finally {
    await client.end();
  }
}

async function main() {
  if (env.processRole !== "worker") {
    logger.warn({ processRole: env.processRole }, "worker iniciado com PROCESS_ROLE inesperado");
  }

  const { client } = createDb(env.databaseUrl);
  await client`SELECT 1`;
  await client.end();
  dbOk = true;

  const boss = new PgBoss({
    connectionString: env.databaseUrl,
    schema: env.pgBossSchema,
  });
  boss.on("error", (error) => logger.error({ err: error }, "pg-boss error"));
  await boss.start();
  bossOk = true;

  await boss.schedule("deadline-tick", "*/15 * * * *", {}, { tz: "America/Sao_Paulo" });
  await boss.work("deadline-tick", async () => {
    await executeDeadlineTick();
  });

  await executeDeadlineTick();
  logger.info("worker up — FASE 2.4 (deadline-tick a cada 15 min)");

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

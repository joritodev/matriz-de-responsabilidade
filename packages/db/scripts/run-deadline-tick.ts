import { loadEnv } from "@matriz/config";
import { createDb, runDeadlineTick } from "../src/index";

loadEnv();

async function main() {
  const env = loadEnv();
  const { db, client } = createDb(env.databaseUrl);
  try {
    const result = await runDeadlineTick(db);
    console.log(
      `deadline-tick: today=${result.today} scanned=${result.scanned} cache=${result.cacheUpdated} alerts=${result.alertsCreated}`,
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

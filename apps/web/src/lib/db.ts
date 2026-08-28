import { loadEnv } from "@matriz/config";
import { createDb } from "@matriz/db";

const globalForDb = globalThis as unknown as {
  matrizDb?: ReturnType<typeof createDb>;
};

export function getEnv() {
  return loadEnv();
}

export function getDb() {
  if (!globalForDb.matrizDb) {
    const env = getEnv();
    globalForDb.matrizDb = createDb(env.databaseUrl);
  }
  return globalForDb.matrizDb.db;
}

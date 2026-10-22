import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Clock } from '../src/common/clock';
import { createDb, type DbHandle } from '../src/db/client';
import { createApp } from '../src/main';

export const MEMBER = 'supervisor@prazo.local';
export const AUTH = { Authorization: `Bearer dev:${MEMBER}` };
export const MAKE = { 'x-api-key': 'test-make-key' };

export interface TestApp {
  app: INestApplication;
  handle: DbHandle;
  http: () => ReturnType<typeof request>;
  setToday: (d: string) => void;
  close: () => Promise<void>;
}

/** Postgres de verdade (CI): aplica as migrações e o seed num banco vazio. */
async function applySqlToDatabase(url: string) {
  const postgres = (await import('postgres')).default;
  const client = postgres(url, { prepare: false, max: 1 });
  try {
    await client.unsafe('drop schema if exists public cascade; create schema public;');
    const dir = join(process.cwd(), '../../supabase/migrations');
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
      await client.unsafe(readFileSync(join(dir, file), 'utf8'));
    }
    await client.unsafe(readFileSync(join(process.cwd(), '../../supabase/seed.sql'), 'utf8'));
  } finally {
    await client.end();
  }
}

/**
 * API completa sobre um banco com a migração e o seed reais.
 * `useTestDatabase` aponta para `TEST_DATABASE_URL` (Postgres de verdade, para
 * testes que disputam conexões); sem isso, PGlite em memória, isolado por arquivo.
 */
export async function startTestApp(options: { useTestDatabase?: boolean } = {}): Promise<TestApp> {
  process.env.MAKE_API_KEY = 'test-make-key';
  process.env.DEV_MEMBER_EMAIL = MEMBER;
  delete process.env.SUPABASE_URL;
  delete process.env.DATABASE_URL;
  const url = options.useTestDatabase ? process.env.TEST_DATABASE_URL : undefined;
  if (url) await applySqlToDatabase(url);
  const handle = await createDb(url ? { databaseUrl: url } : { pgliteDataDir: 'memory' });
  const app = await createApp(handle);
  app.useLogger(false);
  await app.init();
  const clock = app.get(Clock);
  let today = '2026-10-20';
  clock.today = () => today;
  return {
    app,
    handle,
    http: () => request(app.getHttpServer()),
    setToday: (d) => {
      today = d;
    },
    close: async () => {
      await app.close();
      await handle.close();
    },
  };
}

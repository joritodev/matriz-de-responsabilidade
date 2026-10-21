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

/** API completa sobre um PGlite em memória com a migração e o seed reais. */
export async function startTestApp(): Promise<TestApp> {
  process.env.MAKE_API_KEY = 'test-make-key';
  process.env.DEV_MEMBER_EMAIL = MEMBER;
  delete process.env.SUPABASE_URL;
  delete process.env.DATABASE_URL;
  const handle = await createDb({ pgliteDataDir: 'memory' });
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

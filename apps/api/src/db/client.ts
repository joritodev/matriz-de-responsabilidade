import { Logger } from '@nestjs/common';
import { readdirSync, readFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import * as schema from './schema';

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
export type DbOrTx = Db | Tx;

export const DB = Symbol('DB');

export interface DbHandle {
  db: Db;
  kind: 'postgres' | 'pglite';
  close: () => Promise<void>;
}

const logger = new Logger('Database');

function supabaseDir(): string {
  return process.env.SUPABASE_DIR ?? resolve(__dirname, '../../../../supabase');
}

/**
 * Com DATABASE_URL: Postgres do Supabase (pooler de transação, prepare: false).
 * Sem DATABASE_URL e fora de produção: PGlite (Postgres embutido) com a migração
 * e o seed aplicados na primeira execução. `PGLITE_DATA_DIR=memory` não grava em disco.
 */
export async function createDb(options: { databaseUrl?: string; pgliteDataDir?: string; seed?: boolean } = {}): Promise<DbHandle> {
  const databaseUrl = options.databaseUrl ?? process.env.DATABASE_URL;
  if (databaseUrl) {
    const { default: postgres } = await import('postgres');
    const { drizzle } = await import('drizzle-orm/postgres-js');
    const client = postgres(databaseUrl, { prepare: false, max: Number(process.env.DATABASE_POOL_MAX ?? 5) });
    return { db: drizzle(client, { schema }) as unknown as Db, kind: 'postgres', close: () => client.end() };
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('DATABASE_URL é obrigatório em produção.');
  }

  const { PGlite } = await import('@electric-sql/pglite');
  const { drizzle } = await import('drizzle-orm/pglite');
  const dir = options.pgliteDataDir ?? process.env.PGLITE_DATA_DIR ?? resolve(process.cwd(), '.data/pglite');
  if (dir !== 'memory') mkdirSync(dir, { recursive: true });
  const pg = dir === 'memory' ? new PGlite() : new PGlite(dir);
  await pg.waitReady;

  const existing = await pg.query<{ t: string | null }>(`select to_regclass('public.matrices')::text as t`);
  if (!existing.rows[0]?.t) {
    const migrationsDir = join(supabaseDir(), 'migrations');
    for (const file of readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort()) {
      await pg.exec(readFileSync(join(migrationsDir, file), 'utf8'));
    }
    if (options.seed ?? true) {
      await pg.exec(readFileSync(join(supabaseDir(), 'seed.sql'), 'utf8'));
    }
    logger.log(`PGlite criado em ${dir} com a migração${options.seed ?? true ? ' e o seed' : ''}.`);
  }

  const devMember = (process.env.DEV_MEMBER_EMAIL ?? 'supervisor@prazo.local').toLowerCase();
  await pg.query(`insert into public.members (email, role) values ($1, 'admin') on conflict do nothing`, [devMember]);

  return { db: drizzle(pg, { schema }) as unknown as Db, kind: 'pglite', close: () => pg.close() };
}

/** Código SQLSTATE do erro, atravessando o embrulho do Drizzle. */
export function pgErrorCode(err: unknown): string | undefined {
  let e: unknown = err;
  for (let i = 0; i < 5 && e; i++) {
    const code = (e as { code?: unknown }).code;
    if (typeof code === 'string' && /^[0-9A-Z]{5}$/.test(code)) return code;
    e = (e as { cause?: unknown }).cause;
  }
  return undefined;
}

export function pgConstraint(err: unknown): string | undefined {
  let e: unknown = err;
  for (let i = 0; i < 5 && e; i++) {
    const c = (e as { constraint?: unknown; constraint_name?: unknown }).constraint ?? (e as { constraint_name?: unknown }).constraint_name;
    if (typeof c === 'string') return c;
    e = (e as { cause?: unknown }).cause;
  }
  return undefined;
}

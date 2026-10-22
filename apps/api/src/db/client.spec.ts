import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sql } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';
import { createDb } from './client';

describe('migrações do PGlite', () => {
  const dir = mkdtempSync(join(tmpdir(), 'prazo-pglite-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('num diretório já criado aplica só o que falta, sem rodar o init de novo', async () => {
    const first = await createDb({ pgliteDataDir: dir, seed: true });
    const seeded = (await first.db.execute(sql`select count(*)::int as n from tasks`)) as { rows: { n: number }[] };
    expect(seeded.rows[0].n).toBeGreaterThan(0);
    await first.db.execute(sql`delete from schema_migrations`);
    await first.close();

    const second = await createDb({ pgliteDataDir: dir });
    const index = (await second.db.execute(sql`select 1 as ok from pg_indexes where indexname = 'reminder_items_task'`)) as {
      rows: unknown[];
    };
    expect(index.rows).toHaveLength(1);
    const tracked = (await second.db.execute(sql`select filename from schema_migrations order by filename`)) as {
      rows: { filename: string }[];
    };
    expect(tracked.rows.length).toBeGreaterThanOrEqual(2);
    await second.close();

    const third = await createDb({ pgliteDataDir: dir });
    await third.close();
  });
});

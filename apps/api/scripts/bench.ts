/**
 * Mede o custo das rotas de leitura com 1 ano de histórico na base.
 *
 * Uso:  pnpm bench                -> orça 150 ms por rota (média de 5 pedidos)
 *       BENCH_MAX_MS=100000 pnpm bench  -> só mede, sem estourar a comparação
 *
 * A base grande tem 3.014 demandas, 1.834 lotes e 7.310 itens de cobrança
 * (seed real + 3.000 demandas, 1.825 lotes e 7.300 itens gerados).
 */
import { sql } from 'drizzle-orm';
import { writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { AUTH, startTestApp, type TestApp } from '../test/helpers';

const BUDGET_MS = Number(process.env.BENCH_MAX_MS ?? 150);
const RUNS = 5;

const ROUTES: { name: string; path: string }[] = [
  { name: 'GET /overview', path: '/v1/overview' },
  { name: 'GET /matrices', path: '/v1/matrices' },
  { name: 'GET /matrices/geral/tasks', path: '/v1/matrices/geral/tasks' },
  { name: 'GET /matrices/geral/tasks?filter=done', path: '/v1/matrices/geral/tasks?filter=done' },
  { name: 'GET /search', path: '/v1/search?q=demanda' },
  { name: 'GET /reminders/preview', path: '/v1/reminders/preview' },
  { name: 'GET /reminders/batches', path: '/v1/reminders/batches' },
  { name: 'GET /assignees', path: '/v1/assignees' },
  { name: 'GET /me', path: '/v1/me' },
];

/** Gera 1 ano de histórico: 3.000 demandas, 1.825 lotes e 7.300 itens (is_active=false). */
async function seedLargeBase(t: TestApp) {
  await t.handle.db.execute(sql`
    with m as (
      select id, row_number() over (order by position) - 1 as rn, count(*) over () as cnt
      from public.matrices where not is_archived
    ),
    a as (
      select id, row_number() over (order by full_name) - 1 as rn, count(*) over () as cnt
      from public.assignees
    )
    insert into public.tasks (id, matrix_id, position, assignee_id, title, due_date, status, completed_at)
    select
      gen_random_uuid(),
      m.id,
      1000 + s.n,
      a.id,
      'Demanda de carga ' || s.n,
      (date '2026-10-01' + ((s.n * 7) % 120))::date,
      case when s.n % 10 = 0 then 'done'::task_status
           when s.n % 25 = 0 then 'canceled'::task_status
           else 'pending'::task_status end,
      case when s.n % 10 = 0 then now() end
    from generate_series(1, 3000) s(n)
    join m on m.rn = s.n % m.cnt
    join a on a.rn = s.n % a.cnt
  `);

  await t.handle.db.execute(sql`
    with a as (
      select id, whatsapp_e164, row_number() over (order by full_name) - 1 as rn, count(*) over () as cnt
      from public.assignees
    )
    insert into public.reminder_batches
      (id, assignee_id, channel, recipient, sent_on, status, message_body, provider_message_id, error_message, created_at, finished_at)
    select
      gen_random_uuid(),
      a.id,
      'whatsapp'::reminder_channel,
      coalesce(a.whatsapp_e164, '5511999999999'),
      (date '2026-10-20' - (s.n % 365))::date,
      case when s.n % 20 = 0 then 'failed'::batch_status else 'sent'::batch_status end,
      '(mensagem de carga)',
      case when s.n % 20 = 0 then null else 'wa-' || s.n end,
      case when s.n % 20 = 0 then 'Falha simulada' end,
      now() - ((s.n % 365) || ' days')::interval,
      now()
    from generate_series(1, 1825) s(n)
    join a on a.rn = s.n % a.cnt
  `);

  await t.handle.db.execute(sql`
    with b as (
      select id, channel, row_number() over (order by created_at) as rn, count(*) over () as cnt
      from public.reminder_batches
    ),
    t as (
      select id, due_date, row_number() over () as rn, count(*) over () as cnt
      from public.tasks
    )
    insert into public.reminder_batch_items (batch_id, channel, task_id, kind, due_date_snapshot, is_active)
    select
      b.id,
      b.channel,
      t.id,
      case when k in (0, 2) then 'early'::reminder_kind else 'due'::reminder_kind end,
      t.due_date,
      false
    from b
    cross join generate_series(0, 3) as k
    join t on t.rn = ((b.rn * 4 + k) % t.cnt) + 1
  `);
}

async function measure(t: TestApp, path: string): Promise<{ avg: number; max: number }> {
  for (let i = 0; i < 2; i++) await t.http().get(path).set(AUTH).expect(200);
  const times: number[] = [];
  for (let i = 0; i < RUNS; i++) {
    const start = performance.now();
    await t.http().get(path).set(AUTH).expect(200);
    times.push(performance.now() - start);
  }
  return { avg: times.reduce((s, x) => s + x, 0) / times.length, max: Math.max(...times) };
}

describe('carga: rotas de leitura com 1 ano de histórico', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await startTestApp();
    await seedLargeBase(t);
  });

  afterAll(async () => {
    await t.close();
  });

  it(`todas as rotas ficam em média abaixo de ${BUDGET_MS} ms`, async () => {
    const count = async (table: string) => {
      const r = (await t.handle.db.execute(sql.raw(`select count(*)::text as c from public.${table}`))) as { rows: { c: string }[] };
      return r.rows[0].c;
    };
    const [nTasks, nBatches, nItems] = await Promise.all([count('tasks'), count('reminder_batches'), count('reminder_batch_items')]);
    const lines: string[] = [
      `Base grande: ${nTasks} demandas, ${nBatches} lotes, ${nItems} itens de cobrança ` +
        `(orço ${BUDGET_MS} ms, média de ${RUNS} pedidos por rota)`,
      '',
    ];

    const over: string[] = [];
    for (const route of ROUTES) {
      const { avg, max } = await measure(t, route.path);
      const ok = avg < BUDGET_MS;
      if (!ok) over.push(route.name);
      lines.push(
        `${ok ? 'ok  ' : 'FAIL'}  ${route.name.padEnd(40)} média ${avg.toFixed(1).padStart(7)} ms   pior ${max.toFixed(1).padStart(7)} ms`,
      );
    }

    writeFileSync('scripts/bench-results.txt', lines.join('\n') + '\n', 'utf8');
    expect(over, `rotas acima de ${BUDGET_MS} ms: ${over.join(', ')}`).toEqual([]);
  }, 280_000);
});

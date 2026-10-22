import { AUTH, startTestApp, type TestApp } from './helpers';

const GERAL = '10000000-0000-0000-0000-000000000001';
const BIANCA = '20000000-0000-0000-0000-000000000001';

/**
 * Disputa de posição só aparece com conexões reais: o PGlite tem uma só.
 * Roda quando o CI sobe um postgres:16 e define TEST_DATABASE_URL.
 */
describe.runIf(Boolean(process.env.TEST_DATABASE_URL))('disputa de posição no Postgres real', () => {
  let t: TestApp;
  beforeEach(async () => {
    t = await startTestApp({ useTestDatabase: true });
  });
  afterEach(async () => {
    await t.close();
  });

  it('4 criações de demanda em paralelo ficam com posições seguidas, sem 500', async () => {
    const results = await Promise.all(
      [1, 2, 3, 4].map((n) =>
        t
          .http()
          .post(`/v1/matrices/${GERAL}/tasks`)
          .set(AUTH)
          .send({ title: `Demanda corrida ${n}`, assigneeId: BIANCA, dueDate: '2026-10-25' }),
      ),
    );
    expect(results.map((r) => r.status)).toEqual([200, 200, 200, 200]);
    const positions = results.map((r) => r.body.position).sort((a: number, b: number) => a - b);
    expect(positions).toEqual([4, 5, 6, 7]);
  });

  it('4 criações de pasta em paralelo ficam com posições seguidas, sem 500', async () => {
    const results = await Promise.all(
      ['Corrida A', 'Corrida B', 'Corrida C', 'Corrida D'].map((name) =>
        t.http().post('/v1/matrices').set(AUTH).send({ name, color: 'sky' }),
      ),
    );
    expect(results.map((r) => r.status)).toEqual([201, 201, 201, 201]);
    const positions = results.map((r) => r.body.position).sort((a: number, b: number) => a - b);
    expect(positions).toEqual([5, 6, 7, 8]);
  });
});

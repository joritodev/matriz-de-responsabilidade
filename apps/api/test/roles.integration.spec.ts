import { members } from '../src/db/schema';
import { startTestApp, type TestApp } from './helpers';

const VIEWER = 'visualizador@prazo.local';
const EDITOR = 'editora@prazo.local';
const VIEWER_AUTH = { Authorization: `Bearer dev:${VIEWER}` };
const EDITOR_AUTH = { Authorization: `Bearer dev:${EDITOR}` };
const RAFAEL_TASK = '30000000-0000-0000-0000-000000000302';

describe('papéis (integração)', () => {
  let t: TestApp;
  beforeEach(async () => {
    t = await startTestApp();
    await t.handle.db.insert(members).values([
      { email: VIEWER, role: 'viewer' },
      { email: EDITOR, role: 'editor' },
    ]);
  });
  afterEach(async () => {
    await t.close();
  });

  it('viewer lê a Matriz geral e o /me devolve o papel', async () => {
    await t.http().get('/v1/overview').set(VIEWER_AUTH).expect(200);
    const me = await t.http().get('/v1/me').set(VIEWER_AUTH).expect(200);
    expect(me.body).toMatchObject({ email: VIEWER, role: 'viewer' });
  });

  it('viewer recebe 403 read_only ao prorrogar', async () => {
    const res = await t
      .http()
      .post(`/v1/tasks/${RAFAEL_TASK}/extend`)
      .set(VIEWER_AUTH)
      .send({ newDueDate: '2026-11-01', reason: 'Pedido da coordenação' })
      .expect(403);
    expect(res.body).toMatchObject({ code: 'read_only', message: 'Seu acesso é só de leitura.' });
  });

  it('viewer recebe 403 ao criar pasta e ao criar demanda', async () => {
    await t.http().post('/v1/matrices').set(VIEWER_AUTH).send({ name: 'Pasta', color: 'sky' }).expect(403);
    await t
      .http()
      .post('/v1/matrices/00000000-0000-0000-0000-000000000001/tasks')
      .set(VIEWER_AUTH)
      .send({})
      .expect(403);
  });

  it('editor prorroga normalmente', async () => {
    await t
      .http()
      .post(`/v1/tasks/${RAFAEL_TASK}/extend`)
      .set(EDITOR_AUTH)
      .send({ newDueDate: '2026-11-01', reason: 'Pedido da coordenação' })
      .expect(200);
  });
});

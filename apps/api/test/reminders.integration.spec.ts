import { eq } from 'drizzle-orm';
import { reminderBatchItems, reminderBatches } from '../src/db/schema';
import { AUTH, MAKE, startTestApp, type TestApp } from './helpers';

const RAFAEL_TASK = '30000000-0000-0000-0000-000000000302';
const MATHEUS_TASK_DUE_20 = '30000000-0000-0000-0000-000000000102';

describe('cobrança (integração com o banco)', () => {
  let t: TestApp;
  beforeEach(async () => {
    t = await startTestApp();
  });
  afterEach(async () => {
    await t.close();
  });

  it('overview reproduz as contagens da tela 01', async () => {
    const res = await t.http().get('/v1/overview').set(AUTH).expect(200);
    expect(res.body.today).toBe('2026-10-20');
    expect(res.body.greeting).toMatchObject({ dueToday: 2, dueNext3Days: 4, remindersSentToday: true });
    expect(res.body.ruler.columns).toHaveLength(10);
    expect(res.body.tomorrow.count).toBe(2);
    expect(res.body.tomorrow.summary).toBe('Matheus (no dia) e Rafael (nova tentativa)');
  });

  it('dispatch duas vezes seguidas: a segunda vem vazia', async () => {
    t.setToday('2026-10-21');
    const first = await t.http().post('/v1/reminders/dispatch').set(MAKE).expect(200);
    expect(first.body.date).toBe('2026-10-21');
    expect(first.body.batches.map((b: { assigneeName: string; channel: string }) => `${b.assigneeName}/${b.channel}`)).toEqual([
      'Matheus Araújo/whatsapp',
      'Rafael Pinheiro/email',
    ]);
    const rafael = first.body.batches.find((b: { channel: string }) => b.channel === 'email');
    expect(rafael.subject).toBe('Andamento: Divulgar calendário da Pós, prazo 23/10');
    expect(rafael.to).toBe('rafael.pinheiro@exemplo.com.br');

    const second = await t.http().post('/v1/reminders/dispatch').set(MAKE).expect(200);
    expect(second.body.batches).toEqual([]);
  });

  it('dispatch concorrente não gera reserva duplicada', async () => {
    t.setToday('2026-10-21');
    const [a, b] = await Promise.all([
      t.http().post('/v1/reminders/dispatch').set(MAKE),
      t.http().post('/v1/reminders/dispatch').set(MAKE),
    ]);
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(a.body.batches.length + b.body.batches.length).toBe(2);
    const items = await t.handle.db.select().from(reminderBatchItems).where(eq(reminderBatchItems.isActive, true));
    const keys = items.map((i) => `${i.taskId}|${i.kind}|${i.dueDateSnapshot}|${i.channel}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('result failed faz a demanda voltar no dia útil seguinte', async () => {
    t.setToday('2026-10-21');
    const { body } = await t.http().post('/v1/reminders/dispatch').set(MAKE).expect(200);
    const matheus = body.batches.find((b: { assigneeName: string }) => b.assigneeName === 'Matheus Araújo');
    const rafael = body.batches.find((b: { assigneeName: string }) => b.assigneeName === 'Rafael Pinheiro');

    await t.http().post(`/v1/reminders/batches/${matheus.id}/result`).set(MAKE).send({ status: 'sent', providerMessageId: 'wa-1' }).expect(200);
    await t
      .http()
      .post(`/v1/reminders/batches/${rafael.id}/result`)
      .set(MAKE)
      .send({ status: 'failed', error: 'Caixa de entrada cheia', makeExecutionId: 4813 })
      .expect(200);

    const preview = await t.http().get('/v1/reminders/preview').set(AUTH).expect(200);
    expect(preview.body.date).toBe('2026-10-22');
    const retry = preview.body.batches.find((b: { assignee: { fullName: string } }) => b.assignee.fullName === 'Rafael Pinheiro');
    expect(retry).toBeDefined();
    expect(retry.retry).toBe(true);
    expect(retry.items.map((i: { taskId: string }) => i.taskId)).toEqual([RAFAEL_TASK]);

    t.setToday('2026-10-22');
    const next = await t.http().post('/v1/reminders/dispatch').set(MAKE).expect(200);
    expect(next.body.batches.some((b: { assigneeName: string }) => b.assigneeName === 'Rafael Pinheiro')).toBe(true);
  });

  it('result é idempotente e recusa troca de status finalizado', async () => {
    t.setToday('2026-10-21');
    const { body } = await t.http().post('/v1/reminders/dispatch').set(MAKE).expect(200);
    const id = body.batches[0].id;
    await t.http().post(`/v1/reminders/batches/${id}/result`).set(MAKE).send({ status: 'sent' }).expect(200);
    await t.http().post(`/v1/reminders/batches/${id}/result`).set(MAKE).send({ status: 'sent' }).expect(200);
    const res = await t.http().post(`/v1/reminders/batches/${id}/result`).set(MAKE).send({ status: 'failed', error: 'x' }).expect(409);
    expect(res.body.code).toBe('batch_already_finalized');
    const bad = await t.http().post(`/v1/reminders/batches/${id}/result`).set(MAKE).send({ status: 'failed' }).expect(400);
    expect(bad.body.message).toBe('Informe o erro quando o envio falhar.');
  });

  it('prorrogação grava histórico e libera as cobranças para o novo prazo', async () => {
    const before = await t.http().get('/v1/matrices/geral/tasks').set(AUTH).expect(200);
    const row = before.body.tasks.find((r: { id: string }) => r.id === MATHEUS_TASK_DUE_20);
    expect(row.reminders).toEqual({ early: 'sent', due: 'sent' });

    const bad = await t.http().post(`/v1/tasks/${MATHEUS_TASK_DUE_20}/extend`).set(AUTH).send({ newDueDate: '2026-10-19', reason: 'Motivo qualquer' }).expect(400);
    expect(bad.body.message).toBe('O novo prazo precisa ser depois do prazo atual.');

    await t
      .http()
      .post(`/v1/tasks/${MATHEUS_TASK_DUE_20}/extend`)
      .set(AUTH)
      .send({ newDueDate: '2026-10-27', reason: 'Aguardando a arte final', approvedBy: 'Coordenação' })
      .expect(200);

    const after = await t.http().get('/v1/matrices/geral/tasks').set(AUTH).expect(200);
    const extended = after.body.tasks.find((r: { id: string }) => r.id === MATHEUS_TASK_DUE_20);
    expect(extended.dueDate).toBe('2026-10-27');
    expect(extended.reminders).toEqual({ early: 'planned', due: 'planned' });
    expect(extended.lastChange).toMatchObject({ kind: 'extension', previousDueDate: '2026-10-20', newDueDate: '2026-10-27' });
    expect(after.body.counts.extended).toBe(1);

    const history = await t.http().get(`/v1/tasks/${MATHEUS_TASK_DUE_20}/history`).set(AUTH).expect(200);
    expect(history.body.events.map((e: { type: string }) => e.type)).toEqual(['created', 'reminder', 'reminder', 'due_change']);

    t.setToday('2026-10-26');
    const dispatch = await t.http().post('/v1/reminders/dispatch').set(MAKE).expect(200);
    const matheus = dispatch.body.batches.find((b: { assigneeName: string }) => b.assigneeName === 'Matheus Araújo');
    expect(matheus.body).toContain('Atualizar a Assinatura Suprema no Site');
  });
});

describe('acesso e validação', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await startTestApp();
  });
  afterAll(async () => {
    await t.close();
  });

  it('exige login, membro e chave do Make', async () => {
    const noToken = await t.http().get('/v1/overview').expect(401);
    expect(noToken.body).toEqual({ message: 'Faça login para continuar.', code: 'unauthorized' });
    const notMember = await t.http().get('/v1/overview').set({ Authorization: 'Bearer dev:alguem@fora.com' }).expect(403);
    expect(notMember.body.message).toBe('Seu acesso ainda não foi liberado.');
    await t.http().post('/v1/reminders/dispatch').expect(401);
    await t.http().post('/v1/reminders/dispatch').set({ 'x-api-key': 'errada' }).expect(401);
  });

  it('recusa prazo no passado e normaliza WhatsApp', async () => {
    const res = await t
      .http()
      .post('/v1/matrices/10000000-0000-0000-0000-000000000001/tasks')
      .set(AUTH)
      .send({ title: 'Teste', assigneeId: '20000000-0000-0000-0000-000000000001', dueDate: '2026-10-19' })
      .expect(400);
    expect(res.body.message).toBe('O prazo precisa ser hoje ou depois.');

    const created = await t
      .http()
      .post('/v1/assignees')
      .set(AUTH)
      .send({ fullName: 'Carla Souza', whatsapp: '+55 (11) 99812-0000', reminderChannel: 'whatsapp' })
      .expect(201);
    expect(created.body.whatsappE164).toBe('5511998120000');

    const missing = await t.http().post('/v1/assignees').set(AUTH).send({ fullName: 'Sem Email', reminderChannel: 'email' }).expect(400);
    expect(missing.body.message).toBe('Para cobrar por e-mail, cadastre o endereço.');
  });

  it('cria pasta com slug sem acento e sufixo quando repete', async () => {
    const a = await t.http().post('/v1/matrices').set(AUTH).send({ name: 'Extensão', color: 'sky' }).expect(201);
    expect(a.body.slug).toBe('extensao');
    await t.http().patch(`/v1/matrices/${a.body.id}`).set(AUTH).send({ isArchived: true }).expect(200);
    const b = await t.http().post('/v1/matrices').set(AUTH).send({ name: 'Extensão', color: 'rose' }).expect(201);
    expect(b.body.slug).toBe('extensao-2');
    const dup = await t.http().post('/v1/matrices').set(AUTH).send({ name: 'extensão', color: 'rose' }).expect(409);
    expect(dup.body.message).toBe('Já existe uma pasta com esse nome.');
  });

  it('reordena as demandas da pasta', async () => {
    const m = '10000000-0000-0000-0000-000000000001';
    const ids = ['30000000-0000-0000-0000-000000000103', '30000000-0000-0000-0000-000000000101', '30000000-0000-0000-0000-000000000102'];
    await t.http().post(`/v1/matrices/${m}/tasks/reorder`).set(AUTH).send({ taskIds: ids }).expect(200);
    const res = await t.http().get('/v1/matrices/geral/tasks').set(AUTH).expect(200);
    expect(res.body.tasks.map((r: { id: string }) => r.id)).toEqual(ids);
  });
});

describe('lotes sem confirmação do Make (D3)', () => {
  let t: TestApp;
  beforeEach(async () => {
    t = await startTestApp();
  });
  afterEach(async () => {
    await t.close();
  });

  it('dispatch do dia seguinte expira o queued de ontem e a cobrança sai de novo', async () => {
    t.setToday('2026-10-21');
    const first = await t.http().post('/v1/reminders/dispatch').set(MAKE).expect(200);
    expect(first.body.batches).toHaveLength(2);

    t.setToday('2026-10-22');
    const next = await t.http().post('/v1/reminders/dispatch').set(MAKE).expect(200);
    expect(next.body.batches.some((b: { assigneeName: string }) => b.assigneeName === 'Rafael Pinheiro')).toBe(true);

    const old = await t.http().get('/v1/reminders/batches?from=2026-10-21&to=2026-10-21').set(AUTH).expect(200);
    expect(old.body.days[0].batches).toHaveLength(2);
    for (const b of old.body.days[0].batches) {
      expect(b).toMatchObject({ status: 'failed', error: 'Sem confirmação do Make.' });
    }
  });

  it('/result atrasado de lote expirado recebe 409', async () => {
    t.setToday('2026-10-21');
    const { body } = await t.http().post('/v1/reminders/dispatch').set(MAKE).expect(200);
    const id = body.batches[0].id;
    t.setToday('2026-10-22');
    await t.http().post('/v1/reminders/dispatch').set(MAKE).expect(200);
    const res = await t.http().post(`/v1/reminders/batches/${id}/result`).set(MAKE).send({ status: 'sent' }).expect(409);
    expect(res.body.code).toBe('batch_already_finalized');
  });

  it('taken: "recebi" mantém a reserva, aceita sent depois e finaliza', async () => {
    t.setToday('2026-10-21');
    const { body } = await t.http().post('/v1/reminders/dispatch').set(MAKE).expect(200);
    const matheus = body.batches.find((b: { assigneeName: string }) => b.assigneeName === 'Matheus Araújo');

    const taken = await t.http().post(`/v1/reminders/batches/${matheus.id}/result`).set(MAKE).send({ status: 'taken', makeExecutionId: 1 }).expect(200);
    expect(taken.body).toMatchObject({ status: 'taken', finishedAt: null });
    const again = await t.http().post(`/v1/reminders/batches/${matheus.id}/result`).set(MAKE).send({ status: 'taken' }).expect(200);
    expect(again.body).toMatchObject({ status: 'taken', finishedAt: null });

    t.setToday('2026-10-22');
    const next = await t.http().post('/v1/reminders/dispatch').set(MAKE).expect(200);
    expect(next.body.batches.some((b: { assigneeName: string }) => b.assigneeName === 'Matheus Araújo')).toBe(false);

    const sent = await t.http().post(`/v1/reminders/batches/${matheus.id}/result`).set(MAKE).send({ status: 'sent', providerMessageId: 'wa-9' }).expect(200);
    expect(sent.body).toMatchObject({ status: 'sent' });
    expect(sent.body.finishedAt).not.toBeNull();
    const late = await t.http().post(`/v1/reminders/batches/${matheus.id}/result`).set(MAKE).send({ status: 'failed', error: 'x' }).expect(409);
    expect(late.body.code).toBe('batch_already_finalized');
  });

  it('requeue: taken de dia anterior libera a reserva e a cobrança volta', async () => {
    t.setToday('2026-10-21');
    const { body } = await t.http().post('/v1/reminders/dispatch').set(MAKE).expect(200);
    const rafael = body.batches.find((b: { channel: string }) => b.channel === 'email');
    const matheus = body.batches.find((b: { channel: string }) => b.channel === 'whatsapp');

    await t.http().post(`/v1/reminders/batches/${rafael.id}/result`).set(MAKE).send({ status: 'taken' }).expect(200);
    const sameDay = await t.http().post(`/v1/reminders/batches/${rafael.id}/requeue`).set(AUTH).expect(409);
    expect(sameDay.body.code).toBe('batch_not_stale');
    const notTaken = await t.http().post(`/v1/reminders/batches/${matheus.id}/requeue`).set(AUTH).expect(409);
    expect(notTaken.body.code).toBe('batch_not_requeueable');

    t.setToday('2026-10-22');
    const requeued = await t.http().post(`/v1/reminders/batches/${rafael.id}/requeue`).set(AUTH).expect(200);
    expect(requeued.body).toMatchObject({ status: 'failed' });

    const again = await t.http().post(`/v1/reminders/batches/${rafael.id}/requeue`).set(AUTH).expect(409);
    expect(again.body.code).toBe('batch_not_requeueable');

    const next = await t.http().post('/v1/reminders/dispatch').set(MAKE).expect(200);
    expect(next.body.batches.some((b: { assigneeName: string }) => b.assigneeName === 'Rafael Pinheiro')).toBe(true);

    const list = await t.http().get('/v1/reminders/batches?from=2026-10-21&to=2026-10-21').set(AUTH).expect(200);
    const oldRafael = list.body.days[0].batches.find((b: { channel: string }) => b.channel === 'email');
    expect(oldRafael).toMatchObject({ status: 'failed', error: 'Reenviado manualmente.' });
  });

  it('requeue sem login é recusado e viewer recebe 403', async () => {
    t.setToday('2026-10-21');
    const { body } = await t.http().post('/v1/reminders/dispatch').set(MAKE).expect(200);
    const id = body.batches[0].id;
    await t.http().post(`/v1/reminders/batches/${id}/requeue`).expect(401);
  });
});

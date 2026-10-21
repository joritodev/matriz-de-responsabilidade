import { reminderBatchItems, reminderBatches } from '../src/db/schema';
import { AUTH, startTestApp, type TestApp } from './helpers';

const MATHEUS_TASK_DUE_20 = '30000000-0000-0000-0000-000000000102';
const RAFAEL_TASK = '30000000-0000-0000-0000-000000000302';
const EVENTOS_TASK = '30000000-0000-0000-0000-000000000401';
const JOAO = '20000000-0000-0000-0000-000000000005';

describe('janela de itens e telas de lista (integração)', () => {
  let t: TestApp;
  beforeEach(async () => {
    t = await startTestApp();
  });
  afterEach(async () => {
    await t.close();
  });

  it('a régua da visão geral mostra os estados de cobrança do seed', async () => {
    const { body } = await t.http().get('/v1/overview').set(AUTH).expect(200);
    const geral = body.ruler.groups.find((g: { slug: string }) => g.slug === 'geral');
    const matheus = geral.rows.find((r: { taskId: string }) => r.taskId === MATHEUS_TASK_DUE_20);
    expect(matheus).toMatchObject({ early: 'sent', due: 'sent' });
    const pos = body.ruler.groups.find((g: { slug: string }) => g.slug === 'pos-graduacao');
    const rafael = pos.rows.find((r: { taskId: string }) => r.taskId === RAFAEL_TASK);
    expect(rafael).toMatchObject({ early: 'failed', due: 'planned' });
  });

  it('a prévia do dia seguinte monta os lotes do seed sem errar janela', async () => {
    const { body } = await t.http().get('/v1/reminders/preview').set(AUTH).expect(200);
    expect(body.date).toBe('2026-10-21');
    const matheus = body.batches.find((b: { assignee: { fullName: string } }) => b.assignee.fullName === 'Matheus Araújo');
    expect(matheus).toMatchObject({ channel: 'whatsapp', kind: 'due', retry: false });
    expect(matheus.items.map((i: { taskId: string }) => i.taskId)).toEqual(['30000000-0000-0000-0000-000000000103']);
  });

  it('a lista da pasta mostra cobrança de prazo distante que a janela global deixa de fora', async () => {
    const [batch] = await t.handle.db
      .insert(reminderBatches)
      .values({
        assigneeId: JOAO,
        channel: 'whatsapp',
        recipient: '5511988051342',
        sentOn: '2026-10-16',
        status: 'failed',
        messageBody: '(mensagem de exemplo)',
        errorMessage: 'Número indisponível',
      })
      .returning();
    await t.handle.db.insert(reminderBatchItems).values({
      batchId: batch.id,
      channel: 'whatsapp',
      taskId: EVENTOS_TASK,
      kind: 'early',
      dueDateSnapshot: '2026-11-07',
    });

    const { body } = await t.http().get('/v1/matrices/eventos/tasks').set(AUTH).expect(200);
    const row = body.tasks.find((r: { id: string }) => r.id === EVENTOS_TASK);
    expect(row.reminders).toEqual({ early: 'failed', due: 'planned' });
  });

  it('a lista de pastas continua com contagens e alertas corretos sem itens', async () => {
    const { body } = await t.http().get('/v1/matrices').set(AUTH).expect(200);
    expect(
      body.map((m: { slug: string; openCount: number; doneCount: number; totalCount: number; alert: { kind: string } }) => [
        m.slug,
        m.openCount,
        m.doneCount,
        m.totalCount,
        m.alert.kind,
      ]),
    ).toEqual([
      ['geral', 3, 0, 3, 'overdue'],
      ['od-academy', 4, 2, 6, 'soon'],
      ['pos-graduacao', 3, 0, 3, 'today'],
      ['eventos', 2, 0, 2, 'ok'],
    ]);
  });

  it('a lista de responsáveis calcula próximo prazo sem itens', async () => {
    const { body } = await t.http().get('/v1/assignees').set(AUTH).expect(200);
    const matheus = body.find((a: { fullName: string }) => a.fullName === 'Matheus Araújo');
    expect(matheus).toMatchObject({
      openCount: 3,
      nextDue: { date: '2026-10-20', taskId: MATHEUS_TASK_DUE_20, matrixSlug: 'geral', status: { kind: 'today' } },
    });
    const rafael = body.find((a: { fullName: string }) => a.fullName === 'Rafael Pinheiro');
    expect(rafael).toMatchObject({ openCount: 2, nextDue: { date: '2026-10-23', taskId: RAFAEL_TASK } });
  });

  it('a busca agrupa por pasta sem depender dos itens de cobrança', async () => {
    const { body } = await t.http().get('/v1/search').set(AUTH).query({ q: 'contrato' }).expect(200);
    expect(
      body.groups.map((g: { folder: { slug: string }; tasks: { title: string }[] }) => [
        g.folder.slug,
        g.tasks.map((x) => x.title),
      ]),
    ).toEqual([
      ['geral', ['Revisar contrato de tutoria']],
      ['od-academy', ['Revisar contrato de tutores']],
    ]);
    expect(body.people).toEqual([]);
  });

  it('a busca encontra pessoa e as demandas dela', async () => {
    const { body } = await t.http().get('/v1/search').set(AUTH).query({ q: 'Matheus' }).expect(200);
    expect(body.people.map((p: { fullName: string }) => p.fullName)).toEqual(['Matheus Araújo']);
    expect(body.groups.map((g: { folder: { slug: string } }) => g.folder.slug)).toEqual(['geral', 'od-academy', 'pos-graduacao']);
    const od = body.groups.find((g: { folder: { slug: string } }) => g.folder.slug === 'od-academy');
    expect(od.tasks.map((x: { title: string; taskStatus: string }) => [x.title, x.taskStatus])).toEqual([
      ['Publicar cronograma do semestre', 'done'],
    ]);
  });
});

import {
  addDays,
  buildReminderMessage,
  dueReminderDate,
  dueStatus,
  dueStatusLabel,
  earlyReminderDate,
  planReminders,
  reminderKindFor,
  todayInTimeZone,
  weekday,
  type Calendar,
  type IsoDate,
  type TaskForReminder,
} from './reminder-rules';

// Feriados nacionais usados nos testes (mesmos do seed do banco).
const cal: Calendar = { holidays: new Set(['2026-11-02', '2026-11-20', '2026-12-25', '2027-01-01']) };
const noHolidays: Calendar = { holidays: new Set() };

/** Em quais dias de [from, to] a demanda recebe cada tipo de cobrança, sem reservas. */
function schedule(due: IsoDate, from: IsoDate, to: IsoDate, c: Calendar = cal) {
  const out: Record<string, string> = {};
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const k = reminderKindFor(due, d, c);
    if (k) out[d] = k;
  }
  return out;
}

describe('calendário', () => {
  it('20/10/2026 é terça', () => {
    expect(weekday('2026-10-20')).toBe(2);
  });
  it('hoje é calculado em America/Fortaleza, não em UTC', () => {
    // 01:30 UTC do dia 21 ainda é dia 20 em Fortaleza (UTC-3)
    expect(todayInTimeZone(new Date('2026-10-21T01:30:00Z'))).toBe('2026-10-20');
    expect(todayInTimeZone(new Date('2026-10-21T03:00:00Z'))).toBe('2026-10-21');
  });
});

describe('quando cobrar', () => {
  it('prazo na sexta: antecipada a partir de terça, no dia na sexta', () => {
    expect(earlyReminderDate('2026-10-23', cal)).toBe('2026-10-20');
    expect(schedule('2026-10-23', '2026-10-16', '2026-10-26')).toEqual({
      '2026-10-20': 'early',
      '2026-10-21': 'early',
      '2026-10-22': 'early',
      '2026-10-23': 'due',
    });
  });

  it('nunca cobra com 4 dias ou mais de antecedência num caso comum', () => {
    expect(reminderKindFor('2026-10-23', '2026-10-19', cal)).toBeNull();
  });

  it('nunca cobra depois do prazo', () => {
    expect(reminderKindFor('2026-10-20', '2026-10-21', cal)).toBeNull();
    expect(reminderKindFor('2026-10-20', '2026-10-26', cal)).toBeNull();
  });

  it('prazo na terça: D-3 e D-2 caem no fim de semana, antecipada na segunda', () => {
    expect(schedule('2026-10-20', '2026-10-14', '2026-10-21')).toEqual({ '2026-10-19': 'early', '2026-10-20': 'due' });
  });

  it('prazo na segunda: antecipada na sexta anterior (D-3)', () => {
    expect(schedule('2026-10-26', '2026-10-20', '2026-10-27')).toEqual({ '2026-10-23': 'early', '2026-10-26': 'due' });
  });

  it('prazo no domingo: cobrança "no dia" sai na sexta, antecipada na quinta', () => {
    expect(dueReminderDate('2026-10-18', cal)).toBe('2026-10-16');
    expect(schedule('2026-10-18', '2026-10-12', '2026-10-19')).toEqual({ '2026-10-15': 'early', '2026-10-16': 'due' });
  });

  it('prazo no sábado: no dia na sexta, antecipada de quarta a quinta', () => {
    expect(schedule('2026-10-24', '2026-10-19', '2026-10-26')).toEqual({
      '2026-10-21': 'early',
      '2026-10-22': 'early',
      '2026-10-23': 'due',
    });
  });

  it('prazo em feriado na segunda (02/11): no dia na sexta 30/10, antecipada na quinta 29/10', () => {
    expect(dueReminderDate('2026-11-02', cal)).toBe('2026-10-30');
    expect(schedule('2026-11-02', '2026-10-26', '2026-11-03')).toEqual({ '2026-10-29': 'early', '2026-10-30': 'due' });
  });

  it('prazo na terça depois do feriado: antecipada recua para a sexta (D-4), nunca além de D-5', () => {
    expect(earlyReminderDate('2026-11-03', cal)).toBe('2026-10-30');
    expect(schedule('2026-11-03', '2026-10-26', '2026-11-04')).toEqual({ '2026-10-30': 'early', '2026-11-03': 'due' });
  });

  it('sem feriado cadastrado, a mesma terça usa a segunda normalmente', () => {
    expect(earlyReminderDate('2026-11-03', noHolidays)).toBe('2026-11-02');
  });

  it('virada de ano: prazo 01/01 (feriado) cobra no dia em 31/12 e antecipada em 29/12', () => {
    expect(schedule('2027-01-01', '2026-12-24', '2027-01-04')).toEqual({
      '2026-12-29': 'early',
      '2026-12-30': 'early',
      '2026-12-31': 'due',
    });
  });

  it('não roda em fim de semana nem feriado', () => {
    expect(reminderKindFor('2026-10-26', '2026-10-24', cal)).toBeNull();
    expect(reminderKindFor('2026-11-03', '2026-11-02', cal)).toBeNull();
  });
});

const assignee = (id: string, fullName: string, over: Partial<TaskForReminder['assignee']> = {}): TaskForReminder['assignee'] => ({
  id,
  fullName,
  whatsappE164: '5511999990000',
  email: `${id}@exemplo.com.br`,
  channel: 'whatsapp',
  isActive: true,
  ...over,
});
const larissa = assignee('lm', 'Larissa Menezes');
const matheus = assignee('ma', 'Matheus Araújo');
const task = (id: string, title: string, dueDate: IsoDate, a = larissa, over: Partial<TaskForReminder> = {}): TaskForReminder => ({
  id,
  title,
  dueDate,
  status: 'pending',
  matrixName: 'OD Academy',
  matrixPosition: 1,
  position: Number(id.replace(/\D/g, '')) || 0,
  assignee: a,
  ...over,
});

describe('planejamento do dia', () => {
  const today = '2026-10-20';

  it('agrupa por pessoa: uma mensagem por pessoa e canal', () => {
    const plan = planReminders({
      today,
      calendar: cal,
      activeReservations: [],
      tasks: [task('t1', 'Atualizar ementa', '2026-10-23'), task('t2', 'Revisar banco de questões', '2026-10-22')],
    });
    expect(plan.batches).toHaveLength(1);
    expect(plan.batches[0].items.map((i) => i.title)).toEqual(['Revisar banco de questões', 'Atualizar ementa']);
  });

  it('no máximo uma cobrança por demanda por dia, mesmo rodando duas vezes', () => {
    const tasks = [task('t1', 'Atualizar ementa', '2026-10-23')];
    const first = planReminders({ today, calendar: cal, activeReservations: [], tasks });
    const reservations = first.batches.flatMap((b) => b.items.map((i) => ({ taskId: i.taskId, kind: i.kind, dueDateSnapshot: i.dueDateSnapshot, channel: b.channel })));
    const second = planReminders({ today, calendar: cal, activeReservations: reservations, tasks });
    expect(first.batches).toHaveLength(1);
    expect(second.batches).toHaveLength(0);
  });

  it('antecipada já enviada não repete nos dias seguintes; a cobrança no dia ainda sai', () => {
    const tasks = [task('t1', 'Atualizar ementa', '2026-10-23')];
    const reservations = [{ taskId: 't1', kind: 'early' as const, dueDateSnapshot: '2026-10-23', channel: 'whatsapp' as const }];
    expect(planReminders({ today: '2026-10-21', calendar: cal, activeReservations: reservations, tasks }).batches).toHaveLength(0);
    expect(planReminders({ today: '2026-10-22', calendar: cal, activeReservations: reservations, tasks }).batches).toHaveLength(0);
    const dueDay = planReminders({ today: '2026-10-23', calendar: cal, activeReservations: reservations, tasks });
    expect(dueDay.batches[0].items[0].kind).toBe('due');
  });

  it('envio que falhou (reserva desativada) volta no próximo dia útil dentro da janela', () => {
    const tasks = [task('t1', 'Divulgar calendário da Pós', '2026-10-23')];
    // reserva com is_active = false não é passada como ativa
    const retry = planReminders({ today: '2026-10-21', calendar: cal, activeReservations: [], tasks });
    expect(retry.batches[0].items[0].kind).toBe('early');
  });

  it('prorrogação: o prazo novo libera as duas cobranças de novo', () => {
    const reservations = [
      { taskId: 't1', kind: 'early' as const, dueDateSnapshot: '2026-10-23', channel: 'whatsapp' as const },
    ];
    const prorrogada = [task('t1', 'Atualizar ementa', '2026-10-30')];
    expect(planReminders({ today: '2026-10-23', calendar: cal, activeReservations: reservations, tasks: prorrogada }).batches).toHaveLength(0);
    const early = planReminders({ today: '2026-10-27', calendar: cal, activeReservations: reservations, tasks: prorrogada });
    expect(early.batches[0].items[0]).toMatchObject({ kind: 'early', dueDateSnapshot: '2026-10-30' });
  });

  it('demandas concluídas ou canceladas não são cobradas', () => {
    const plan = planReminders({
      today,
      calendar: cal,
      activeReservations: [],
      tasks: [task('t1', 'A', '2026-10-20', larissa, { status: 'done' }), task('t2', 'B', '2026-10-20', larissa, { status: 'canceled' })],
    });
    expect(plan.batches).toHaveLength(0);
  });

  it('responsável inativo ou sem contato vira aviso, não envio', () => {
    const plan = planReminders({
      today,
      calendar: cal,
      activeReservations: [],
      tasks: [
        task('t1', 'A', '2026-10-20', assignee('x', 'Pessoa Inativa', { isActive: false })),
        task('t2', 'B', '2026-10-20', assignee('y', 'Sem Whats', { whatsappE164: null })),
      ],
    });
    expect(plan.batches).toHaveLength(0);
    expect(plan.skipped.map((s) => s.reason).sort()).toEqual(['assignee_inactive', 'missing_whatsapp']);
  });

  it('canal "os dois" gera uma mensagem por canal, com reservas independentes', () => {
    const joao = assignee('jv', 'João Victor Lima', { channel: 'both' });
    const tasks = [task('t1', 'Gravar aula inaugural', '2026-10-23', joao)];
    const plan = planReminders({ today, calendar: cal, activeReservations: [], tasks });
    expect(plan.batches.map((b) => b.channel)).toEqual(['email', 'whatsapp']);
    const onlyEmailFailed = planReminders({
      today: '2026-10-21',
      calendar: cal,
      activeReservations: [{ taskId: 't1', kind: 'early', dueDateSnapshot: '2026-10-23', channel: 'whatsapp' }],
      tasks,
    });
    expect(onlyEmailFailed.batches.map((b) => b.channel)).toEqual(['email']);
  });

  it('cenário das telas em 20/10: Matheus, Bianca e Larissa recebem; Rafael também (antes de falhar)', () => {
    const bianca = assignee('bt', 'Bianca Torres');
    const rafael = assignee('rp', 'Rafael Pinheiro', { channel: 'email' });
    const plan = planReminders({
      today,
      calendar: cal,
      activeReservations: [
        { taskId: 'g2', kind: 'early', dueDateSnapshot: '2026-10-20', channel: 'whatsapp' },
        { taskId: 'g3', kind: 'early', dueDateSnapshot: '2026-10-21', channel: 'whatsapp' },
        { taskId: 'o1', kind: 'early', dueDateSnapshot: '2026-10-22', channel: 'whatsapp' },
        { taskId: 'p1', kind: 'early', dueDateSnapshot: '2026-10-20', channel: 'whatsapp' },
      ],
      tasks: [
        task('g1', 'Enviar relatório de matrículas', '2026-10-18', bianca),
        task('g2', 'Atualizar a Assinatura Suprema no Site', '2026-10-20', matheus),
        task('g3', 'Revisar contrato de tutoria', '2026-10-21', matheus),
        task('o1', 'Revisar banco de questões', '2026-10-22'),
        task('o2', 'Atualizar ementa', '2026-10-23'),
        task('o3', 'Gravar aula inaugural', '2026-10-26', assignee('jv', 'João Victor Lima')),
        task('p1', 'Fechar lista de presença do módulo 3', '2026-10-20', bianca),
        task('p2', 'Divulgar calendário da Pós', '2026-10-23', rafael),
        task('p3', 'Efetuar os pagamentos da Pós de outubro', '2026-10-27', matheus),
      ],
    });
    const summary = plan.batches.map((b) => `${b.assigneeName}:${b.items.map((i) => `${i.taskId}/${i.kind}`).join(',')}`);
    expect(summary).toEqual([
      'Bianca Torres:p1/due',
      'Larissa Menezes:o2/early',
      'Matheus Araújo:g2/due',
      'Rafael Pinheiro:p2/early',
    ]);
  });
});

describe('mensagem', () => {
  const today = '2026-10-20';
  it('antecipada com duas demandas, no formato combinado', () => {
    const { body, subject } = buildReminderMessage({
      assigneeName: 'Larissa Menezes',
      today,
      channel: 'whatsapp',
      items: [
        { taskId: 'o1', kind: 'early', dueDateSnapshot: '2026-10-22', title: 'Revisar banco de questões', matrixName: 'OD Academy' },
        { taskId: 'o2', kind: 'early', dueDateSnapshot: '2026-10-23', title: 'Atualizar ementa', matrixName: 'OD Academy' },
      ],
    });
    expect(subject).toBeNull();
    expect(body).toBe(
      [
        'Bom dia, Larissa. Como está o andamento destas demandas?',
        '*Demanda 1*\nMatriz: OD Academy\nDemanda: Revisar banco de questões\nResponsável: Larissa Menezes\nDeadline: 22/10 (quinta)',
        '*Demanda 2*\nMatriz: OD Academy\nDemanda: Atualizar ementa\nResponsável: Larissa Menezes\nDeadline: 23/10 (sexta)',
        'Se for necessário prorrogar alguma, por favor avise para quando e o motivo.',
      ].join('\n\n'),
    );
  });

  it('no dia, uma demanda, por e-mail com assunto', () => {
    const { body, subject } = buildReminderMessage({
      assigneeName: 'Matheus Araújo',
      today,
      channel: 'email',
      items: [{ taskId: 'g2', kind: 'due', dueDateSnapshot: '2026-10-20', title: 'Atualizar a Assinatura Suprema no Site', matrixName: 'Geral' }],
    });
    expect(subject).toBe('Prazo de hoje: Atualizar a Assinatura Suprema no Site');
    expect(body.startsWith('Bom dia, Matheus. Hoje é o prazo desta demanda:')).toBe(true);
    expect(body).toContain('Demanda 1\nMatriz: Geral');
    expect(body).toContain('Deadline: hoje, 20/10');
    expect(body.endsWith('Está tudo certo para a entrega? Se for necessário prorrogar, por favor avise para quando e o motivo.')).toBe(true);
  });

  it('mistura de no dia e antecipada avisa o que vence hoje', () => {
    const { body, subject } = buildReminderMessage({
      assigneeName: 'Matheus Araújo',
      today,
      channel: 'email',
      items: [
        { taskId: 'a', kind: 'due', dueDateSnapshot: '2026-10-20', title: 'A', matrixName: 'Geral' },
        { taskId: 'b', kind: 'early', dueDateSnapshot: '2026-10-23', title: 'B', matrixName: 'Geral' },
      ],
    });
    expect(body.split('\n')[0]).toBe('Bom dia, Matheus. Como está o andamento destas demandas? A primeira vence hoje.');
    expect(subject).toBe('Andamento de 2 demandas, prazos até 23/10');
  });
});

describe('situação na interface', () => {
  const today = '2026-10-20';
  it('rótulos', () => {
    expect(dueStatusLabel(dueStatus({ dueDate: '2026-10-18', status: 'pending' }, today))).toBe('atrasada 2 dias');
    expect(dueStatusLabel(dueStatus({ dueDate: '2026-10-20', status: 'pending' }, today))).toBe('hoje');
    expect(dueStatusLabel(dueStatus({ dueDate: '2026-10-23', status: 'pending' }, today))).toBe('em 3 dias');
    expect(dueStatusLabel(dueStatus({ dueDate: '2026-10-26', status: 'pending' }, today))).toBe('no prazo');
    expect(dueStatusLabel(dueStatus({ dueDate: '2026-10-10', status: 'done' }, today))).toBe('concluída');
  });
});

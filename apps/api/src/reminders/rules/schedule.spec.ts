import type { Calendar } from './reminder-rules';
import {
  businessDaysFrom,
  countWordFem,
  initials,
  joinPt,
  nextBusinessDay,
  normalizeWhatsapp,
  previousBusinessDay,
  reminderState,
  slugify,
  startOfWeek,
} from './schedule';

const cal: Calendar = { holidays: new Set(['2026-11-02', '2026-11-20']) };

describe('dias úteis', () => {
  it('a régua começa no dia útil anterior a hoje e tem 10 dias úteis', () => {
    const start = previousBusinessDay('2026-10-20', cal);
    expect(businessDaysFrom(start, 10, cal)).toEqual([
      '2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23',
      '2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30',
    ]);
  });

  it('pula fim de semana e feriado', () => {
    expect(nextBusinessDay('2026-10-30', cal)).toBe('2026-11-03');
    expect(previousBusinessDay('2026-11-03', cal)).toBe('2026-10-30');
  });

  it('semana começa na segunda', () => {
    expect(startOfWeek('2026-10-20')).toBe('2026-10-19');
    expect(startOfWeek('2026-10-25')).toBe('2026-10-19');
  });
});

describe('estado da cobrança na régua', () => {
  const task = { dueDate: '2026-10-23', status: 'pending' as const };

  it('sem lote: prevista enquanto ainda vai sair', () => {
    expect(reminderState('early', task, [], '2026-10-20', cal)).toBe('planned');
    expect(reminderState('due', task, [], '2026-10-23', cal)).toBe('planned');
    expect(reminderState('early', task, [], '2026-10-23', cal)).toBe('none');
    expect(reminderState('due', task, [], '2026-10-26', cal)).toBe('none');
  });

  it('o lote mais recente do canal vence: falhou e depois enviada', () => {
    const items = [
      { kind: 'early' as const, channel: 'email' as const, dueDateSnapshot: '2026-10-23', batchStatus: 'failed' as const, createdAt: '2026-10-20T11:03:00Z' },
    ];
    expect(reminderState('early', task, items, '2026-10-20', cal)).toBe('failed');
    items.push({ kind: 'early', channel: 'email', dueDateSnapshot: '2026-10-23', batchStatus: 'sent' as never, createdAt: '2026-10-21T11:03:00Z' });
    expect(reminderState('early', task, items, '2026-10-21', cal)).toBe('sent');
  });

  it('reserva de prazo antigo não conta depois da prorrogação', () => {
    const items = [
      { kind: 'early' as const, channel: 'whatsapp' as const, dueDateSnapshot: '2026-10-21', batchStatus: 'sent' as const, createdAt: '2026-10-19T11:00:00Z' },
    ];
    expect(reminderState('early', task, items, '2026-10-20', cal)).toBe('planned');
  });
});

describe('texto e normalização', () => {
  it('iniciais', () => {
    expect(initials('João Victor Lima')).toBe('JV');
    expect(initials('Bianca')).toBe('BI');
  });
  it('WhatsApp com máscara vira dígitos com DDI', () => {
    expect(normalizeWhatsapp('+55 (11) 99812-4470')).toBe('5511998124470');
    expect(normalizeWhatsapp('(11) 99812-4470')).toBe('5511998124470');
    expect(normalizeWhatsapp('123')).toBeNull();
  });
  it('slug sem acento', () => {
    expect(slugify('Pós-graduação')).toBe('pos-graduacao');
    expect(slugify('  OD   Academy ')).toBe('od-academy');
  });
  it('contagens e listas', () => {
    expect(countWordFem(2)).toBe('Duas');
    expect(countWordFem(14)).toBe('14');
    expect(joinPt(['a', 'b', 'c'])).toBe('a, b e c');
  });
});

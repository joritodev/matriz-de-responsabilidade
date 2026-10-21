import { describe, expect, it } from 'vitest';
import { addDays, EARLY_MAX_DAYS } from '../reminders/rules/reminder-rules';
import { itemsDueOnOrBefore } from './snapshot';

describe('janela de itens do snapshot', () => {
  it('anda EARLY_MAX_DAYS + 7 dias a partir do alvo', () => {
    expect(itemsDueOnOrBefore('2026-10-20')).toBe(addDays('2026-10-20', EARLY_MAX_DAYS + 7));
    expect(itemsDueOnOrBefore('2026-10-20')).toBe('2026-11-01');
  });

  it('cruza o fim do ano', () => {
    expect(itemsDueOnOrBefore('2026-12-25')).toBe('2027-01-06');
  });
});

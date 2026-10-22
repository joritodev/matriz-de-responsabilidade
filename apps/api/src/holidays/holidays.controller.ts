import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Post } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { Roles } from '../auth/supabase-auth.guard';
import { conflict, notFound } from '../common/errors';
import { isoDate, parseInput, trimmed } from '../common/validation';
import { DB, pgErrorCode, type Db } from '../db/client';
import { holidays } from '../db/schema';

const createBody = z.object({
  date: isoDate('Informe a data do feriado.'),
  name: trimmed('Informe o nome do feriado.').max(120),
  kind: z.enum(['nacional', 'ponto_facultativo', 'local'], { error: 'Tipo de feriado inválido.' }).default('local'),
});

@Controller('holidays')
export class HolidaysController {
  constructor(@Inject(DB) private readonly db: Db) {}

  @Get()
  list() {
    return this.db.select().from(holidays).orderBy(asc(holidays.date));
  }

  @Post()
  @Roles('admin', 'editor')
  async create(@Body() body: unknown) {
    const input = parseInput(createBody, body);
    try {
      const [row] = await this.db.insert(holidays).values(input).returning();
      return row;
    } catch (err) {
      if (pgErrorCode(err) === '23505') throw conflict('Já existe um feriado nessa data.', 'holiday_exists');
      throw err;
    }
  }

  @Delete(':date')
  @Roles('admin', 'editor')
  @HttpCode(200)
  async remove(@Param('date') date: string) {
    const d = parseInput(isoDate('Data inválida.'), date);
    const rows = await this.db.delete(holidays).where(eq(holidays.date, d)).returning();
    if (rows.length === 0) throw notFound('Feriado não encontrado.', 'holiday_not_found');
    return { date: d, deleted: true };
  }
}

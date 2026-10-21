import { Body, Controller, Get, Inject, Param, Patch, Post } from '@nestjs/common';
import { z } from 'zod';
import { parseInput, trimmed, uuidParam } from '../common/validation';
import { normalizeWhatsapp } from '../reminders/rules/schedule';
import { AssigneesService } from './assignees.service';

const whatsapp = z
  .string()
  .trim()
  .nullable()
  .optional()
  .transform((v, ctx) => {
    if (v === undefined) return undefined;
    if (v === null || v === '') return null;
    const n = normalizeWhatsapp(v);
    if (!n) {
      ctx.addIssue({ code: 'custom', message: 'WhatsApp inválido. Use DDD e número, como +55 (11) 99812-4470.' });
      return z.NEVER;
    }
    return n;
  });

const email = z
  .string()
  .trim()
  .toLowerCase()
  .nullable()
  .optional()
  .transform((v, ctx) => {
    if (v === undefined) return undefined;
    if (v === null || v === '') return null;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) {
      ctx.addIssue({ code: 'custom', message: 'E-mail inválido. Confira o endereço.' });
      return z.NEVER;
    }
    return v;
  });

const channel = z.enum(['whatsapp', 'email', 'both'], { error: 'Escolha WhatsApp, E-mail ou Os dois.' });
const fullName = trimmed('Informe o nome da pessoa.').max(120, 'Use até 120 letras no nome.');

const createBody = z.object({ fullName, whatsapp, email, reminderChannel: channel });
const updateBody = z.object({ fullName: fullName.optional(), whatsapp, email, reminderChannel: channel.optional(), isActive: z.boolean().optional() });

@Controller('assignees')
export class AssigneesController {
  constructor(@Inject(AssigneesService) private readonly service: AssigneesService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Post()
  create(@Body() body: unknown) {
    return this.service.create(parseInput(createBody, body));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: unknown) {
    return this.service.update(parseInput(uuidParam('Responsável inválido.'), id), parseInput(updateBody, body));
  }
}

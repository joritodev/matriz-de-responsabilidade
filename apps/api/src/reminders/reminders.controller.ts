import { Body, Controller, Get, HttpCode, Inject, Param, Post, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { MakeKeyGuard } from '../auth/make-key.guard';
import { MakeRoute, Roles } from '../auth/supabase-auth.guard';
import { isoDate, parseInput, uuidParam } from '../common/validation';
import { RemindersService } from './reminders.service';

const listQuery = z.object({
  from: isoDate('Data inicial inválida.').optional(),
  to: isoDate('Data final inválida.').optional(),
  assigneeId: uuidParam('Responsável inválido.').optional(),
  status: z.enum(['queued', 'taken', 'sent', 'failed'], { error: 'Status inválido.' }).optional(),
});

const resultBody = z
  .object({
    status: z.enum(['taken', 'sent', 'failed'], { error: 'Use status "taken", "sent" ou "failed".' }),
    providerMessageId: z.string().trim().max(500).optional(),
    error: z.string().trim().max(2000).optional(),
    makeExecutionId: z.union([z.string(), z.number()]).transform(String).optional(),
  })
  .refine((b) => b.status !== 'failed' || (b.error && b.error.length > 0), {
    message: 'Informe o erro quando o envio falhar.',
  });

@Controller('reminders')
export class RemindersController {
  constructor(@Inject(RemindersService) private readonly reminders: RemindersService) {}

  @Get('batches')
  list(@Query() query: unknown) {
    return this.reminders.listBatches(parseInput(listQuery, query));
  }

  @Get('preview')
  preview(@Query('date') date?: string) {
    return this.reminders.preview(date ? parseInput(isoDate('Data inválida.'), date) : undefined);
  }

  @Post('dispatch')
  @HttpCode(200)
  @MakeRoute()
  @UseGuards(MakeKeyGuard)
  dispatch() {
    return this.reminders.dispatch();
  }

  @Post('batches/:id/result')
  @HttpCode(200)
  @MakeRoute()
  @UseGuards(MakeKeyGuard)
  result(@Param('id') id: string, @Body() body: unknown) {
    return this.reminders.recordResult(parseInput(uuidParam('Cobrança inválida.'), id), parseInput(resultBody, body));
  }

  @Post('batches/:id/requeue')
  @Roles('admin', 'editor')
  @HttpCode(200)
  requeue(@Param('id') id: string) {
    return this.reminders.requeue(parseInput(uuidParam('Cobrança inválida.'), id));
  }
}

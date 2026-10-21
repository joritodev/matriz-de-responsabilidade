import { Body, Controller, Get, HttpCode, Inject, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { z } from 'zod';
import type { AuthedRequest } from '../auth/supabase-auth.guard';
import { badRequest } from '../common/errors';
import { isoDate, parseInput, trimmed, uuidParam } from '../common/validation';
import { TasksService } from './tasks.service';

const title = trimmed('Escreva o que precisa ser feito.').max(300, 'Use até 300 letras na demanda.');
const optionalText = (max: number, message: string) => z.string().trim().max(max, message).nullable().optional().transform((v) => (v ? v : v === '' ? null : v));
const dueDate = isoDate('Informe um prazo válido, como 23/10.');

const createBody = z.object({
  title,
  assigneeId: uuidParam('Escolha um responsável.'),
  dueDate,
  prerequisiteTaskId: uuidParam('Pré-requisito inválido.').nullable().optional(),
  prerequisiteNote: optionalText(300, 'Use até 300 letras no pré-requisito.'),
  notes: optionalText(2000, 'Use até 2000 letras na observação.'),
});

const updateBody = z
  .object({
    title: title.optional(),
    assigneeId: uuidParam('Escolha um responsável.').optional(),
    notes: optionalText(2000, 'Use até 2000 letras na observação.'),
    prerequisiteTaskId: uuidParam('Pré-requisito inválido.').nullable().optional(),
    prerequisiteNote: optionalText(300, 'Use até 300 letras no pré-requisito.'),
  })
  .strict();

const extendBody = z.object({
  newDueDate: isoDate('Informe o novo prazo, como 30/10.'),
  reason: z.string({ error: 'Explique o motivo da prorrogação.' }).trim().min(3, 'Explique o motivo da prorrogação (pelo menos 3 letras).').max(1000),
  approvedBy: optionalText(120, 'Use até 120 letras em "Aprovado por".'),
});

const correctBody = z.object({
  newDueDate: isoDate('Informe o prazo correto, como 30/10.'),
  reason: optionalText(1000, 'Use até 1000 letras no motivo.'),
});

const reorderBody = z.object({ taskIds: z.array(uuidParam('Demanda inválida.')).min(1, 'Envie a nova ordem.') });
const filterQuery = z.enum(['open', 'done', 'extended'], { error: 'Filtro inválido.' }).default('open');
const id = (v: string) => parseInput(uuidParam('Demanda inválida.'), v);

@Controller()
export class TasksController {
  constructor(@Inject(TasksService) private readonly service: TasksService) {}

  @Get('matrices/:slug/tasks')
  list(@Param('slug') slug: string, @Query('filter') filter?: string) {
    return this.service.listForMatrix(slug, parseInput(filterQuery, filter));
  }

  @Post('matrices/:id/tasks')
  create(@Param('id') matrixId: string, @Body() body: unknown) {
    return this.service.create(parseInput(uuidParam('Pasta inválida.'), matrixId), parseInput(createBody, body));
  }

  @Post('matrices/:id/tasks/reorder')
  @HttpCode(200)
  reorder(@Param('id') matrixId: string, @Body() body: unknown) {
    return this.service.reorder(parseInput(uuidParam('Pasta inválida.'), matrixId), parseInput(reorderBody, body).taskIds);
  }

  @Patch('tasks/:id')
  update(@Param('id') taskId: string, @Body() body: unknown) {
    if (body && typeof body === 'object' && 'dueDate' in body) {
      throw badRequest('O prazo só muda por prorrogação ou correção.', 'due_date_not_editable');
    }
    return this.service.update(id(taskId), parseInput(updateBody, body));
  }

  @Post('tasks/:id/extend')
  @HttpCode(200)
  extend(@Param('id') taskId: string, @Body() body: unknown, @Req() req: AuthedRequest) {
    return this.service.changeDueDate(id(taskId), 'extension', parseInput(extendBody, body), req.user!.email);
  }

  @Post('tasks/:id/correct-due-date')
  @HttpCode(200)
  correct(@Param('id') taskId: string, @Body() body: unknown, @Req() req: AuthedRequest) {
    return this.service.changeDueDate(id(taskId), 'correction', parseInput(correctBody, body), req.user!.email);
  }

  @Post('tasks/:id/complete')
  @HttpCode(200)
  complete(@Param('id') taskId: string) {
    return this.service.setStatus(id(taskId), 'complete');
  }

  @Post('tasks/:id/reopen')
  @HttpCode(200)
  reopen(@Param('id') taskId: string) {
    return this.service.setStatus(id(taskId), 'reopen');
  }

  @Post('tasks/:id/cancel')
  @HttpCode(200)
  cancel(@Param('id') taskId: string) {
    return this.service.setStatus(id(taskId), 'cancel');
  }

  @Get('tasks/:id/history')
  history(@Param('id') taskId: string) {
    return this.service.history(id(taskId));
  }

  @Get('search')
  search(@Query('q') q?: string) {
    const query = (q ?? '').trim();
    if (query.length < 2) throw badRequest('Digite pelo menos 2 letras para buscar.', 'query_too_short');
    return this.service.search(query);
  }
}

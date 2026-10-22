import { Body, Controller, Get, Inject, Param, Patch, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import { Roles } from '../auth/supabase-auth.guard';
import { parseInput, trimmed, uuidParam } from '../common/validation';
import { FOLDER_COLORS } from '../db/schema';
import { MatricesService } from './matrices.service';

const color = z.enum(FOLDER_COLORS, { error: 'Escolha uma das 8 cores.' });
const name = trimmed('Dê um nome para a pasta.').max(60, 'Use até 60 letras no nome.');
const description = z.string().trim().max(500, 'Use até 500 letras na descrição.').nullable().optional();

const createBody = z.object({ name, color, description });
const updateBody = z.object({ name: name.optional(), color: color.optional(), description, isArchived: z.boolean().optional() });
const reorderBody = z.object({ ids: z.array(uuidParam('Pasta inválida.'), { error: 'Envie a lista de pastas.' }).min(1) });

@Controller('matrices')
export class MatricesController {
  constructor(@Inject(MatricesService) private readonly service: MatricesService) {}

  @Get()
  list(@Query('includeArchived') includeArchived?: string) {
    return this.service.list(includeArchived === 'true');
  }

  @Post()
  @Roles('admin', 'editor')
  create(@Body() body: unknown) {
    return this.service.create(parseInput(createBody, body));
  }

  @Post('reorder')
  @Roles('admin', 'editor')
  reorder(@Body() body: unknown) {
    return this.service.reorder(parseInput(reorderBody, body).ids);
  }

  @Patch(':id')
  @Roles('admin', 'editor')
  update(@Param('id') id: string, @Body() body: unknown) {
    return this.service.update(parseInput(uuidParam('Pasta inválida.'), id), parseInput(updateBody, body));
  }
}

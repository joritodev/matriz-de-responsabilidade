import { z } from 'zod';
import { badRequest } from './errors';

export function parseInput<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
  const isObject = schema instanceof z.ZodObject || schema instanceof z.ZodPipe;
  const result = schema.safeParse(input === undefined && isObject ? {} : input);
  if (!result.success) {
    const issue = result.error.issues[0];
    const message = issue?.message && !issue.message.startsWith('Invalid') ? issue.message : 'Confira os campos e tente de novo.';
    throw badRequest(message, 'invalid_input');
  }
  return result.data;
}

export const isoDate = (message = 'Use uma data válida no formato AAAA-MM-DD.') =>
  z
    .string({ error: message })
    .regex(/^\d{4}-\d{2}-\d{2}$/, message)
    .refine((d) => !Number.isNaN(Date.parse(`${d}T00:00:00Z`)) && new Date(`${d}T00:00:00Z`).toISOString().startsWith(d), message);

// z.guid aceita qualquer UUID no formato 8-4-4-4-12 (os ids do seed não seguem a versão RFC).
export const uuidParam = (message = 'Identificador inválido.') => z.guid(message);

export const trimmed = (message: string) => z.string({ error: message }).trim().min(1, message);

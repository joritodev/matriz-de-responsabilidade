import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../common/errors';
import type { Db } from '../db/client';
import { SupabaseAuthGuard, REQUIRED_ROLES } from './supabase-auth.guard';

const MEMBRO = 'pessoa@prazo.local';

function dbComMembros(rows: { email: string; role: 'admin' | 'editor' | 'viewer' }[]) {
  let consultas = 0;
  const db = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => {
            consultas += 1;
            return rows;
          },
        }),
      }),
    }),
  };
  return { db: db as unknown as Db, consultas: () => consultas };
}

const reqCom = (token?: string) => ({ headers: token ? { authorization: `Bearer ${token}` } : {} });

const ctxDe = (req: unknown): ExecutionContext =>
  ({
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => req }),
  }) as unknown as ExecutionContext;

const reflectorComum = { getAllAndOverride: () => undefined } as unknown as Reflector;
const reflectorMake = { getAllAndOverride: () => true } as unknown as Reflector;
const reflectorRoles = {
  getAllAndOverride: (key: string) => (key === REQUIRED_ROLES ? (['admin', 'editor'] as Array<'admin' | 'editor'>) : undefined),
} as unknown as Reflector;

const erroDe = (p: Promise<unknown>) => p.then(() => null, (e: unknown) => e);

describe('cache do guard Supabase', () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;

  beforeAll(() => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_PUBLISHABLE_KEY;
  });

  afterAll(() => {
    if (url === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = url;
    if (key === undefined) delete process.env.SUPABASE_PUBLISHABLE_KEY;
    else process.env.SUPABASE_PUBLISHABLE_KEY = key;
    vi.useRealTimers();
  });

  it('segunda requisição com o mesmo token não consulta membros de novo', async () => {
    const { db, consultas } = dbComMembros([{ email: MEMBRO, role: 'admin' }]);
    const guard = new SupabaseAuthGuard(db, reflectorComum);
    const req = reqCom(`dev:${MEMBRO}`);
    expect(await guard.canActivate(ctxDe(req))).toBe(true);
    expect(req).toHaveProperty('user', { email: MEMBRO, role: 'admin' });
    expect(await guard.canActivate(ctxDe(req))).toBe(true);
    expect(consultas()).toBe(1);
  });

  it('quem não é membro é recusado e não entra no cache', async () => {
    const { db, consultas } = dbComMembros([]);
    const guard = new SupabaseAuthGuard(db, reflectorComum);
    const req = reqCom('dev:alguem@fora.com');
    const primeira = await erroDe(guard.canActivate(ctxDe(req)));
    expect(primeira).toBeInstanceOf(ApiError);
    expect((primeira as ApiError).getStatus()).toBe(403);
    expect((primeira as ApiError).getResponse()).toMatchObject({ code: 'not_member' });
    const segunda = await erroDe(guard.canActivate(ctxDe(req)));
    expect(segunda).toBeInstanceOf(ApiError);
    expect(consultas()).toBe(2);
  });

  it('token que não vira e-mail não consulta o banco nem cacheia', async () => {
    const { db, consultas } = dbComMembros([{ email: MEMBRO, role: 'admin' }]);
    const guard = new SupabaseAuthGuard(db, reflectorComum);
    const erro = await erroDe(guard.canActivate(ctxDe(reqCom('dev:sem-arroba'))));
    expect(erro).toBeInstanceOf(ApiError);
    expect((erro as ApiError).getStatus()).toBe(401);
    expect((erro as ApiError).getResponse()).toMatchObject({ code: 'invalid_token' });
    await erroDe(guard.canActivate(ctxDe(reqCom('dev:sem-arroba'))));
    expect(consultas()).toBe(0);
  });

  it('sem cabeçalho Authorization recusa na hora', async () => {
    const { db, consultas } = dbComMembros([{ email: MEMBRO, role: 'admin' }]);
    const guard = new SupabaseAuthGuard(db, reflectorComum);
    const erro = await erroDe(guard.canActivate(ctxDe(reqCom())));
    expect(erro).toBeInstanceOf(ApiError);
    expect((erro as ApiError).getResponse()).toMatchObject({ code: 'unauthorized' });
    expect(consultas()).toBe(0);
  });

  it('cache vale por 60 s e depois membros é consultado de novo', async () => {
    vi.useFakeTimers();
    try {
      const { db, consultas } = dbComMembros([{ email: MEMBRO, role: 'editor' }]);
      const guard = new SupabaseAuthGuard(db, reflectorComum);
      const req = reqCom(`dev:${MEMBRO}`);
      await guard.canActivate(ctxDe(req));
      vi.advanceTimersByTime(59_000);
      await guard.canActivate(ctxDe(req));
      expect(consultas()).toBe(1);
      vi.advanceTimersByTime(2_000);
      await guard.canActivate(ctxDe(req));
      expect(consultas()).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('gravar um token novo varre os expirados do cache', async () => {
    vi.useFakeTimers();
    try {
      const { db, consultas } = dbComMembros([
        { email: MEMBRO, role: 'admin' },
        { email: 'outra@prazo.local', role: 'viewer' },
      ]);
      const guard = new SupabaseAuthGuard(db, reflectorComum);
      await guard.canActivate(ctxDe(reqCom(`dev:${MEMBRO}`)));
      vi.advanceTimersByTime(61_000);
      await guard.canActivate(ctxDe(reqCom('dev:outra@prazo.local')));
      expect(consultas()).toBe(2);
      await guard.canActivate(ctxDe(reqCom(`dev:${MEMBRO}`)));
      expect(consultas()).toBe(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it('rota do Make passa direto sem consultar membros', async () => {
    const { db, consultas } = dbComMembros([{ email: MEMBRO, role: 'admin' }]);
    const guard = new SupabaseAuthGuard(db, reflectorMake);
    expect(await guard.canActivate(ctxDe(reqCom()))).toBe(true);
    expect(consultas()).toBe(0);
  });

  it('viewer numa rota com @Roles recebe 403 read_only, mesmo vindo do cache', async () => {
    const { db } = dbComMembros([{ email: MEMBRO, role: 'viewer' }]);
    const guard = new SupabaseAuthGuard(db, reflectorRoles);
    const req = reqCom(`dev:${MEMBRO}`);
    const primeira = await erroDe(guard.canActivate(ctxDe(req)));
    expect(primeira).toBeInstanceOf(ApiError);
    expect((primeira as ApiError).getStatus()).toBe(403);
    expect((primeira as ApiError).getResponse()).toMatchObject({ code: 'read_only', message: 'Seu acesso é só de leitura.' });
    const segunda = await erroDe(guard.canActivate(ctxDe(req)));
    expect((segunda as ApiError).getResponse()).toMatchObject({ code: 'read_only' });
  });

  it('admin e editor passam pelo @Roles', async () => {
    for (const role of ['admin', 'editor'] as const) {
      const { db } = dbComMembros([{ email: MEMBRO, role }]);
      const guard = new SupabaseAuthGuard(db, reflectorRoles);
      expect(await guard.canActivate(ctxDe(reqCom(`dev:${MEMBRO}`)))).toBe(true);
    }
  });
});

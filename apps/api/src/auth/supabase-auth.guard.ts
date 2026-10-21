import { CanActivate, ExecutionContext, Inject, Injectable, Logger, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { eq } from 'drizzle-orm';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Request } from 'express';
import { DB, type Db } from '../db/client';
import { members } from '../db/schema';
import { ApiError } from '../common/errors';

export interface AuthUser {
  email: string;
  role: 'admin' | 'editor' | 'viewer';
}

export type AuthedRequest = Request & { user?: AuthUser };

export const IS_MAKE_ROUTE = 'prazo:isMakeRoute';
/** Marca rotas chamadas pelo Make: usam `x-api-key` em vez do login. */
export const MakeRoute = () => SetMetadata(IS_MAKE_ROUTE, true);

export const DEV_TOKEN_PREFIX = 'dev:';

/**
 * Valida `Authorization: Bearer <access token do Supabase>` com `auth.getClaims`
 * e exige o e-mail em `members`.
 * Sem SUPABASE_URL (só fora de produção) aceita o token local `dev:<email>`.
 */
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly logger = new Logger('Auth');
  private readonly supabase: SupabaseClient | null;
  private readonly devMode: boolean;

  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(Reflector) private readonly reflector: Reflector,
  ) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    this.supabase = url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
    this.devMode = !this.supabase && process.env.NODE_ENV !== 'production';
    if (this.devMode) this.logger.warn('Supabase não configurado: login local (token dev:<email>) ativo.');
  }

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(IS_MAKE_ROUTE, [ctx.getHandler(), ctx.getClass()])) return true;
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (!token) throw new ApiError(401, 'Faça login para continuar.', 'unauthorized');

    const email = await this.emailFromToken(token);
    if (!email) throw new ApiError(401, 'Sua sessão expirou. Entre de novo.', 'invalid_token');

    const [member] = await this.db.select().from(members).where(eq(members.email, email.toLowerCase())).limit(1);
    if (!member) throw new ApiError(403, 'Seu acesso ainda não foi liberado.', 'not_member');
    req.user = { email: member.email, role: member.role };
    return true;
  }

  private async emailFromToken(token: string): Promise<string | null> {
    if (this.supabase) {
      const { data, error } = await this.supabase.auth.getClaims(token);
      if (error || !data?.claims) return null;
      const email = (data.claims as { email?: unknown }).email;
      return typeof email === 'string' ? email : null;
    }
    if (this.devMode && token.startsWith(DEV_TOKEN_PREFIX)) {
      const email = token.slice(DEV_TOKEN_PREFIX.length).trim();
      return email.includes('@') ? email : null;
    }
    return null;
  }
}

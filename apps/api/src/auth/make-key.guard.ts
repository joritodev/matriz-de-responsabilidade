import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { ApiError } from '../common/errors';

const DEV_MAKE_KEY = 'prazo-local-make-key';

/** Rotas do Make: cabeçalho `x-api-key` comparado com MAKE_API_KEY em tempo constante. */
@Injectable()
export class MakeKeyGuard implements CanActivate {
  private readonly logger = new Logger('MakeKey');
  private readonly expected: Buffer;

  constructor() {
    const key = process.env.MAKE_API_KEY;
    if (!key && process.env.NODE_ENV === 'production') throw new Error('MAKE_API_KEY é obrigatório em produção.');
    if (!key) this.logger.warn(`MAKE_API_KEY não definido: usando a chave local "${DEV_MAKE_KEY}".`);
    this.expected = Buffer.from(key ?? DEV_MAKE_KEY);
  }

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();
    const raw = req.headers['x-api-key'];
    const given = Buffer.from(typeof raw === 'string' ? raw : '');
    if (given.length !== this.expected.length || !timingSafeEqual(given, this.expected)) {
      throw new ApiError(401, 'Chave da API inválida.', 'invalid_api_key');
    }
    return true;
  }
}

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

export class ApiError extends HttpException {
  constructor(status: number, message: string, code: string) {
    super({ message, code }, status);
  }
}

export const badRequest = (message: string, code = 'invalid_input') => new ApiError(HttpStatus.BAD_REQUEST, message, code);
export const notFound = (message: string, code = 'not_found') => new ApiError(HttpStatus.NOT_FOUND, message, code);
export const conflict = (message: string, code = 'conflict') => new ApiError(HttpStatus.CONFLICT, message, code);

/** Todas as respostas de erro saem como `{ message, code }`, com texto em português para a tela. */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ApiError');

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'object' && body && 'code' in body && 'message' in body) {
        res.status(status).json({ message: (body as { message: unknown }).message, code: (body as { code: unknown }).code });
        return;
      }
      const fallback: Record<number, [string, string]> = {
        400: ['Pedido inválido.', 'invalid_input'],
        401: ['Faça login para continuar.', 'unauthorized'],
        403: ['Você não tem acesso a esta ação.', 'forbidden'],
        404: ['Não encontrado.', 'not_found'],
      };
      const [message, code] = fallback[status] ?? ['Algo deu errado. Tente de novo.', 'error'];
      res.status(status).json({ message, code });
      return;
    }
    this.logger.error(exception instanceof Error ? exception.stack ?? exception.message : String(exception));
    res.status(500).json({ message: 'Algo deu errado do nosso lado. Tente de novo em instantes.', code: 'internal_error' });
  }
}

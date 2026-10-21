import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from './app.module';
import type { DbHandle } from './db/client';

if (existsSync('.env')) process.loadEnvFile('.env');

export function configureApp(app: INestApplication) {
  app.setGlobalPrefix('v1');
  const origins = (process.env.WEB_ORIGIN ?? 'http://localhost:4317,http://127.0.0.1:4317')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({ origin: origins, allowedHeaders: ['Authorization', 'Content-Type', 'x-api-key'] });
  return app;
}

export async function createApp(handle?: DbHandle) {
  const app = await NestFactory.create(AppModule.forRoot(handle), { logger: ['error', 'warn', 'log'] });
  return configureApp(app);
}

async function bootstrap() {
  const app = await createApp();
  await app.listen(process.env.PORT ?? 3000, process.env.HOST ?? '0.0.0.0');
}

if (require.main === module || process.env.VERCEL) {
  void bootstrap();
}

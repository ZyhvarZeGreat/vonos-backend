import { NestFactory } from '@nestjs/core';
import compression from 'compression';
import type { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Express } from 'express';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { resolveWebOrigins } from './common/utils/webOrigin';

/** Product image uploads + large JSON (Express default is 100kb → "entity too large"). */
const BODY_LIMIT = '15mb';

/** Load apps/api/.env into process.env when keys are unset (local nest start). */
function loadLocalEnvFile(): void {
  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) return;
  try {
    const text = readFileSync(envPath, 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    /* ignore */
  }
}

loadLocalEnvFile();

async function createNestApp(): Promise<INestApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useBodyParser('json', { limit: BODY_LIMIT });
  app.useBodyParser('urlencoded', { limit: BODY_LIMIT, extended: true });
  app.enableShutdownHooks();
  app.use(compression());
  app.use(cookieParser());
  app.enableCors({
    origin: resolveWebOrigins(),
    credentials: true,
  });
  app.useGlobalFilters(new AllExceptionsFilter());
  await app.init();
  return app;
}

export async function getExpressApp(): Promise<Express> {
  const app = await createNestApp();
  return app.getHttpAdapter().getInstance() as Express;
}

export async function bootstrap(): Promise<void> {
  const app = await createNestApp();
  const port = Number(process.env.PORT ?? 3001);
  const host = process.env.HOST ?? '0.0.0.0';
  await app.listen(port, host);
}

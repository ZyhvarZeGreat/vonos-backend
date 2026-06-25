import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import express from 'express';
import { AppModule } from './app.module';

function resolveWebOrigin(): string {
  if (process.env.WEB_ORIGIN) {
    return process.env.WEB_ORIGIN;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'http://localhost:3000';
}

export async function getExpressApp(): Promise<express.Express> {
  const expressApp = express();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp));
  app.use(cookieParser());
  app.enableCors({
    origin: resolveWebOrigin(),
    credentials: true,
  });
  await app.init();
  return expressApp;
}

export async function bootstrap(): Promise<void> {
  const expressApp = await getExpressApp();
  const port = Number(process.env.PORT ?? 3001);
  await new Promise<void>((resolve) => {
    expressApp.listen(port, () => resolve());
  });
}

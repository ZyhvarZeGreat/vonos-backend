import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { Express } from 'express';

let appPromise: Promise<Express> | null = null;

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<unknown> {
  if (!appPromise) {
    const { getExpressApp } = await import('../apps/api/dist/bootstrap.js');
    appPromise = getExpressApp();
  }
  const expressApp = await appPromise;
  return expressApp(req, res);
}

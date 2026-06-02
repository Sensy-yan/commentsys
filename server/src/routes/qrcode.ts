import { Hono } from 'hono';
import type { Env, Variables } from '../types.js';
import { authMiddleware } from '../middleware/auth.js';
import { generateQrPng } from '../services/qrcode.js';

export function buildQrcodeRouter() {
  const app = new Hono<{ Bindings: Env; Variables: Variables }>();
  app.use('*', authMiddleware);

  app.get('/png', async (c) => {
    const claims = c.get('claims') as { storeId: string };
    const baseUrl = c.env.CUSTOMER_BASE_URL ?? 'https://qsycommetsys.workers.dev';
    const url = `${baseUrl}/#/?s=${claims.storeId}`;
    const png = await generateQrPng(url);
    return new Response(new Uint8Array(png), {
      status: 200,
      headers: { 'Content-Type': 'image/png', 'Content-Disposition': 'inline; filename="qr.png"' },
    });
  });

  return app;
}

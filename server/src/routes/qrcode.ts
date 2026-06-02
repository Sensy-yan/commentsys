import { Hono } from 'hono';
import type { DB } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { generateQrPng } from '../services/qrcode.js';

export function buildQrcodeRouter(db: DB, jwtSecret: string, customerBaseUrl: string) {
  const app = new Hono();
  app.use('*', authMiddleware(jwtSecret));

  app.get('/png', async (c) => {
    const claims = (c.get as (k: string) => unknown)('claims') as { storeId: string };
    const url = `${customerBaseUrl}/#/?s=${claims.storeId}`;
    const png = await generateQrPng(url);
    return new Response(new Uint8Array(png), {
      status: 200,
      headers: { 'Content-Type': 'image/png', 'Content-Disposition': 'inline; filename="qr.png"' },
    });
  });

  return app;
}

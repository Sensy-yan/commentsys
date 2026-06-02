import { Hono } from 'hono';
import type { Env, Variables } from '../types.js';
import { authMiddleware } from '../middleware/auth.js';
import { generateQrSvg } from '../services/qrcode.js';

export function buildQrcodeRouter() {
  const app = new Hono<{ Bindings: Env; Variables: Variables }>();
  app.use('*', authMiddleware);

  app.get('/svg', async (c) => {
    const claims = c.get('claims') as { storeId: string };
    const baseUrl = c.env.CUSTOMER_BASE_URL ?? 'https://qsycommetsys.workers.dev';
    const url = `${baseUrl}/#/?s=${claims.storeId}`;
    const svg = await generateQrSvg(url);
    return new Response(svg, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Content-Disposition': 'inline; filename="qr.svg"',
        'Cache-Control': 'no-store',
      },
    });
  });

  // Legacy /png path: same SVG payload, kept so old admin clients don't 404
  app.get('/png', async (c) => c.redirect('./svg'));

  return app;
}

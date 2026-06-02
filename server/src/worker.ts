import { Hono } from 'hono';
import type { Env, Variables } from './types.js';
import { buildCustomerRouter } from './routes/customer.js';
import { buildAuthRouter } from './routes/auth.js';
import { buildStatsRouter } from './routes/stats.js';
import { buildComplaintsRouter } from './routes/complaints.js';
import { buildPhotosRouter } from './routes/photos.js';
import { buildConfigRouter } from './routes/config.js';
import { buildQrcodeRouter } from './routes/qrcode.js';
import { buildReviewsRouter } from './routes/reviews.js';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.get('/health', (c) => c.json({ ok: true, env: c.env.NODE_ENV }));

app.route('/api/customer', buildCustomerRouter());
app.route('/api/auth', buildAuthRouter());
app.route('/api/admin/stats', buildStatsRouter());
app.route('/api/admin/complaints', buildComplaintsRouter());
app.route('/api/admin/photos', buildPhotosRouter());
app.route('/api/admin/config', buildConfigRouter());
app.route('/api/admin/qrcode', buildQrcodeRouter());
app.route('/api/admin/reviews', buildReviewsRouter());

// Serve photo BLOBs from D1
app.get('/uploads/:id', async (c) => {
  const id = c.req.param('id');
  const row = await c.env.DB.prepare('SELECT mime, data FROM photo_data WHERE photo_id = ?')
    .bind(id).first<{ mime: string; data: ArrayBuffer }>();
  if (!row) return c.notFound();
  return new Response(row.data, {
    status: 200,
    headers: {
      'Content-Type': row.mime,
      'Cache-Control': 'public, max-age=86400',
    },
  });
});

// Fall-through to static assets (customer at /, admin at /admin/)
app.all('*', async (c) => c.env.ASSETS.fetch(c.req.raw));

export default app;

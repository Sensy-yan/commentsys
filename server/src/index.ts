import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { env } from './env.js';
import { getDb } from './db.js';
import { buildCustomerRouter } from './routes/customer.js';
import { buildAuthRouter } from './routes/auth.js';
import { buildStatsRouter } from './routes/stats.js';
import { buildComplaintsRouter } from './routes/complaints.js';
import { buildPhotosRouter } from './routes/photos.js';
import { LocalPhotoStore } from './services/photoStore.js';

mkdirSync(dirname(env.DB_PATH), { recursive: true });
const db = getDb();

const UPLOAD_DIR = './data/uploads';
mkdirSync(UPLOAD_DIR, { recursive: true });
const photoStore = new LocalPhotoStore(UPLOAD_DIR, '/uploads');

const app = new Hono();
app.get('/health', (c) => c.json({ ok: true }));
app.use('/uploads/*', serveStatic({ root: './data' }));
app.route('/api/customer', buildCustomerRouter(db));
app.route('/api/auth', buildAuthRouter(db, env.JWT_SECRET, {
  ALIYUN_SMS_ACCESS_KEY: env.ALIYUN_SMS_ACCESS_KEY,
  ALIYUN_SMS_SECRET: env.ALIYUN_SMS_SECRET,
  ALIYUN_SMS_SIGN: env.ALIYUN_SMS_SIGN,
}));
app.route('/api/admin/stats', buildStatsRouter(db, env.JWT_SECRET));
app.route('/api/admin/complaints', buildComplaintsRouter(db, env.JWT_SECRET));
app.route('/api/admin/photos', buildPhotosRouter(db, photoStore, env.JWT_SECRET));

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`Server listening on http://localhost:${info.port}`);
});

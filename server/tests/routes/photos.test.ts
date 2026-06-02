import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDb, runMigrations } from '../../src/db.js';
import { buildPhotosRouter } from '../../src/routes/photos.js';
import { LocalPhotoStore } from '../../src/services/photoStore.js';
import { signToken } from '../../src/services/auth.js';

const SECRET = 'test';

describe('admin/photos', () => {
  let app: ReturnType<typeof buildPhotosRouter>;
  let db: ReturnType<typeof openDb>;
  let token: string;
  let dir: string;

  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), 'photos-'));
    db = openDb(':memory:');
    runMigrations(db);
    const store = new LocalPhotoStore(dir, '/uploads');
    app = buildPhotosRouter(db, store, SECRET);
    token = await signToken({ operatorId: 'op1', storeId: 's1' }, SECRET);
  });

  it('uploads and lists photo', async () => {
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array([1,2,3,4])], { type: 'image/jpeg' }), 'test.jpg');
    form.append('type', '环境');
    form.append('platforms', JSON.stringify(['dianping', 'meituan']));
    form.append('rating_match', JSON.stringify([4, 5]));
    form.append('tags', JSON.stringify(['头皮检测']));

    const upRes = await app.request('/', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    expect(upRes.status).toBe(200);

    const listRes = await app.request('/', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await listRes.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0].type).toBe('环境');

    rmSync(dir, { recursive: true });
  });

  it('deletes a photo', async () => {
    db.prepare(`INSERT INTO photos (id, store_id, url, type, platforms, rating_match, tags, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run('p1', 's1', '/x.jpg', '环境', '[]', '[]', '[]', Date.now());

    const res = await app.request('/p1', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const left = db.prepare('SELECT COUNT(*) AS n FROM photos').get() as any;
    expect(left.n).toBe(0);
  });
});

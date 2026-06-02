import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalPhotoStore } from '../../src/services/photoStore.js';

describe('LocalPhotoStore', () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'photo-')); });

  it('uploads and serves a file', async () => {
    const store = new LocalPhotoStore(dir, '/uploads');
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
    const { url, key } = await store.upload(buf, 'image/jpeg');
    expect(url).toMatch(/^\/uploads\//);
    expect(existsSync(join(dir, key))).toBe(true);
    rmSync(dir, { recursive: true });
  });
});

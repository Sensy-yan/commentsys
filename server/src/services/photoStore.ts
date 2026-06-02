import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';

export interface UploadResult {
  url: string;
  key: string;
}

export interface PhotoStore {
  upload(data: Buffer, mime: string): Promise<UploadResult>;
}

export class LocalPhotoStore implements PhotoStore {
  constructor(private rootDir: string, private urlPrefix: string) {}

  async upload(data: Buffer, mime: string): Promise<UploadResult> {
    const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
    const key = `${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${ext}`;
    const fullPath = join(this.rootDir, key);
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, data);
    return { url: `${this.urlPrefix}/${key}`, key };
  }
}

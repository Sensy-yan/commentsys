import { describe, it, expect } from 'vitest';
import { generateQrPng } from '../../src/services/qrcode.js';

describe('qrcode', () => {
  it('returns PNG buffer for a URL', async () => {
    const buf = await generateQrPng('https://example.com');
    expect(buf.length).toBeGreaterThan(100);
    expect(buf.subarray(0, 4)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  });
});

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { GenerateInput } from './llm.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..', '..', 'seed-data', 'templates');

interface Pool {
  openings: string[];
  projects: string[];
  technicianPraise: string[];
  effects: string[];
  prices?: string[];
  endings: string[];
}

const cache = new Map<string, Pool>();

function loadPool(platform: string): Pool {
  let pool = cache.get(platform);
  if (!pool) {
    const raw = readFileSync(join(ROOT, `${platform}.json`), 'utf-8');
    pool = JSON.parse(raw) as Pool;
    cache.set(platform, pool);
  }
  return pool;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function composeFromPool(input: GenerateInput): string {
  const pool = loadPool(input.platform);
  const technician = input.technician || '店里的技师';
  const tagSentence = input.tags.length
    ? `这次主要做的是${input.tags.join('和')}`
    : '';

  const parts: string[] = [];
  parts.push(pick(pool.openings));
  parts.push(pick(pool.projects));
  if (tagSentence) parts.push(tagSentence);
  parts.push(pick(pool.technicianPraise).replace('{name}', technician));
  parts.push(pick(pool.effects));
  if (pool.prices) parts.push(pick(pool.prices));
  parts.push(pick(pool.endings));

  const separator = input.platform === 'xiaohongshu' ? '\n' : '，';
  return parts.join(separator).replace(/，+/g, '，').replace(/^，|，$/g, '') + '。';
}

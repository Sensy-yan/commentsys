import dianping from '../../../seed-data/templates/dianping.json' with { type: 'json' };
import meituan from '../../../seed-data/templates/meituan.json' with { type: 'json' };
import douyin from '../../../seed-data/templates/douyin.json' with { type: 'json' };
import xiaohongshu from '../../../seed-data/templates/xiaohongshu.json' with { type: 'json' };
import type { GenerateInput } from './llm.js';

interface Pool {
  openings: string[];
  projects: string[];
  technicianPraise: string[];
  effects: string[];
  prices?: string[];
  endings: string[];
}

const POOLS: Record<string, Pool> = {
  dianping: dianping as Pool,
  meituan: meituan as Pool,
  douyin: douyin as Pool,
  xiaohongshu: xiaohongshu as Pool,
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function composeFromPool(input: GenerateInput): string {
  const pool = POOLS[input.platform];
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

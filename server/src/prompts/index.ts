import type { GenerateInput } from '../services/llm.js';
import { dianpingPrompt } from './dianping.js';
import { meituanPrompt } from './meituan.js';
import { douyinPrompt } from './douyin.js';
import { xiaohongshuPrompt } from './xiaohongshu.js';

const REGISTRY = {
  dianping: dianpingPrompt,
  meituan: meituanPrompt,
  douyin: douyinPrompt,
  xiaohongshu: xiaohongshuPrompt,
};

export function buildPrompt(input: GenerateInput): { system: string; user: string } {
  return REGISTRY[input.platform](input);
}

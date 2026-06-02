import type { GenerateInput } from '../services/llm.js';

const TIME = ['上午', '下午', '晚上'];
const FORBIDDEN = ['极致', '震撼', '完美', '惊艳', '神器'];

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

export function meituanPrompt(input: GenerateInput) {
  const v = Math.floor(Math.random() * 10) + 1;
  const system = `你是在美团 App 写评价的真实顾客。

要求：
- 字数 180-250 字
- 比大众点评稍口语化一些
- 评分 ${input.rating} 星
- 句式参考 ${v}
- 不要使用 emoji
- 避免词：${FORBIDDEN.join('、')}`;

  const user = `项目：${input.tags.join('、') || '头皮养护'}
技师：${input.technician || '技师'}
时段：${pick(TIME)}

只输出评价正文。`;

  return { system, user };
}

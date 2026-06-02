import type { GenerateInput } from '../services/llm.js';

const PAIN = ['脱发严重', '头皮出油', '头皮发痒', '发量稀少', '产后掉发'];
const FORBIDDEN = ['极致', '震撼', '完美', '神器'];

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

export function xiaohongshuPrompt(input: GenerateInput) {
  const v = Math.floor(Math.random() * 8) + 1;
  const system = `你正在小红书发一篇养发护理体验笔记。

要求：
- 字数 150-250 字
- 种草风格，可以分 2-3 个小段或用短换行
- 适量使用 emoji（3-6 个），常用 🤍✨🌿💆‍♀️
- 评分 ${input.rating} 星
- 句式参考 ${v}
- 避免词：${FORBIDDEN.join('、')}
- 适合开场："姐妹们"、"今天来分享一下"、"宝藏养发店"`;

  const user = `项目：${input.tags.join('、') || '头皮养护'}
技师：${input.technician || '技师'}
痛点共鸣：${pick(PAIN)}

只输出笔记正文。`;

  return { system, user };
}

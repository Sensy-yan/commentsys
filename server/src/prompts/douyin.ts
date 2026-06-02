import type { GenerateInput } from '../services/llm.js';

const HOOKS = ['头皮养护打卡', '记录今天的护理', '宝藏养发店分享', '终于来体验了'];
const FORBIDDEN = ['极致', '震撼', '完美', '神器'];

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

export function douyinPrompt(input: GenerateInput) {
  const v = Math.floor(Math.random() * 8) + 1;
  const system = `你正在抖音上给刚体验过的本地养发店写评价。

要求：
- 字数 80-150 字，短句为主
- 结果先行，第一句就说效果
- 评分 ${input.rating} 星
- 口语化，1-2 个 emoji 即可，不要刷屏
- 句式参考 ${v}
- 避免词：${FORBIDDEN.join('、')}`;

  const user = `开场参考：${pick(HOOKS)}
项目：${input.tags.join('、') || '头皮养护'}
技师：${input.technician || '技师'}

只输出评价正文。`;

  return { system, user };
}

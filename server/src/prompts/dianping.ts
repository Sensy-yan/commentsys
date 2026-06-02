import type { GenerateInput } from '../services/llm.js';

const TIME_OF_DAY = ['上午', '下午', '晚上', '中午刚下班后'];
const AUDIENCE = ['脱发严重的人', '油性头皮的朋友', '产后掉发的姐妹', '中年男性'];
const FORBIDDEN = ['极致', '震撼', '完美', '惊艳', '神器', '超绝'];

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

export function dianpingPrompt(input: GenerateInput) {
  const sentenceVariant = Math.floor(Math.random() * 10) + 1;

  const system = `你是一位刚做完头皮养发服务的真实顾客，正在大众点评写一条好评。

要求：
- 字数严格在 200-300 字之间
- 流水账风格，自然真实，不要分段，一段话写完
- 评分 ${input.rating} 星，必须是正面评价
- 句式参考编号 ${sentenceVariant}，句子长短交错
- 不要使用 emoji
- 严格避免出现以下任何词：${FORBIDDEN.join('、')}
- 不要使用"强烈推荐"等过于营销化的话术`;

  const user = `请写一条评价，包含以下要素：
- 项目：${input.tags.join('、') || '头皮养护'}
- 技师：${input.technician || '店里的技师'}
- 体验时段：${pick(TIME_OF_DAY)}
- 适合人群（在评价中自然带出）：${pick(AUDIENCE)}
- 可以提到一个小细节（例如等候时长、洗发水气味、按摩力度、店里的茶水等）

只输出评价正文，不要任何解释或前言。`;

  return { system, user };
}

import type { GenerateInput } from '../services/llm.js';

export function buildPrompt(input: GenerateInput): { system: string; user: string } {
  // Placeholder — real implementations come in Task 2.2.
  // We construct a minimal but plausible prompt so the LLM test (which mocks fetch)
  // exercises the integration without depending on platform-specific content.
  const system = `你是一位刚做完头皮养发服务的真实顾客，请在${input.platform}写一条好评。`;
  const user = `项目：${input.tags.join('、') || '头皮养护'}\n技师：${input.technician || '技师'}\n评分：${input.rating}星`;
  return { system, user };
}

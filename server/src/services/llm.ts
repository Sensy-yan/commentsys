import { buildPrompt } from '../prompts/index.js';

const ENDPOINT = 'https://api.deepseek.com/chat/completions';
const MODEL = 'deepseek-chat';

export type Platform = 'dianping' | 'meituan' | 'douyin' | 'xiaohongshu';

export interface GenerateInput {
  platform: Platform;
  rating: 4 | 5 | number;
  tags: string[];
  technician: string;
}

export interface GenerateOutput {
  text: string;
}

export async function generateReview(
  input: GenerateInput,
  apiKey: string,
  signal?: AbortSignal,
): Promise<GenerateOutput> {
  const { system, user } = buildPrompt(input);

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 1.0,
      max_tokens: 600,
    }),
    signal,
  });

  if (!res.ok) {
    throw new Error(`LLM HTTP ${res.status}: ${await res.text()}`);
  }
  const data = await res.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('LLM returned empty content');
  return { text };
}

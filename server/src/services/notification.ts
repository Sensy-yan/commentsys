interface NotifyInput {
  webhookUrl: string;
  complaintId: string;
  rating: number;
  message: string;
  contact: string | null;
  adminUrl: string;
}

export async function notifyComplaint(input: NotifyInput): Promise<void> {
  if (!input.webhookUrl) return;

  const stars = '★'.repeat(input.rating) + '☆'.repeat(5 - input.rating);
  const content = [
    '## 🔴 新差评待处理',
    `**评分**: ${stars} ${input.rating} 星`,
    `**留言**: ${input.message}`,
    input.contact ? `**联系**: ${input.contact}` : '',
    `[👉 点击进入后台处理](${input.adminUrl})`,
  ].filter(Boolean).join('\n\n');

  try {
    await fetch(input.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        msgtype: 'markdown',
        markdown: { content },
      }),
    });
  } catch (err) {
    console.error('WeCom notify failed:', err);
  }
}

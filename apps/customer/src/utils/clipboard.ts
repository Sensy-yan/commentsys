export async function copyText(text: string): Promise<boolean> {
  // 现代 API(HTTPS / localhost)
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch { /* fallthrough */ }
  }

  // 降级 textarea + execCommand
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.top = '-9999px';
  ta.readOnly = true;
  document.body.appendChild(ta);
  ta.select();
  ta.setSelectionRange(0, ta.value.length);
  try {
    return document.execCommand('copy');
  } finally {
    document.body.removeChild(ta);
  }
}

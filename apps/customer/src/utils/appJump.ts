const SCHEMES: Record<string, { app: string; web: string }> = {
  dianping: {
    app: 'dianping://app',
    web: 'https://www.dianping.com/',
  },
  meituan: {
    app: 'imeituan://',
    web: 'https://i.meituan.com/',
  },
  douyin: {
    app: 'snssdk1128://',
    web: 'https://www.douyin.com/',
  },
  xiaohongshu: {
    app: 'xhsdiscover://',
    web: 'https://www.xiaohongshu.com/',
  },
};

export function jumpToApp(platform: string, fallbackUrl?: string): void {
  const config = SCHEMES[platform];
  if (!config) return;

  // 优先用店铺直链,再降级到 App 首页 scheme,最后到 Web
  const target = fallbackUrl || config.app;
  const fallback = config.web;

  // 尝试拉起 App
  const start = Date.now();
  window.location.href = target;

  // 1.5 秒后如果还在原页,跳 Web
  setTimeout(() => {
    if (Date.now() - start < 2000 && document.visibilityState === 'visible') {
      window.location.href = fallback;
    }
  }, 1500);
}

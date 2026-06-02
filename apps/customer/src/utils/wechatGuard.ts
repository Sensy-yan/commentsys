export function isWeChatBrowser(): boolean {
  return /MicroMessenger/i.test(navigator.userAgent);
}

export function isDouyinBrowser(): boolean {
  return /aweme|bytedance/i.test(navigator.userAgent);
}

export function isInAppBrowser(): boolean {
  return isWeChatBrowser() || isDouyinBrowser();
}

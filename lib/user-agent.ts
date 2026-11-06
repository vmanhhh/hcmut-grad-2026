// User-agent helpers. Pure and client-safe.

export type InAppInfo = {
  inApp: boolean;
  app: "zalo" | "messenger" | "facebook" | null;
  os: "ios" | "android" | "other";
};

export function detectInAppBrowser(ua: string): InAppInfo {
  const os: InAppInfo["os"] = /iPhone|iPad|iPod/i.test(ua) ? "ios" : /Android/i.test(ua) ? "android" : "other";
  let app: InAppInfo["app"] = null;
  if (/Zalo/i.test(ua)) app = "zalo";
  else if (/Messenger|FB_IAB\/MESSENGER/i.test(ua)) app = "messenger";
  else if (/FBAN|FBAV|FB_IAB/i.test(ua)) app = "facebook";
  return { inApp: app !== null, app, os };
}

// Link-preview crawlers used by Zalo / Messenger / etc. They only ever receive the generic
// metadata of the page, and share a few IPs, so they get a separate, higher rate limit (analyze I2).
const CRAWLER_RE =
  /facebookexternalhit|facebot|meta-externalagent|zalo.*(bot|preview|crawler)|zalobot|twitterbot|slackbot|telegrambot|whatsapp|linkedinbot|discordbot|skypeuripreview|googlebot|bingbot|applebot/i;

export function isLinkPreviewCrawler(ua: string | null | undefined): boolean {
  return !!ua && CRAWLER_RE.test(ua);
}

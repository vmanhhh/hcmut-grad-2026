import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { isLinkPreviewCrawler } from "@/lib/user-agent";

// Page lookup rate limit for /i/{code}. App Router pages cannot set a 429 status themselves,
// so it is enforced here. Known link-preview crawlers (Zalo, Messenger, ...) get a separate,
// higher bucket instead of the per-person one (analyze I2): they only see generic metadata and
// share a few IPs, so the per-person limit would break link previews when links are sent in bulk.
export async function proxy(request: NextRequest) {
  const bucket = isLinkPreviewCrawler(request.headers.get("user-agent")) ? "crawler" : "page";
  const allowed = await checkRateLimit(bucket, clientIp(request.headers));
  if (allowed) return NextResponse.next();

  return new NextResponse(
    `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Thiệp mời tốt nghiệp — Trần Văn Mạnh · HCMUT 2026</title></head><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#08080a;color:#f3f4f6;font-family:system-ui,sans-serif;text-align:center"><p style="font-size:1.1rem;padding:0 24px">Bạn thử lại sau ít phút nhé</p></body></html>`,
    {
      status: 429,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Retry-After": "600",
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex",
      },
    },
  );
}

export const config = { matcher: "/i/:path*" };

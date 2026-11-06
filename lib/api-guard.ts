import "server-only";
import { NextResponse } from "next/server";
import { checkRateLimit, clientIp } from "./rate-limit";
import { isValidCode } from "./invites";

const NO_STORE = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };

export function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return NextResponse.json(body, { status, headers: { ...NO_STORE, ...extra } });
}

/**
 * Shared prelude for /api/invite/{code}/*: rate limit (api bucket, keyed by code + IP),
 * then code check. Returns a Response to send, or null to continue.
 */
export async function guard(request: Request, code: string): Promise<Response | null> {
  const ok = await checkRateLimit("api", clientIp(request.headers), code);
  if (!ok) return json({ error: "rate_limited" }, 429, { "Retry-After": "600" });
  if (!isValidCode(code)) return json({ error: "invalid_invite" }, 404);
  return null;
}

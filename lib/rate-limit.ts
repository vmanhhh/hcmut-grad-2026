import { createHash } from "node:crypto";
import { supabaseServer } from "./supabase-server";

/**
 * Buckets (see contracts/http-api.md):
 * - page:    /i/{code} lookups, 30 / 10 min per IP
 * - crawler: /i/{code} lookups from known link-preview crawlers, 300 / 10 min per IP (analyze I2)
 * - api:     open / rsvp / calendar.ics, 60 / 10 min per code + IP (analyze I1: a household or a
 *            venue Wi-Fi shares one IP, so the api bucket is keyed by code too)
 */
export type Bucket = "page" | "crawler" | "api";

const WINDOW_S = 600;

function limitFor(bucket: Bucket): number {
  const fromEnv = (name: string, fallback: number) => {
    const n = Number(process.env[name]);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  };
  if (bucket === "page") return fromEnv("RATE_LIMIT_PAGE_MAX", 30);
  if (bucket === "crawler") return fromEnv("RATE_LIMIT_CRAWLER_MAX", 300);
  return fromEnv("RATE_LIMIT_API_MAX", 60);
}

export function clientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Returns true when the request is allowed. Never logs the IP or the code.
 * Fails open if the limiter itself is unavailable (an outage must not lock guests out).
 */
export async function checkRateLimit(bucket: Bucket, ip: string, code?: string): Promise<boolean> {
  const salt = process.env.RATE_LIMIT_SALT ?? "";
  const subject = bucket === "api" ? `${ip}|${code ?? ""}` : ip;
  const key = `${createHash("sha256").update(salt + subject).digest("hex")}:${bucket}`;
  try {
    const { data, error } = await supabaseServer().rpc("check_rate_limit", {
      p_key: key,
      p_max: limitFor(bucket),
      p_window_s: WINDOW_S,
    });
    if (error) return true;
    return data !== false;
  } catch {
    return true;
  }
}

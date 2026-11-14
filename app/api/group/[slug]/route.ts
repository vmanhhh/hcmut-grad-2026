import { json } from "@/lib/api-guard";
import { JoinSchema, isValidSlug, joinGroup } from "@/lib/groups";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

/** Group link form: creates a personal guest and returns its code, so the client can go to /i/{code}. */
export async function POST(request: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  if (!(await checkRateLimit("join", clientIp(request.headers)))) {
    return json({ error: "rate_limited" }, 429, { "Retry-After": "600" });
  }
  if (!isValidSlug(slug)) return json({ error: "invalid_group" }, 404);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "bad_request", field: "body" }, 400);
  }
  const parsed = JoinSchema.safeParse(body);
  if (!parsed.success) {
    const field = String(parsed.error.issues[0]?.path[0] ?? "body");
    return json({ error: "bad_request", field }, 400);
  }
  try {
    const code = await joinGroup(slug, parsed.data);
    if (!code) return json({ error: "invalid_group" }, 404);
    return json({ ok: true, code });
  } catch {
    return json({ error: "server_error" }, 500);
  }
}

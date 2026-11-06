import { guard, json } from "@/lib/api-guard";
import { RsvpSchema, saveRsvp } from "@/lib/invites";

export async function POST(request: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const blocked = await guard(request, code);
  if (blocked) return blocked;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "bad_request", field: "body" }, 400);
  }
  const parsed = RsvpSchema.safeParse(body);
  if (!parsed.success) {
    const field = String(parsed.error.issues[0]?.path[0] ?? "body");
    return json({ error: "bad_request", field }, 400);
  }
  try {
    const saved = await saveRsvp(code, parsed.data);
    if (!saved) return json({ error: "invalid_invite" }, 404);
    return json({ ok: true, rsvp: saved });
  } catch {
    return json({ error: "server_error" }, 500);
  }
}

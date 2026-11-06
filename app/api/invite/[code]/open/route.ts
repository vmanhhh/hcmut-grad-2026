import { guard, json } from "@/lib/api-guard";
import { markOpened } from "@/lib/invites";

export async function POST(request: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const blocked = await guard(request, code);
  if (blocked) return blocked;
  try {
    const found = await markOpened(code);
    if (!found) return json({ error: "invalid_invite" }, 404);
    return json({ ok: true });
  } catch {
    return json({ error: "server_error" }, 500);
  }
}

import { guard, json } from "@/lib/api-guard";
import { getInvite } from "@/lib/invites";
import { buildIcs, selectWindows } from "@/lib/calendar";
import type { Gate } from "@/lib/types";

export async function GET(request: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const blocked = await guard(request, code);
  if (blocked) return blocked;

  const query = new URL(request.url).searchParams.get("window");
  if (query !== null && query !== "early" && query !== "late") {
    return json({ error: "bad_request", field: "window" }, 400);
  }
  try {
    const rec = await getInvite(code);
    if (!rec) return json({ error: "invalid_invite" }, 404);
    const windows = selectWindows(rec.event.windows, rec.guest.meeting_window, query);
    const ics = buildIcs({
      event: rec.event,
      code,
      windows,
      gates: rec.gates.map((g) => ({ ...g, steps: g.steps ?? [], best_for: g.best_for ?? [] })) as Gate[],
    });
    return new Response(ics, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="tot-nghiep-manh.ics"',
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch {
    return json({ error: "server_error" }, 500);
  }
}

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

// Vercel cron target (daily): keeps the free Supabase project awake and prunes rate_limits.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const db = supabaseServer();
    const ping = await db.from("event").select("id").eq("id", 1).single();
    if (ping.error) throw new Error("db");
    const cutoff = new Date(Date.now() - 24 * 3600_000).toISOString();
    const del = await db.from("rate_limits").delete().lt("window_start", cutoff);
    if (del.error) throw new Error("db");
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

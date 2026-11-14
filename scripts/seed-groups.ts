// pnpm seed:groups -- --slug khoa2023 --label "Khóa 2023" --body "Mời bạn tới chung vui…" [--role friend] [--title "…"] [--off] [--env .env.local]
// Creates or updates one group link (/g/{slug}). Re-running with the same slug updates it.
import { createClient } from "@supabase/supabase-js";
import { existsSync } from "node:fs";
import { z } from "zod";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : undefined;
}

const Group = z.object({
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/, "slug: 3-40 chars, a-z 0-9 and -"),
  label: z.string().trim().min(1).max(80),
  role: z.enum(["lecturer", "family", "friend", "other"]),
  message_title: z.string().trim().max(120).optional(),
  message_body: z.string().trim().min(1).max(2000),
});

async function main() {
  const envFile = arg("env") ?? ".env.local";
  if (!existsSync(envFile)) throw new Error(`Missing ${envFile}.`);
  process.loadEnvFile(envFile);
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error(`SUPABASE_URL / SUPABASE_SECRET_KEY missing in ${envFile}`);

  const g = Group.parse({
    slug: arg("slug"),
    label: arg("label"),
    role: arg("role") ?? "friend",
    message_title: arg("title"),
    message_body: arg("body"),
  });
  const db = createClient(url, key, { auth: { persistSession: false } });
  const { error } = await db
    .from("groups")
    .upsert({ ...g, message_title: g.message_title ?? null, active: !process.argv.includes("--off") }, { onConflict: "slug" });
  if (error) throw new Error(`Upsert failed: ${error.message}`);
  const { data: ev } = await db.from("event").select("public_base_url").eq("id", 1).single();
  const base = ((ev?.public_base_url as string | undefined) ?? "").replace(/\/$/, "");
  console.log(`group "${g.label}" saved: ${base}/g/${g.slug}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

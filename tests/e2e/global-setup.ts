// Resets the invite-test Supabase project to known fixtures. Uses the service-role key from .env.test.
// NEVER point .env.test at the production project: this deletes every guest row.
import { existsSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const FIXTURES = {
  fresh: { code: "fReshGuest23", name: "Khách Mới Một" },
  opened: { code: "opEnedGuest7", name: "Khách Đã Mở Hai" },
  answered: { code: "answeredGst9", name: "Khách Đã Trả Lời Ba" },
} as const;

export const FIXTURE_MESSAGES = {
  fresh: "Lời nhắn riêng cho khách mới.",
  opened: "Lời nhắn riêng cho khách đã mở.",
  answered: "Lời nhắn riêng cho khách đã trả lời.",
} as const;

function admin(): SupabaseClient {
  if (existsSync(".env.test")) process.loadEnvFile(".env.test");
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Set SUPABASE_URL and SUPABASE_SECRET_KEY for invite-test in .env.test");
  return createClient(url, key, { auth: { persistSession: false } });
}

export function testDb(): SupabaseClient {
  return admin();
}

export async function setJourneyVersion(n: number): Promise<void> {
  const { error } = await admin().from("event").update({ journey_version: n }).eq("id", 1);
  if (error) throw new Error(`setJourneyVersion failed: ${error.message}`);
}

/** Restores the three fixture guests to their known state and clears the rate limiter. */
export async function resetFixtures(): Promise<void> {
  const db = admin();
  const del = await db.from("guests").delete().neq("invite_code", "");
  if (del.error) throw new Error(`reset failed: ${del.error.message}`);
  await db.from("rate_limits").delete().neq("key", "");
  const base = { role: "friend", message_title: "Tới chung vui với mình nha!" };
  const ins = await db.from("guests").insert([
    {
      ...base,
      invite_code: FIXTURES.fresh.code,
      display_name: FIXTURES.fresh.name,
      message_body: FIXTURE_MESSAGES.fresh,
      opened_at: null,
      journey_version_seen: 0,
    },
    {
      ...base,
      invite_code: FIXTURES.opened.code,
      display_name: FIXTURES.opened.name,
      message_body: FIXTURE_MESSAGES.opened,
      opened_at: new Date("2026-11-10T03:00:00Z").toISOString(),
      journey_version_seen: 0,
    },
    {
      ...base,
      invite_code: FIXTURES.answered.code,
      display_name: FIXTURES.answered.name,
      message_body: FIXTURE_MESSAGES.answered,
      opened_at: new Date("2026-11-10T03:00:00Z").toISOString(),
      journey_version_seen: 0,
      rsvp: "yes",
      meeting_window: "late",
      party_size: 2,
      rsvp_at: new Date("2026-11-10T04:00:00Z").toISOString(),
    },
  ]);
  if (ins.error) throw new Error(`fixture insert failed: ${ins.error.message}`);
}

export default async function globalSetup(): Promise<void> {
  await resetFixtures();
  await setJourneyVersion(0);
}

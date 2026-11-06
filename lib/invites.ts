import "server-only";
import { z } from "zod";
import { canUsePgFallback, pgServer } from "./pg-server";
import { supabaseServer } from "./supabase-server";
import { salutationFor, type Role } from "./salutation";
import type { EventPublic, Gate, InvitePayload, SavedRsvp, Visit } from "./types";

const CODE_RE = /^[A-HJ-NP-Za-km-z2-9]{12}$/;

export function isValidCode(code: string): boolean {
  return CODE_RE.test(code);
}

type GuestRow = {
  display_name: string;
  role: Role;
  salutation: string | null;
  message_title: string;
  message_body: string;
  opened_at: string | null;
  journey_version_seen: number;
  rsvp: SavedRsvp["rsvp"] | null;
  meeting_window: SavedRsvp["meeting_window"];
  party_size: number | null;
  wish: string | null;
};

type EventRow = EventPublic & { id: number };

type GateRow = Omit<Gate, "steps" | "best_for"> & { steps: Gate["steps"] | null; best_for: Gate["best_for"] | null };

export type InviteRecord = { guest: GuestRow; event: EventRow; gates: GateRow[] };

/** Returns null for malformed or unknown codes (no DB query for malformed ones). */
export async function getInvite(code: string): Promise<InviteRecord | null> {
  if (!isValidCode(code)) return null;
  if (canUsePgFallback()) {
    const sql = pgServer();
    const [guest] = await sql<GuestRow[]>`
      select display_name, role, salutation, message_title, message_body, opened_at,
             journey_version_seen, rsvp, meeting_window, party_size, wish
      from guests where invite_code = ${code}`;
    if (!guest) return null;
    const [event] = await sql<EventRow[]>`select * from event where id = 1`;
    if (!event) throw new Error("event lookup failed");
    const gates = await sql<GateRow[]>`select * from gates order by sort_order asc`;
    return { guest, event, gates };
  }
  const db = supabaseServer();
  const [guestRes, eventRes, gatesRes] = await Promise.all([
    db
      .from("guests")
      .select(
        "display_name, role, salutation, message_title, message_body, opened_at, journey_version_seen, rsvp, meeting_window, party_size, wish",
      )
      .eq("invite_code", code)
      .maybeSingle(),
    db.from("event").select("*").eq("id", 1).single(),
    db.from("gates").select("*").order("sort_order", { ascending: true }),
  ]);
  if (guestRes.error) throw new Error("guest lookup failed");
  if (!guestRes.data) return null;
  if (eventRes.error || !eventRes.data) throw new Error("event lookup failed");
  if (gatesRes.error) throw new Error("gates lookup failed");
  return {
    guest: guestRes.data as GuestRow,
    event: eventRes.data as EventRow,
    gates: (gatesRes.data ?? []) as GateRow[],
  };
}

/** See the visit table in contracts/http-api.md. */
export function decideVisit(
  openedAt: string | null,
  journeyVersionSeen: number,
  journeyVersion: number,
): Visit {
  if (openedAt === null) return "first";
  if (journeyVersion > 0 && journeyVersionSeen < journeyVersion) return "return_new_journey";
  return "return";
}

/** Whitelisted fields only. `id`, `role`, `opened_at` and timestamps are never sent. */
export function toPayload(code: string, rec: InviteRecord): InvitePayload {
  const { guest, event, gates } = rec;
  return {
    code,
    visit: decideVisit(guest.opened_at, guest.journey_version_seen, event.journey_version),
    guest: {
      display_name: guest.display_name,
      salutation: salutationFor(guest.role, guest.display_name, guest.salutation),
      message_title: guest.message_title,
      message_body: guest.message_body,
      rsvp: guest.rsvp,
      meeting_window: guest.meeting_window,
      party_size: guest.party_size,
      wish: guest.wish,
    },
    event: {
      title: event.title,
      host_name: event.host_name,
      host_degree: event.host_degree,
      host_school: event.host_school,
      contact_phone: event.contact_phone,
      address: event.address,
      meeting_point_name: event.meeting_point_name,
      meeting_lat: event.meeting_lat,
      meeting_lng: event.meeting_lng,
      meeting_note: event.meeting_note,
      windows: event.windows,
      busy_note: event.busy_note,
      public_base_url: event.public_base_url,
      journey_version: event.journey_version,
    },
    gates: gates.map((g) => ({
      id: g.id,
      sort_order: g.sort_order,
      name: g.name,
      distance: g.distance,
      headline: g.headline,
      parking_note: g.parking_note,
      best_for: g.best_for ?? [],
      lat: g.lat,
      lng: g.lng,
      photo_url: g.photo_url,
      steps: g.steps ?? [],
    })),
  };
}

/** Idempotent: opened_at is set once; journey_version_seen follows event.journey_version. */
export async function markOpened(code: string): Promise<boolean> {
  if (!isValidCode(code)) return false;
  if (canUsePgFallback()) {
    const sql = pgServer();
    const [ev] = await sql<{ journey_version: number }[]>`select journey_version from event where id = 1`;
    if (!ev) throw new Error("event lookup failed");
    await sql`
      update guests set opened_at = coalesce(opened_at, now()), journey_version_seen = ${ev.journey_version}
      where invite_code = ${code}`;
    const [row] = await sql<{ invite_code: string }[]>`select invite_code from guests where invite_code = ${code}`;
    return !!row;
  }
  const db = supabaseServer();
  const { data: ev, error: evErr } = await db.from("event").select("journey_version").eq("id", 1).single();
  if (evErr || !ev) throw new Error("event lookup failed");
  // opened_at = coalesce(opened_at, now())
  const first = await db
    .from("guests")
    .update({ opened_at: new Date().toISOString() })
    .eq("invite_code", code)
    .is("opened_at", null);
  if (first.error) throw new Error("open failed");
  const { data, error } = await db
    .from("guests")
    .update({ journey_version_seen: ev.journey_version })
    .eq("invite_code", code)
    .select("invite_code");
  if (error) throw new Error("open failed");
  return (data?.length ?? 0) > 0;
}

export const RsvpSchema = z
  .object({
    rsvp: z.enum(["yes", "no", "maybe"]),
    meeting_window: z.enum(["early", "late"]).nullish(),
    party_size: z.number().int().min(1).max(5).nullish(),
    wish: z.string().trim().max(500).nullish(),
  })
  .superRefine((v, ctx) => {
    if (v.rsvp !== "no" && !v.meeting_window) {
      ctx.addIssue({ code: "custom", path: ["meeting_window"], message: "required" });
    }
  });

export type RsvpInput = z.infer<typeof RsvpSchema>;

/** Returns the saved values, or null when the code is unknown. Last write wins. */
export async function saveRsvp(code: string, input: RsvpInput): Promise<SavedRsvp | null> {
  if (!isValidCode(code)) return null;
  const isNo = input.rsvp === "no";
  const saved: SavedRsvp = {
    rsvp: input.rsvp,
    meeting_window: isNo ? null : (input.meeting_window ?? null),
    party_size: isNo ? null : (input.party_size ?? null),
    wish: input.wish ? input.wish : null,
  };
  if (canUsePgFallback()) {
    const sql = pgServer();
    const rows = await sql<{ invite_code: string }[]>`
      update guests set
        rsvp = ${saved.rsvp},
        meeting_window = ${saved.meeting_window},
        party_size = ${saved.party_size},
        wish = ${saved.wish},
        rsvp_at = now()
      where invite_code = ${code}
      returning invite_code`;
    return rows.length > 0 ? saved : null;
  }
  const { data, error } = await supabaseServer()
    .from("guests")
    .update({ ...saved, rsvp_at: new Date().toISOString() })
    .eq("invite_code", code)
    .select("invite_code");
  if (error) throw new Error("rsvp failed");
  return (data?.length ?? 0) > 0 ? saved : null;
}

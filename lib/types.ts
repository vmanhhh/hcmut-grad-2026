// Public payload types: exactly what may reach the browser (data-model.md -> Public payload).
// `id`, `role`, `opened_at` and timestamps are never part of these types.

export type Rsvp = "yes" | "no" | "maybe";
export type WindowId = "early" | "late";
export type GuestRole = "lecturer" | "family" | "friend" | "other";

export type MeetingWindow = {
  id: WindowId;
  starts_at: string; // ISO with offset, e.g. 2026-11-28T13:30:00+07:00
  ends_at: string;
};

export type GateStep = { photo_url: string | null; text: string };

export type ArrivalMode = "grab" | "xe_may" | "o_to" | "di_bo";

export type Gate = {
  id: string;
  sort_order: number;
  name: string;
  distance: "far" | "near";
  headline: string;
  parking_note: string | null;
  best_for: ArrivalMode[];
  lat: number;
  lng: number;
  photo_url: string | null;
  steps: GateStep[];
};

export type GuestPublic = {
  display_name: string;
  salutation: string;
  message_title: string;
  message_body: string;
  rsvp: Rsvp | null;
  meeting_window: WindowId | null;
  party_size: number | null;
  wish: string | null;
};

export type EventPublic = {
  title: string;
  host_name: string;
  host_degree: string;
  host_school: string;
  contact_phone: string;
  address: string;
  meeting_point_name: string;
  meeting_lat: number;
  meeting_lng: number;
  meeting_note: string | null;
  windows: MeetingWindow[];
  busy_note: string | null;
  public_base_url: string;
  journey_version: number;
};

export type Visit = "first" | "return" | "return_new_journey";

export type InvitePayload = {
  code: string;
  guest: GuestPublic;
  visit: Visit;
  event: EventPublic;
  gates: Gate[];
};

export type Memory = {
  id: string;
  zone: "gate" | "hallway" | "project" | "stage";
  sort_order: number;
  year: number;
  title: string;
  caption: string;
  image: string;
};

/** Crisp HTML caption strip while standing next to a hung campus photo. */
export type FeaturedPreview = {
  title: string;
  caption: string;
  photos: { src: string; w: number; h: number; video?: string }[];
};

export type GalleryItem = { kind: "image" | "video"; src: string; poster?: string; w: number; h: number };
export type GalleryEvent = { id: string; title: string; items: GalleryItem[] };
/** One school year of memories, shown where the host walks past it (1 gate, 2 main building door, 3 inside, 4 before the hall). */
export type Gallery = {
  year: 1 | 2 | 3 | 4;
  place: "gate" | "building" | "hall" | "stage";
  title: string;
  subtitle: string;
  events: GalleryEvent[];
};

export type SavedRsvp = {
  rsvp: Rsvp;
  meeting_window: WindowId | null;
  party_size: number | null;
  wish: string | null;
};

// Calendar builders (research R7). Pure functions, no server-only imports: used by the
// .ics route handler and by client components (Google Calendar links, copy-details text).
import { mapsDirections } from "./links";
import type { EventPublic, Gate, MeetingWindow, WindowId } from "./types";

const SUMMARY = "Gặp Mạnh — Lễ tốt nghiệp HCMUT";
const ALARMS = ["-PT24H", "-PT90M"] as const;
const DEFAULT_TIP = "Mạnh sẽ gửi thêm hướng dẫn chỗ gặp sớm.";

type CalEvent = Pick<
  EventPublic,
  "meeting_point_name" | "address" | "meeting_note" | "contact_phone" | "public_base_url" | "meeting_lat" | "meeting_lng"
>;

/** Query param > saved window > both. Unknown ids are ignored. */
export function selectWindows(
  windows: MeetingWindow[],
  saved?: WindowId | null,
  query?: string | null,
): MeetingWindow[] {
  const pick = (id?: string | null) => (id ? windows.filter((w) => w.id === id) : []);
  const q = pick(query);
  if (q.length) return q;
  const s = pick(saved);
  if (s.length) return s;
  return windows;
}

/** ISO with offset -> 20261128T063000Z */
export function toUtcStamp(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function inviteLink(event: Pick<EventPublic, "public_base_url">, code: string): string {
  return `${event.public_base_url.replace(/\/$/, "")}/i/${code}`;
}

function gateSummary(gates: Gate[]): string {
  return [...gates]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((g) => `${g.name}: ${g.headline}`)
    .join("; ");
}

function description(event: CalEvent, code: string, gates: Gate[]): string {
  const parts = [
    `Thiệp mời: ${inviteLink(event, code)}`,
    `Chỗ gặp: ${event.meeting_note?.trim() || DEFAULT_TIP}`,
    `Chỉ đường: ${mapsDirections(event.meeting_lat, event.meeting_lng)}`,
  ];
  const gs = gateSummary(gates);
  if (gs) parts.push(`Cổng: ${gs}`);
  parts.push(`Liên hệ Mạnh: ${event.contact_phone}`);
  return parts.join("\n");
}

function escapeText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Folds a content line at 75 octets (UTF-8), never splitting a character. CRLF + space continuation. */
export function foldLine(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const out: string[] = [];
  let cur = "";
  let curBytes = 0;
  let limit = 75;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (curBytes + b > limit) {
      out.push(cur);
      cur = "";
      curBytes = 0;
      limit = 74; // continuation lines start with one space
    }
    cur += ch;
    curBytes += b;
  }
  if (cur) out.push(cur);
  return out.join("\r\n ");
}

export function buildIcs(args: {
  event: CalEvent;
  code: string;
  windows: MeetingWindow[];
  gates: Gate[];
  now?: Date;
}): string {
  const { event, code, windows, gates } = args;
  const stamp = toUtcStamp((args.now ?? new Date()).toISOString());
  const lines: string[] = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//manh-totnghiep//invite//VI", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  for (const w of windows) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${code}-${w.id}@manh-totnghiep`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${toUtcStamp(w.starts_at)}`,
      `DTEND:${toUtcStamp(w.ends_at)}`,
      `SUMMARY:${escapeText(SUMMARY)}`,
      `LOCATION:${escapeText(`${event.meeting_point_name}, ${event.address}`)}`,
      `DESCRIPTION:${escapeText(description(event, code, gates))}`,
    );
    for (const trigger of ALARMS) {
      lines.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${escapeText(SUMMARY)}`, `TRIGGER:${trigger}`, "END:VALARM");
    }
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}

/**
 * Google Calendar template link. The template URL cannot set reminders: the calendar's default
 * reminder applies; the 24 h + 90 min reminders live in the .ics file only (analyze C1).
 */
export function googleCalendarUrl(
  window: MeetingWindow,
  args: { event: CalEvent; code: string; gates: Gate[] },
): string {
  const { event, code, gates } = args;
  const enc = encodeURIComponent;
  return (
    "https://calendar.google.com/calendar/render?action=TEMPLATE" +
    `&text=${enc(SUMMARY)}` +
    `&dates=${toUtcStamp(window.starts_at)}/${toUtcStamp(window.ends_at)}` +
    "&ctz=Asia/Ho_Chi_Minh" +
    `&location=${enc(`${event.meeting_point_name}, ${event.address}`)}` +
    `&details=${enc(description(event, code, gates))}`
  );
}

const DATE_LABEL = "Thứ Bảy 28/11/2026";

function hm(iso: string): string {
  // Vietnam is UTC+7 with no DST; format from the instant, not from the device time zone.
  const d = new Date(new Date(iso).getTime() + 7 * 3600_000);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

export function windowLabel(w: MeetingWindow): string {
  return `${hm(w.starts_at)}–${hm(w.ends_at)}`;
}

/** Text for the "Sao chép thông tin" button: date, window(s), address and the maps URL (analyze U1). */
export function copyDetailsText(event: CalEvent & { title?: string }, windows: MeetingWindow[]): string {
  return [
    `Gặp Mạnh — Lễ tốt nghiệp HCMUT`,
    `${DATE_LABEL}, ${windows.map(windowLabel).join(" hoặc ")}`,
    `Địa điểm: ${event.meeting_point_name}, ${event.address}`,
    `Chỉ đường: ${mapsDirections(event.meeting_lat, event.meeting_lng)}`,
    `Liên hệ Mạnh: ${event.contact_phone}`,
  ].join("\n");
}

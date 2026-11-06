import { describe, expect, it } from "vitest";
import {
  buildIcs,
  copyDetailsText,
  foldLine,
  googleCalendarUrl,
  selectWindows,
} from "@/lib/calendar";
import type { Gate, MeetingWindow } from "@/lib/types";

const windows: MeetingWindow[] = [
  { id: "early", starts_at: "2026-11-28T13:30:00+07:00", ends_at: "2026-11-28T15:00:00+07:00" },
  { id: "late", starts_at: "2026-11-28T17:30:00+07:00", ends_at: "2026-11-28T18:30:00+07:00" },
];

const event = {
  meeting_point_name: "Tòa nhà Khoa Khoa học và Kỹ thuật Máy tính",
  address: "268 Lý Thường Kiệt, Phường Diên Hồng, TP. Hồ Chí Minh",
  meeting_note: "Gặp ở sảnh; có hẹn, rồi nhắn Mạnh nhé",
  contact_phone: "0981907003",
  public_base_url: "https://manh-totnghiep.vercel.app",
  meeting_lat: 10.7728,
  meeting_lng: 106.6606,
};

const gates: Gate[] = [
  {
    id: "cong-2", sort_order: 1, name: "Cổng 2", distance: "near", headline: "Gần nhất, đi bộ ngắn",
    parking_note: null, best_for: ["di_bo"], lat: 1, lng: 2, photo_url: null, steps: [],
  },
];

const CODE = "fReshGuest23";
const now = new Date("2026-11-05T00:00:00Z");

describe("selectWindows", () => {
  it("prefers the query param, then the saved window, then both", () => {
    expect(selectWindows(windows, "early", "late").map((w) => w.id)).toEqual(["late"]);
    expect(selectWindows(windows, "early", null).map((w) => w.id)).toEqual(["early"]);
    expect(selectWindows(windows, null, undefined).map((w) => w.id)).toEqual(["early", "late"]);
    expect(selectWindows(windows, null, "bogus").map((w) => w.id)).toEqual(["early", "late"]);
  });
});

describe("buildIcs", () => {
  const ics = buildIcs({ event, code: CODE, windows, gates, now });
  const unfolded = ics.replace(/\r\n /g, "");

  it("emits UTC times for both windows", () => {
    expect(unfolded).toContain("DTSTART:20261128T063000Z");
    expect(unfolded).toContain("DTEND:20261128T080000Z");
    expect(unfolded).toContain("DTSTART:20261128T103000Z");
    expect(unfolded).toContain("DTEND:20261128T113000Z");
  });

  it("has two alarms per event and a stable UID", () => {
    expect((unfolded.match(/BEGIN:VEVENT/g) ?? []).length).toBe(2);
    expect((unfolded.match(/TRIGGER:-PT24H/g) ?? []).length).toBe(2);
    expect((unfolded.match(/TRIGGER:-PT90M/g) ?? []).length).toBe(2);
    expect(unfolded).toContain(`UID:${CODE}-early@manh-totnghiep`);
    expect(unfolded).toContain(`UID:${CODE}-late@manh-totnghiep`);
  });

  it("uses CRLF only and folds lines at 75 octets", () => {
    expect(ics.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
    const enc = new TextEncoder();
    for (const line of ics.split("\r\n")) expect(enc.encode(line).length).toBeLessThanOrEqual(75);
  });

  it("escapes , ; and newlines in Vietnamese text", () => {
    expect(unfolded).toContain("LOCATION:Tòa nhà Khoa Khoa học và Kỹ thuật Máy tính\\, 268 Lý Thường Kiệt\\,");
    expect(unfolded).toContain("Gặp ở sảnh\\; có hẹn\\, rồi nhắn Mạnh nhé");
    expect(unfolded).toContain("\\n");
    expect(unfolded).toContain("SUMMARY:Gặp Mạnh — Lễ tốt nghiệp HCMUT");
  });

  it("contains only the chosen window when one is selected", () => {
    const one = buildIcs({ event, code: CODE, windows: selectWindows(windows, "late"), gates, now });
    expect((one.match(/BEGIN:VEVENT/g) ?? []).length).toBe(1);
    expect(one).toContain("DTSTART:20261128T103000Z");
  });
});

describe("foldLine", () => {
  it("never splits a multi-byte character", () => {
    const folded = foldLine("DESCRIPTION:" + "ệ".repeat(80));
    const enc = new TextEncoder();
    const parts = folded.split("\r\n");
    expect(parts.length).toBeGreaterThan(1);
    for (const p of parts) expect(enc.encode(p).length).toBeLessThanOrEqual(75);
    expect(folded.replace(/\r\n /g, "")).toBe("DESCRIPTION:" + "ệ".repeat(80));
  });
});

describe("googleCalendarUrl", () => {
  it("carries UTC dates and the Vietnam time zone", () => {
    const url = googleCalendarUrl(windows[0], { event, code: CODE, gates });
    expect(url).toContain("dates=20261128T063000Z/20261128T080000Z");
    expect(url).toContain("ctz=Asia/Ho_Chi_Minh");
    expect(url).toContain("action=TEMPLATE");
  });
});

describe("copyDetailsText", () => {
  it("includes the date, both windows, the address and the maps URL", () => {
    const t = copyDetailsText(event, windows);
    expect(t).toContain("28/11/2026");
    expect(t).toContain("13:30–15:00");
    expect(t).toContain("17:30–18:30");
    expect(t).toContain("268 Lý Thường Kiệt");
    expect(t).toContain("https://www.google.com/maps/dir/?api=1&destination=10.7728,106.6606");
  });
});

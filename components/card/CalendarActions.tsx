"use client";

import { googleCalendarUrl, selectWindows, windowLabel } from "@/lib/calendar";
import type { EventPublic, Gate, WindowId } from "@/lib/types";

export default function CalendarActions({
  code,
  event,
  gates,
  savedWindow,
  inApp,
}: {
  code: string;
  event: EventPublic;
  gates: Gate[];
  savedWindow: WindowId | null;
  inApp: boolean;
}) {
  // Before RSVP both windows are offered; after the guest picks one, only that one (FR-010).
  const offered = selectWindows(event.windows, savedWindow);
  const icsHref = `/api/invite/${code}/calendar.ics${savedWindow ? `?window=${savedWindow}` : ""}`;

  const ics = (
    <a key="ics" className={`btn ${inApp ? "" : "btn-gold"} w-full`} href={icsHref} download="tot-nghiep-manh.ics">
      Thêm vào lịch (.ics)
    </a>
  );
  const google = offered.map((w) => (
    <a
      key={w.id}
      className={`btn ${inApp ? "btn-gold" : ""} w-full`}
      href={googleCalendarUrl(w, { event, code, gates })}
      target="_blank"
      rel="noopener noreferrer"
    >
      Google Calendar{offered.length > 1 ? ` · ${windowLabel(w)}` : ""}
    </a>
  ));

  return (
    <section className="panel p-5 space-y-3" aria-labelledby="cal-title">
      <h2 id="cal-title" className="font-display text-lg font-bold text-brand-gold">
        Thêm vào lịch
      </h2>
      <div className="space-y-2">{inApp ? [...google, ics] : [ics, ...google]}</div>
      <p className="text-xs text-zinc-400">
        Nhắc lịch trước 24 giờ và 90 phút có trong file .ics. Link Google Calendar dùng nhắc mặc định của lịch bạn.
      </p>
    </section>
  );
}

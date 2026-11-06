"use client";

import { windowLabel } from "@/lib/calendar";
import { telLink } from "@/lib/links";
import type { InvitePayload, SavedRsvp } from "@/lib/types";
import type { InAppInfo } from "@/lib/user-agent";
import TiltCard from "./TiltCard";

const MAP_URL = "https://maps.app.goo.gl/ApwZgs3nozznnVpRA";
/** Place name exactly as Google Maps shows it for MAP_URL. */
const MAP_NAME = "Khoa Khoa học và Kỹ thuật Máy tính";

export default function InviteCard({
  payload,
  saved,
  topSlot,
  onReplay,
}: {
  payload: InvitePayload;
  saved: SavedRsvp | null;
  /** Kept for the host component; the card itself no longer shows RSVP / calendar / directions. */
  onSaved?: (rsvp: SavedRsvp) => void;
  inApp?: InAppInfo;
  /** Named slot above the card (e.g. the one-time new-journey prompt). */
  topSlot?: React.ReactNode;
  /** Only passed (and the button only shown) when event.journey_version > 0 (FR-007, FR-013). */
  onReplay?: () => void;
}) {
  const { guest, event } = payload;
  // once the guest picked a window, only that one is shown on the card
  const shownWindows = saved?.meeting_window ? event.windows.filter((w) => w.id === saved.meeting_window) : event.windows;

  return (
    <div className="bg-grass min-h-dvh">
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center space-y-4 px-3 py-6 sm:px-4">
      {topSlot}

      <TiltCard>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="pixel-ribbon">★ THIỆP MỜI ★</span>
            <h1 className="pixel-title mt-2 sm:mt-3">LỄ TỐT NGHIỆP</h1>
            <p className="mt-1 text-[0.7rem] font-bold uppercase tracking-wider text-[#b8b3e6]">{event.host_degree}</p>
          </div>
          <div className="pixel-host" role="img" aria-label="Mạnh trong áo cử nhân" />
        </div>

        <div className="mt-3 sm:mt-5">
          <p className="pixel-label">Trân trọng kính mời</p>
          <p className="pixel-name mt-1 break-words">{guest.display_name}</p>
        </div>

        <div className="pixel-perf mt-4 pt-3 sm:mt-6 sm:pt-5">
          <dl className="grid gap-2 text-[0.82rem] sm:gap-3 sm:text-sm sm:grid-cols-2">
            <div className="pixel-box">
              <dt className="pixel-label">Ngày giờ</dt>
              <dd className="mt-1 font-bold">Thứ Bảy, 28/11/2026</dd>
              <dd>
                <ul className="mt-1.5 space-y-1" aria-label="Khung giờ gặp Mạnh">
                  {shownWindows.map((w) => (
                    <li key={w.id} className="flex items-center gap-2">
                      <span className="pixel-chip">{windowLabel(w)}</span>
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
            <div>
            <a
              href={MAP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="pixel-box block no-underline outline-offset-2 hover:brightness-125 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f2c75a]"
              aria-label={`Mở bản đồ: ${MAP_NAME}`}
            >
              <p className="pixel-label">Địa điểm</p>
              <p className="mt-1 font-bold">{MAP_NAME}</p>
              <p className="mt-1 text-[#d9d4ff]">{event.address}</p>
              <p className="mt-2 text-[0.7rem] font-bold text-[#f2c75a]">⌖ Chạm để mở bản đồ ↗</p>
            </a>
            </div>
          </dl>
          {event.busy_note && <p className="mt-3 border-2 border-dashed border-[#f2c75a]/40 px-3 py-2 text-xs text-[#d9d4ff]">{event.busy_note}</p>}
        </div>

        <footer className="mt-3 flex sm:mt-4 items-end justify-between gap-3 text-xs font-bold text-[#b8b3e6]">
          <span>
            <span className="block text-sm text-[#fff3c4]">{event.host_name}</span>
            HCMUT · 2022 – 2026
          </span>
          <span className="text-right">
            {event.contact_phone && (
              <a href={telLink(event.contact_phone)} className="block text-sm text-[#f2c75a] underline decoration-dotted underline-offset-2" aria-label={`Gọi ${event.contact_phone}`}>
                ☎ {event.contact_phone}
              </a>
            )}
            <span className="text-[0.62rem] uppercase tracking-wider">Chạm &amp; nghiêng thẻ</span>
          </span>
        </footer>
      </TiltCard>

      {onReplay && event.journey_version > 0 && (
        <button type="button" className="btn w-full" onClick={onReplay}>
          Chơi lại hành trình
        </button>
      )}
    </main>
    </div>
  );
}

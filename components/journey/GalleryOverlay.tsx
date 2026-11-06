"use client";

import { useEffect, useRef } from "react";
import type { Gallery, GalleryEvent } from "@/lib/types";

/** One event: a title and a swipeable strip of its photos (and videos). Images load lazily. */
export function EventStrip({ event, eager = false }: { event: GalleryEvent; eager?: boolean }) {
  return (
    <section aria-label={event.title} className="space-y-2">
      <h3 className="px-4 font-display text-base font-bold text-brand-gold">
        {event.title}
        {event.items.length > 1 && (
          <span className="ml-2 text-xs font-normal text-zinc-400">
            {event.items.length} {event.items.some((it) => it.kind === "video") ? "mục" : "ảnh"}
          </span>
        )}
        {event.items.length === 1 && event.items[0].kind === "video" && (
          <span className="ml-2 text-xs font-normal text-zinc-400">video</span>
        )}
      </h3>
      <ul className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2" tabIndex={0} aria-label={`Ảnh: ${event.title}`}>
        {event.items.map((it, i) => (
          <li key={it.src} className="shrink-0 snap-center">
            {it.kind === "video" ? (
              <video
                src={it.src}
                poster={it.poster}
                autoPlay
                muted
                loop
                playsInline
                controls
                preload="metadata"
                className="max-h-[52vh] max-w-[86vw] rounded-lg bg-black object-contain"
                aria-label={`${event.title} (video)`}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={it.src}
                width={it.w}
                height={it.h}
                alt={`${event.title}, ảnh ${i + 1}`}
                loading={eager && i === 0 ? "eager" : "lazy"}
                decoding="async"
                className="max-h-[52vh] max-w-[86vw] rounded-lg bg-zinc-900 object-contain"
              />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Full-screen photo gallery for one school year, opened from a stand in the game. Plain HTML so Vietnamese
 * text, swipe scrolling and video work everywhere. Esc or the close button returns to the game.
 */
export default function GalleryOverlay({ gallery, onClose }: { gallery: Gallery | undefined; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  return (
    <div role="dialog" aria-modal="true" aria-label={gallery?.title ?? "Kỷ niệm"} className="absolute inset-0 z-10 flex flex-col bg-[#0b0d1c]/97">
      <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-bold leading-tight text-brand-gold">{gallery?.title ?? "Kỷ niệm"}</h2>
          {gallery && <p className="text-sm text-zinc-300">{gallery.subtitle}</p>}
        </div>
        <button ref={closeRef} type="button" className="btn btn-compact btn-gold shrink-0" onClick={onClose}>
          Đi tiếp
        </button>
      </div>
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain py-4">
        {gallery && gallery.events.length > 0 ? (
          gallery.events.map((e, i) => <EventStrip key={e.id} event={e} eager={i === 0} />)
        ) : (
          <p className="px-4 text-zinc-400">Chưa có ảnh.</p>
        )}
      </div>
    </div>
  );
}

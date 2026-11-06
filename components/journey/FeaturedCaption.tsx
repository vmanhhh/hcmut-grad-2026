"use client";

import { useEffect, useState } from "react";
import type { FeaturedPreview } from "@/lib/types";

/**
 * Floating memory card shown while the host stands at a milestone: the photo (or video) is enlarged
 * just enough to read well, but pinned to the top so the lane and the host stay visible below it.
 * Plain HTML so it stays sharp (not drawn into the pixel canvas).
 */
export default function FeaturedCaption({ preview }: { preview: FeaturedPreview }) {
  const [idx, setIdx] = useState(0);
  const photos = preview.photos;
  const current = photos[idx % Math.max(1, photos.length)];
  const isVideo = !!current?.video;

  useEffect(() => {
    setIdx(0);
  }, [preview.title]);

  // photo slideshow; a video plays on its own and the slideshow only advances when it ends
  useEffect(() => {
    if (photos.length < 2 || isVideo) return;
    const t = window.setInterval(() => setIdx((i) => (i + 1) % photos.length), 1000);
    return () => window.clearInterval(t);
  }, [preview.title, photos.length, isVideo]);

  return (
    <aside
      className="pointer-events-none absolute inset-x-0 top-14 z-[5] flex justify-center px-3"
      aria-live="polite"
    >
      <figure className="w-full max-w-[min(86vw,20rem)] overflow-hidden rounded-xl bg-black/80 shadow-2xl ring-2 ring-[#f2c75a]/80 backdrop-blur-sm sm:max-w-[min(50vw,22rem)]">
        <div className="relative grid place-items-center bg-zinc-950">
          {current ? (
            isVideo ? (
              <video
                key={current.video}
                src={current.video}
                poster={current.src || undefined}
                autoPlay
                muted
                loop
                playsInline
                className="max-h-[26vh] w-auto max-w-full object-contain sm:max-h-[30vh]"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={current.src}
                src={current.src}
                alt={preview.title}
                width={current.w}
                height={current.h}
                className="max-h-[26vh] w-auto max-w-full object-contain sm:max-h-[30vh]"
                decoding="async"
              />
            )
          ) : (
            <div className="grid h-28 w-full place-items-center text-sm text-zinc-400">Chưa có ảnh</div>
          )}
          {photos.length > 1 && (
            <span className="absolute bottom-1.5 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] text-zinc-200">
              {(idx % photos.length) + 1}/{photos.length}
            </span>
          )}
        </div>
        <figcaption className="px-3 py-2 text-center">
          <p className="font-display text-base font-bold leading-snug text-brand-gold sm:text-lg">{preview.title}</p>
          <p className="mt-0.5 whitespace-pre-line text-xs leading-snug text-zinc-100 sm:text-sm">{preview.caption}</p>
        </figcaption>
      </figure>
    </aside>
  );
}

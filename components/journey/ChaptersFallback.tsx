"use client";

import type { Gallery } from "@/lib/types";
import { EventStrip } from "./GalleryOverlay";

type Letter = { salutation: string; title: string; body: string };

/**
 * Reduced-motion / low-power replacement for the Phaser journey (FR-018): stacked chapters with the
 * same photos and letter, no scroll-driven or heavy animation, ending on the card via the same
 * onFinish contract.
 */
export default function ChaptersFallback({
  galleries,
  letter,
  hostName,
  onFinish,
}: {
  memories?: unknown; // kept optional for call-site compat; project corner removed
  galleries: Gallery[];
  letter: Letter;
  hostName: string;
  onFinish: (reason: "completed" | "skipped") => void;
}) {
  return (
    <div className="mx-auto w-full max-w-xl space-y-10 px-4 pb-16 pt-4">
      {galleries.map((g) => (
        <section key={g.year} className="-mx-4 space-y-4">
          <div className="px-4">
            <h2 className="font-display text-xl font-bold text-brand-gold">{g.title}</h2>
            <p className="text-zinc-300">{g.subtitle}</p>
          </div>
          {g.events.map((e) => (
            <EventStrip key={e.id} event={e} />
          ))}
        </section>
      ))}

      <section className="space-y-2">
        <h2 className="font-display text-xl font-bold text-brand-gold">Sân khấu</h2>
        <p className="text-zinc-300">Cánh cửa hội trường mở ra.</p>
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-xl font-bold text-brand-gold">Nhận bằng</h2>
        <p className="text-zinc-300">Chúc mừng tốt nghiệp!</p>
      </section>

      <section className="space-y-3 rounded-3xl bg-[#f3e9cf] p-6 text-[#2a2018]">
        <h2 className="font-hand text-3xl text-[#7a4a12]">{letter.salutation}</h2>
        <p className="font-hand text-2xl font-bold">{letter.title}</p>
        <p className="font-hand whitespace-pre-line text-xl leading-relaxed">{letter.body}</p>
        <p className="font-hand text-right text-2xl text-[#7a4a12]">— {hostName}</p>
      </section>

      <button type="button" className="btn btn-gold w-full" onClick={() => onFinish("completed")}>
        Vào thiệp mời
      </button>
    </div>
  );
}

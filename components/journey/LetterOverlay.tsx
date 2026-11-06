"use client";

import { useEffect, useRef } from "react";

type Letter = { salutation: string; title: string; body: string };

/**
 * Crisp HTML letter after the journey (FR-017). Kept out of the Phaser pixel canvas so handwriting
 * and Vietnamese marks stay sharp — same paper look as ChaptersFallback, not game-pixel scaled.
 */
export default function LetterOverlay({
  letter,
  hostName,
  onEnterCard,
}: {
  letter: Letter;
  hostName: string;
  onEnterCard: () => void;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    btnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.stopPropagation();
        onEnterCard();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onEnterCard]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Thư mời"
      className="absolute inset-0 z-10 flex flex-col bg-gradient-to-b from-[#1b1f4a] to-[#2f2f66]"
    >
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-6">
        <article className="mx-auto max-w-lg space-y-3 rounded-2xl bg-[#f6ecd0] p-6 text-[#2a2018] shadow-[0_8px_32px_rgba(0,0,0,0.35)] ring-1 ring-[#b0873a]/60">
          <h2 className="font-hand text-3xl leading-snug text-[#7a4a12]">{letter.salutation}</h2>
          <p className="font-hand text-2xl font-bold leading-snug">{letter.title}</p>
          <p className="font-hand whitespace-pre-line text-xl leading-relaxed">{letter.body}</p>
          <p className="font-hand text-right text-2xl text-[#7a4a12]">— {hostName}</p>
          <div className="pt-4">
            <button ref={btnRef} type="button" className="btn btn-gold w-full justify-center" onClick={onEnterCard}>
              Vào thiệp mời
            </button>
          </div>
        </article>
      </div>
    </div>
  );
}

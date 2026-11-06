"use client";

import { useEffect, useRef } from "react";
import type { Memory } from "@/lib/types";

/** Crisp HTML memory card (FR-016). Kept out of the Phaser pixel canvas. */
export default function MemoryOverlay({ memory, onClose }: { memory: Memory; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " " || e.key === "e" || e.key === "E") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  return (
    <div role="dialog" aria-modal="true" aria-label={memory.title} className="absolute inset-0 z-10 flex flex-col justify-end bg-black/70 sm:justify-center">
      <article className="mx-auto max-h-[88dvh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-t-2xl bg-[#1b1a38] shadow-xl ring-1 ring-[#f2c75a]/50 sm:rounded-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={memory.image} alt={memory.title} className="max-h-[48vh] w-full bg-black object-contain" decoding="async" />
        <div className="space-y-2 p-4">
          <h2 className="font-display text-lg font-bold text-brand-gold">
            {memory.year} · {memory.title}
          </h2>
          <p className="text-base leading-relaxed text-zinc-100">{memory.caption}</p>
          <button ref={closeRef} type="button" className="btn btn-gold mt-2 w-full justify-center" onClick={onClose}>
            Đóng
          </button>
        </div>
      </article>
    </div>
  );
}

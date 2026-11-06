"use client";

import { useRef } from "react";

const MAX_DEG = 14;

/**
 * Holographic 3D tilt card (research R11): up to +-14 deg from pointer move (PC) and touch drag (mobile),
 * with a foil glare that follows the pointer. `touch-action: pan-y` keeps vertical page scroll working;
 * horizontal drags tilt. Springs back on release. It is driven by the guest's own pointer, so the
 * OS "reduce motion" option does not switch it off.
 */
export default function TiltCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const apply = (rx: number, ry: number, mx: number, my: number, glare: number, spring: boolean) => {
    const el = ref.current;
    if (!el) return;
    el.style.transition = spring ? "transform 500ms cubic-bezier(.2,1.4,.4,1)" : "transform 60ms linear";
    const s = glare > 0 ? 1.03 : 1;
    el.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) scale3d(${s}, ${s}, ${s})`;
    el.style.setProperty("--mx", `${(mx * 100).toFixed(1)}%`);
    el.style.setProperty("--my", `${(my * 100).toFixed(1)}%`);
    el.style.setProperty("--holo", glare.toFixed(2));
  };

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width; // 0..1
    const py = (e.clientY - rect.top) / rect.height;
    const clamp = (v: number) => Math.max(-MAX_DEG, Math.min(MAX_DEG, v));
    apply(clamp(-(py - 0.5) * 2 * MAX_DEG), clamp((px - 0.5) * 2 * MAX_DEG), px, py, 1, false);
  };

  const reset = () => apply(0, 0, 0.5, 0.5, 0, true);

  return (
    <div className="ticket-wrapper">
      <div
        ref={ref}
        className={`holo-card pixel-card ${className}`}
        style={{ touchAction: "pan-y" }}
        onPointerMove={onMove}
        onPointerLeave={reset}
        onPointerUp={reset}
        onPointerCancel={reset}
      >
        <div className="holo-foil" aria-hidden="true" />
        <div className="holo-glare" aria-hidden="true" />
        <div className="pixel-card-in relative z-10">{children}</div>
      </div>
    </div>
  );
}

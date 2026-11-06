"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MAX_DEG = 14;
const clamp = (v: number) => Math.max(-MAX_DEG, Math.min(MAX_DEG, v));

/**
 * Holographic 3D tilt card (research R11), up to +-14 deg. Input sources, in priority order:
 *  1. finger / mouse drag (always works, no permission),
 *  2. phone gyroscope (`deviceorientation`; iOS asks permission on the first tap),
 *  3. a gentle idle sway when neither is active (gyro denied / unsupported / not asked yet).
 * Without gyro the card sets `touch-action: none` so a drag on iOS Safari is not cancelled by scrolling;
 * once gyro is live it goes back to `pan-y` so the page scrolls normally.
 */
export default function TiltCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const touching = useRef(false);
  const gyroAsked = useRef(false);
  const gyroLive = useRef(false);
  const base = useRef<{ b: number; g: number } | null>(null);
  const gyroState = useRef({ rx: 0, ry: 0, trx: 0, try_: 0 });
  const [gyro, setGyro] = useState(false);

  const apply = useCallback((rx: number, ry: number, mx: number, my: number, glare: number, spring: boolean) => {
    const el = ref.current;
    if (!el) return;
    el.style.transition = spring ? "transform 500ms cubic-bezier(.2,1.4,.4,1)" : "transform 60ms linear";
    const s = glare > 0 ? 1.03 : 1;
    el.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) scale3d(${s}, ${s}, ${s})`;
    el.style.setProperty("--mx", `${(mx * 100).toFixed(1)}%`);
    el.style.setProperty("--my", `${(my * 100).toFixed(1)}%`);
    el.style.setProperty("--holo", glare.toFixed(2));
  }, []);

  // Idle sway: runs until a real gyro reading arrives; paused while the user drags.
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      if (!touching.current && gyroLive.current) {
        // exponential smoothing toward the sensor target: removes jitter and gives the card some weight
        const g = gyroState.current;
        g.rx += (g.trx - g.rx) * 0.12;
        g.ry += (g.try_ - g.ry) * 0.12;
        apply(g.rx, g.ry, 0.5 + g.ry / (MAX_DEG * 2), 0.5 - g.rx / (MAX_DEG * 2), 1, false);
      } else if (!touching.current) {
        const t = (now - t0) / 1000;
        const ry = Math.sin(t * 0.9) * 7;
        const rx = Math.cos(t * 0.7) * 4;
        apply(rx, ry, 0.5 + ry / (MAX_DEG * 2), 0.5 - rx / (MAX_DEG * 2), 0.8, false);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [apply]);

  const onOrientation = useCallback(
    (e: DeviceOrientationEvent) => {
      if (e.beta == null || e.gamma == null) return;
      gyroLive.current = true;
      setGyro(true);
      if (!base.current) base.current = { b: e.beta, g: e.gamma };
      // the neutral pose slowly follows how the phone is held, so any resting posture feels centred
      base.current.b += (e.beta - base.current.b) * 0.02;
      base.current.g += (e.gamma - base.current.g) * 0.02;
      const g = gyroState.current;
      g.trx = clamp(-(e.beta - base.current.b) * 0.5);
      g.try_ = clamp((e.gamma - base.current.g) * 0.5);
    },
    [],
  );

  // Android / desktop: no permission needed, so listen right away (events simply never fire if no sensor).
  useEffect(() => {
    if (typeof window === "undefined" || !("DeviceOrientationEvent" in window)) return;
    const DOE = window.DeviceOrientationEvent as unknown as { requestPermission?: unknown };
    if (typeof DOE.requestPermission === "function") return; // iOS: wait for a user gesture
    window.addEventListener("deviceorientation", onOrientation);
    return () => window.removeEventListener("deviceorientation", onOrientation);
  }, [onOrientation]);

  // iOS 13+: permission must be requested inside a user gesture. Denied / error -> stay on drag + sway.
  const askGyro = async () => {
    if (gyroAsked.current || typeof window === "undefined") return;
    const DOE = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> } | undefined;
    if (!DOE || typeof DOE.requestPermission !== "function") return;
    gyroAsked.current = true;
    try {
      if ((await DOE.requestPermission()) === "granted") {
        window.addEventListener("deviceorientation", onOrientation);
      }
    } catch {
      /* fall back to drag + idle sway */
    }
  };

  // The guest already taps during the journey ("bấm để bắt đầu", "Vào thiệp mời"), so ask on the first
  // touchend/click anywhere: iOS accepts touchend/click (not touchstart) as the required user gesture.
  useEffect(() => {
    const once = () => {
      void askGyro();
      document.removeEventListener("touchend", once);
      document.removeEventListener("click", once);
    };
    document.addEventListener("touchend", once, { passive: true });
    document.addEventListener("click", once);
    return () => {
      document.removeEventListener("touchend", once);
      document.removeEventListener("click", once);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width; // 0..1
    const py = (e.clientY - rect.top) / rect.height;
    apply(clamp(-(py - 0.5) * 2 * MAX_DEG), clamp((px - 0.5) * 2 * MAX_DEG), px, py, 1, false);
  };

  const release = () => {
    touching.current = false;
    base.current = null; // re-centre gyro on the current phone angle
    if (!gyroLive.current) return; // idle sway resumes by itself
    apply(0, 0, 0.5, 0.5, 0, true);
  };

  return (
    <div className="ticket-wrapper">
      <div
        ref={ref}
        className={`holo-card pixel-card ${className}`}
        style={{ touchAction: gyro ? "pan-y" : "none" }}
        onPointerDown={(e) => {
          touching.current = true;
          onMove(e);
        }}
        onPointerMove={onMove}
        onPointerLeave={release}
        onPointerUp={release}
        onPointerCancel={release}
        onClick={() => void askGyro()} // click/touchend is a gesture iOS accepts for the permission prompt
      >
        <div className="holo-foil" aria-hidden="true" />
        <div className="holo-glare" aria-hidden="true" />
        <div className="pixel-card-in relative z-10">{children}</div>
      </div>
    </div>
  );
}

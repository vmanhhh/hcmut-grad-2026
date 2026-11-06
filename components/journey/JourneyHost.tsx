"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FeaturedPreview, Gallery, Memory } from "@/lib/types";
import ChaptersFallback from "./ChaptersFallback";
import FeaturedCaption from "./FeaturedCaption";
import GalleryOverlay from "./GalleryOverlay";
import LetterOverlay from "./LetterOverlay";
import MemoryOverlay from "./MemoryOverlay";

type Letter = { salutation: string; title: string; body: string };
type Reason = "completed" | "skipped";
type Handle = { setMuted(m: boolean): void; skipCutscene(): void; destroy(): void };

const LOAD_TIMEOUT_MS = 8000;
const MUTE_KEY = "journey-muted";

function readMuted(): boolean {
  try {
    return window.localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

function saveMuted(m: boolean) {
  try {
    window.localStorage.setItem(MUTE_KEY, m ? "1" : "0");
  } catch {
    // storage unavailable: the choice just is not remembered
  }
}

/** FR-018: reduced motion or low power -> chapters instead of Phaser. */
/**
 * The text-and-photos fallback is only for weak devices. "Reduce motion" is NOT a reason to hide the game
 * (the guest tapped "Chơi lại hành trình" on purpose, and many desktops keep that OS option on), and an
 * explicit replay always opens the game.
 */
function wantsFallback(mode: "play" | "replay"): boolean {
  if (mode === "replay") return false;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const lowCpu = typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency <= 2;
  const lowMem = typeof nav.deviceMemory === "number" && nav.deviceMemory <= 2;
  return lowCpu || lowMem;
}

/**
 * Full-screen overlay above the already-rendered card (Principle I). "Vào thiệp mời", Skip-cutscene
 * and Mute are plain HTML owned by this component, visible from the first frame and working before
 * (or without) Phaser. Any load failure or an 8 s timeout leads to the card.
 */
export default function JourneyHost({
  mode,
  letter,
  memories,
  galleries,
  hostName,
  onFinish,
}: {
  mode: "play" | "replay";
  letter: Letter;
  memories: Memory[];
  galleries: Gallery[];
  hostName: string;
  onFinish: (reason: Reason) => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<Handle | null>(null);
  const doneRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [kind, setKind] = useState<"loading" | "play" | "chapters">("loading");
  const [loaded, setLoaded] = useState(false);
  const [muted, setMutedState] = useState(false);
  const [openYear, setOpenYear] = useState<number | null>(null);
  const [openMemory, setOpenMemory] = useState<Memory | null>(null);
  const [featured, setFeatured] = useState<FeaturedPreview | null>(null);
  const [showLetter, setShowLetter] = useState(false);
  const galleryDone = useRef<(() => void) | null>(null);
  const memoryDone = useRef<(() => void) | null>(null);
  const letterDone = useRef<(() => void) | null>(null);

  const closeGallery = useCallback(() => {
    setOpenYear(null);
    const done = galleryDone.current;
    galleryDone.current = null;
    done?.();
  }, []);

  const closeMemory = useCallback(() => {
    setOpenMemory(null);
    const done = memoryDone.current;
    memoryDone.current = null;
    done?.();
  }, []);

  const enterCardFromLetter = useCallback(() => {
    setShowLetter(false);
    const done = letterDone.current;
    letterDone.current = null;
    done?.();
  }, []);

  const finish = useCallback(
    (reason: Reason) => {
      if (doneRef.current) return;
      doneRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      handleRef.current?.destroy();
      handleRef.current = null;
      onFinish(reason);
    },
    [onFinish],
  );

  // lock page scroll behind the overlay
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    setMutedState(readMuted());
    setKind(wantsFallback(mode) ? "chapters" : "play");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // start Phaser (client-only dynamic import, separate chunk)
  useEffect(() => {
    if (kind !== "play") return;
    let cancelled = false;
    timerRef.current = setTimeout(() => finish("skipped"), LOAD_TIMEOUT_MS);
    import("@/game")
      .then(({ startJourney }) => {
        if (cancelled || doneRef.current || !stageRef.current) return;
        const m = readMuted();
        handleRef.current = startJourney(
          stageRef.current,
          { letter, memories, galleries, hostName, muted: m, mode },
          {
            onZone: () => {
              // the first zone report means the game is up: stop the load timeout
              if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
              }
              setLoaded(true);
            },
            onMuteChange: (v) => {
              saveMuted(v);
              setMutedState(v);
            },
            onGallery: (year, done) => {
              galleryDone.current = done;
              setOpenYear(year);
            },
            onMemory: (memory, done) => {
              memoryDone.current = done;
              setOpenMemory(memory);
            },
            onFeatured: (preview) => setFeatured(preview),
            onLetter: (done) => {
              letterDone.current = done;
              setShowLetter(true);
            },
            onFinish: finish,
          },
        );
      })
      .catch(() => finish("skipped"));
    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      handleRef.current?.destroy();
      handleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  const toggleMute = () => {
    const next = !muted;
    setMutedState(next);
    saveMuted(next);
    handleRef.current?.setMuted(next);
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Hành trình" className="fixed inset-0 z-50 flex flex-col bg-[#08080a]">
      <div
        className={
          kind === "chapters"
            ? "flex flex-wrap items-center justify-between gap-1.5 px-2 py-1.5"
            : "pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-1.5 px-2 pt-2 [&>*]:pointer-events-auto"
        }
      >
        <button type="button" className="btn btn-compact btn-gold" onClick={() => finish("skipped")}>
          Vào thiệp mời
        </button>
        {kind === "play" && (
          <button
            type="button"
            className="btn btn-compact"
            aria-pressed={muted}
            aria-label={muted ? "Bật tiếng" : "Tắt tiếng"}
            title={muted ? "Bật tiếng" : "Tắt tiếng"}
            onClick={toggleMute}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M11 5 6 9H3v6h3l5 4V5z" fill="currentColor" />
              {muted ? (
                <path d="m16 9 5 6m0-6-5 6" />
              ) : (
                <>
                  <path d="M15.5 8.5a5 5 0 0 1 0 7" />
                  <path d="M18.5 5.5a9 9 0 0 1 0 13" />
                </>
              )}
            </svg>
          </button>
        )}
      </div>

      {kind === "chapters" ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ChaptersFallback memories={memories} galleries={galleries} letter={letter} hostName={hostName} onFinish={finish} />
        </div>
      ) : (
        <div className="relative min-h-0 flex-1">
          <div ref={stageRef} className="absolute inset-0" />
          {!loaded && (
            <div className="journey-loader pointer-events-none absolute inset-0 grid place-content-center justify-items-center gap-4" aria-live="polite">
              <div className="journey-loader-dots" aria-hidden="true">
                <i /> <i /> <i /> <i />
              </div>
              <p className="journey-loader-text">Đang tải hành trình…</p>
              <div className="journey-loader-bar" aria-hidden="true" />
            </div>
          )}
          {featured && !openYear && !openMemory && <FeaturedCaption preview={featured} />}
        </div>
      )}
      {openYear !== null && <GalleryOverlay gallery={galleries.find((g) => g.year === openYear)} onClose={closeGallery} />}
      {openMemory && <MemoryOverlay memory={openMemory} onClose={closeMemory} />}
      {showLetter && <LetterOverlay letter={letter} hostName={hostName} onEnterCard={enterCardFromLetter} />}
    </div>
  );
}

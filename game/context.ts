import type Phaser from "phaser";
import type { FeaturedPreview, Gallery, Memory } from "@/lib/types";

export type { FeaturedPreview };

// Mirrors contracts/journey-bridge.md. The game never fetches data and never calls the API.
export type Zone = "gate" | "hallway" | "project" | "stage" | "diploma" | "letter";

export type JourneyInput = {
  letter: { salutation: string; title: string; body: string };
  memories: Memory[];
  galleries: Gallery[];
  hostName: string;
  muted: boolean;
  mode: "play" | "replay";
};

export type JourneyCallbacks = {
  onZone(zone: Zone): void;
  onMuteChange(muted: boolean): void;
  /** The host shows the photo gallery of that school year (1-4) and calls `done` when the guest closes it. */
  onGallery(year: number, done: () => void): void;
  /** Crisp HTML memory card (not drawn in the pixel canvas). */
  onMemory(memory: Memory, done: () => void): void;
  /** Bottom caption strip while near a hung photo; `null` when the guest walks away. */
  onFeatured(preview: FeaturedPreview | null): void;
  /** The host shows the personal letter as crisp HTML and calls `done` when the guest enters the card. */
  onLetter(done: () => void): void;
  onFinish(reason: "completed" | "skipped"): void;
};

export type JourneyHandle = {
  setMuted(muted: boolean): void;
  skipCutscene(): void;
  destroy(): void;
};

export type GameContext = {
  input: JourneyInput;
  cb: JourneyCallbacks;
  fonts: { pixel: string; hand: string };
  finish(reason: "completed" | "skipped"): void;
  zone(zone: Zone): void;
  /** Starts the music loop (campus "loop", building "hall", graduation "grad") if audio is unlocked and loaded; switching tracks crossfades (FR-026). */
  startMusic(track?: "loop" | "hall" | "grad"): void;
};

/** Tile size of the top-down world (Kenney + generated art are all 16x16 based). */
export const T = 16;

/** Current logical (internal) viewport size and the integer CSS zoom (set by game/index.ts on resize). */
export function view(scene: Phaser.Scene): { w: number; h: number; zoom: number; portrait: boolean } {
  const w = scene.scale.width;
  const h = scene.scale.height;
  const zoom = (scene.game.registry.get("zoom") as number | undefined) ?? 2;
  return { w, h, zoom, portrait: h > w * 1.1 };
}

export function ctx(scene: Phaser.Scene): GameContext {
  return scene.game.registry.get("ctx") as GameContext;
}

export function unlocked(scene: Phaser.Scene): boolean {
  return scene.game.registry.get("unlocked") === true;
}

/** Plays a sound effect only after the first user input and only if the asset loaded (FR-026). */
export function sfx(scene: Phaser.Scene, key: string, volume = 0.5): void {
  if (!unlocked(scene) || !scene.cache.audio.exists(key)) return;
  scene.sound.play(key, { volume });
}

/** True on devices where the on-screen D-pad should be shown. */
export function isTouch(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia?.("(pointer: coarse)").matches;
}

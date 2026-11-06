import Phaser from "phaser";
import type { GameContext, JourneyCallbacks, JourneyHandle, JourneyInput } from "./context";
import { Keys } from "./input";
import Boot from "./scenes/Boot";
import Campus from "./scenes/Campus";
import Hallway from "./scenes/Hallway";
import Letter from "./scenes/Letter";
import Stage from "./scenes/Stage";
import { applyResolution } from "./ui/text";

export type { JourneyCallbacks, JourneyHandle, JourneyInput } from "./context";

/** Every Vietnamese letter (precomposed block U+1EA0..U+1EF9 plus Ă Â Ê Ô Ơ Ư Đ ...) and the combining marks. */
const VN_SAMPLE =
  "ĂÂÊÔƠƯĐăâêôơưđÀÁÃÈÉÌÍÒÓÕÙÚÝàáãèéìíòóõùúýĨĩŨũ — · …̣̀́̃̉" +
  Array.from({ length: 0x1efa - 0x1ea0 }, (_, i) => String.fromCharCode(0x1ea0 + i)).join("");

function cssFont(parent: HTMLElement, variable: string, fallback: string): string {
  const v = getComputedStyle(parent).getPropertyValue(variable).trim();
  return v ? `${v}, ${fallback}` : fallback;
}

/**
 * Picks the internal resolution for the container: an integer CSS zoom so every game pixel is a whole
 * number of device pixels (crisp pixel art), with a logical size that fills the container. Portrait
 * phones use a wider logical view (~280 px) so frames and path stay readable without clipping captions.
 */
export function computeView(cw: number, ch: number): { zoom: number; w: number; h: number } {
  const portrait = ch > cw * 1.1;
  const targetW = portrait ? 280 : 420;
  // capped at 4: on big desktop monitors a higher zoom makes everything (text, pillar) look oversized
  let zoom = Math.min(4, Math.max(1, Math.round(cw / targetW)));
  while (zoom > 1 && ch / zoom < 180) zoom--;
  return { zoom, w: Math.max(160, Math.floor(cw / zoom)), h: Math.max(160, Math.floor(ch / zoom)) };
}

/**
 * Entry point of the journey (contracts/journey-bridge.md). Client-only: imported with a dynamic
 * import after hydration so Phaser never lands in the card's first-load JavaScript.
 * `onFinish` is called exactly once per run; `destroy()` never calls it.
 */
export function startJourney(parent: HTMLElement, input: JourneyInput, cb: JourneyCallbacks): JourneyHandle {
  let game: Phaser.Game | null = null;
  let destroyed = false;
  let finished = false;
  let unlocked = false;
  let music: Phaser.Sound.BaseSound | null = null;
  let muted = input.muted;
  let keys: Keys | null = null;
  let observer: ResizeObserver | null = null;

  const finish = (reason: "completed" | "skipped") => {
    if (finished || destroyed) return;
    finished = true;
    cb.onFinish(reason);
  };

  let track = "loop";
  let musicKey = "";
  const startMusic = (want?: string) => {
    if (want) track = want;
    if (!game || !unlocked) return;
    const key = game.cache.audio.exists(track) ? track : "loop";
    if (music && musicKey === key) return;
    if (!game.cache.audio.exists(key)) return;
    const old = music;
    if (old) {
      old.stop();
      old.destroy();
    }
    musicKey = key;
    music = game.sound.add(key, { loop: true, volume: 0.35 });
    music.play();
  };

  // Audio stays off until the guest's first interaction anywhere on the page (FR-026).
  const unlock = () => {
    unlocked = true;
    game?.registry.set("unlocked", true);
    startMusic();
    remove();
  };
  const remove = () => {
    document.removeEventListener("pointerdown", unlock, true);
    document.removeEventListener("keydown", unlock, true);
  };
  document.addEventListener("pointerdown", unlock, true);
  document.addEventListener("keydown", unlock, true);

  const fonts = {
    pixel: cssFont(parent, "--font-jakarta", "system-ui, sans-serif"),
    hand: cssFont(parent, "--font-dancing", "cursive"),
  };

  (async () => {
    try {
      // Phaser text needs the faces ready before the first Text object is created.
      // The sample matters: next/font splits each face into unicode-range subsets (latin, latin-ext,
      // vietnamese) that load lazily, so without it Phaser would measure and draw with a fallback font
      // for every Vietnamese-only glyph.
      await Promise.all([document.fonts.load(`bold 16px ${fonts.pixel}`, VN_SAMPLE), document.fonts.load(`20px ${fonts.hand}`, VN_SAMPLE), document.fonts.load(`bold 20px ${fonts.hand}`, VN_SAMPLE)]);
    } catch {
      // fall back to the generic family
    }
    if (destroyed) return;

    const gameCtx: GameContext = {
      input,
      cb,
      fonts,
      finish,
      zone: (z) => cb.onZone(z),
      startMusic,
    };

    keys = new Keys();
    const box = parent.getBoundingClientRect();
    const first = computeView(box.width || 375, box.height || 600);
    game = new Phaser.Game({
      type: Phaser.AUTO,
      parent,
      width: first.w,
      height: first.h,
      pixelArt: true,
      roundPixels: true,
      backgroundColor: "#5eb04d",
      scale: { mode: Phaser.Scale.NONE, zoom: first.zoom, autoCenter: Phaser.Scale.CENTER_BOTH },
      input: { activePointers: 3, keyboard: false },
      scene: [Boot, Campus, Hallway, Stage, Letter],
      callbacks: {
        preBoot: (g) => {
          g.registry.set("ctx", gameCtx);
          g.registry.set("unlocked", unlocked);
          g.registry.set("keys", keys);
          g.registry.set("zoom", first.zoom);
        },
      },
    });
    const g = game;
    // Opt-in debug handle for screenshot/QA scripts: localStorage["journey-debug"] = "1".
    try {
      if (window.localStorage.getItem("journey-debug") === "1") (window as unknown as { __journey?: Phaser.Game }).__journey = g;
    } catch {
      // storage unavailable
    }
    const refit = () => {
      const r = parent.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const v = computeView(r.width, r.height);
      if (v.zoom !== g.registry.get("zoom")) {
        g.registry.set("zoom", v.zoom);
        g.scale.setZoom(v.zoom);
        for (const sc of g.scene.getScenes(true)) applyResolution(sc, v.zoom);
      }
      if (v.w !== g.scale.width || v.h !== g.scale.height) g.scale.resize(v.w, v.h);
    };
    observer = new ResizeObserver(refit);
    observer.observe(parent);
    game.sound.mute = muted;
  })().catch(() => finish("skipped"));

  return {
    setMuted(m: boolean) {
      muted = m;
      if (game) game.sound.mute = m; // audio stays off until first input regardless (see unlock)
      cb.onMuteChange(m);
    },
    skipCutscene() {
      const fn = game?.registry.get("skipCutscene") as (() => void) | null | undefined;
      fn?.();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      remove();
      music = null;
      observer?.disconnect();
      keys?.destroy();
      game?.destroy(true);
      game = null;
    },
  };
}

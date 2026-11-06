export type Dir = "down" | "left" | "right" | "up";

const DIR_KEYS: Record<string, Dir> = {
  ArrowDown: "down",
  KeyS: "down",
  ArrowUp: "up",
  KeyW: "up",
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
};

const ACTION_KEYS = new Set(["KeyE", "Space", "Enter", "Escape"]);

/**
 * Game-wide keyboard state, attached to `window` once per game and NOT tied to any scene. Phaser's
 * per-scene Key objects forget keys that are already held when a scene starts; this does not, so
 * holding an arrow across a scene change keeps walking. Four directions only: the most recently
 * pressed direction that is still held wins.
 */
export class Keys {
  private order: Dir[] = [];
  private held = new Set<string>();
  private listeners = new Set<(code: string) => void>();
  private active = true;

  constructor() {
    window.addEventListener("keydown", this.down, true);
    window.addEventListener("keyup", this.up, true);
    window.addEventListener("blur", this.reset);
    document.addEventListener("visibilitychange", this.reset);
  }

  private down = (e: KeyboardEvent) => {
    if (!this.active) return;
    // Space / Enter on a focused host button must still activate that button
    const t = e.target as HTMLElement | null;
    if ((e.code === "Space" || e.code === "Enter") && t?.closest?.("button,a,input,textarea,select")) return;
    const dir = DIR_KEYS[e.code];
    if (dir || ACTION_KEYS.has(e.code)) {
      // the overlay owns these keys: no page scroll, no button re-activation behind the game
      if (e.code === "Space" || dir) e.preventDefault();
    }
    if (e.repeat) return;
    this.held.add(e.code);
    if (dir) {
      this.order = this.order.filter((d) => d !== dir);
      this.order.push(dir);
    } else if (ACTION_KEYS.has(e.code)) {
      for (const fn of this.listeners) fn(e.code);
    }
  };

  private up = (e: KeyboardEvent) => {
    this.held.delete(e.code);
    const dir = DIR_KEYS[e.code];
    if (dir) {
      // another key mapped to the same direction may still be held (W and ArrowUp)
      const still = Object.entries(DIR_KEYS).some(([code, d]) => d === dir && this.held.has(code));
      if (!still) this.order = this.order.filter((d) => d !== dir);
    }
  };

  private reset = () => {
    this.held.clear();
    this.order = [];
  };

  /** All held direction keys combined into a vector (-1..1 per axis), so two keys walk diagonally. */
  vec(): { x: number; y: number } {
    let x = 0;
    let y = 0;
    for (const code of this.held) {
      const d = DIR_KEYS[code];
      if (d === "left") x -= 1;
      else if (d === "right") x += 1;
      else if (d === "up") y -= 1;
      else if (d === "down") y += 1;
    }
    return { x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) };
  }

  /** The direction currently asked for by the keyboard, or null. */
  dir(): Dir | null {
    return this.order.length ? this.order[this.order.length - 1] : null;
  }

  /** Subscribes to E / Space / Enter / Esc presses. Returns the unsubscribe function. */
  onAction(fn: (code: string) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  destroy() {
    this.active = false;
    window.removeEventListener("keydown", this.down, true);
    window.removeEventListener("keyup", this.up, true);
    window.removeEventListener("blur", this.reset);
    document.removeEventListener("visibilitychange", this.reset);
    this.listeners.clear();
  }
}

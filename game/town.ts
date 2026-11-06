import Phaser from "phaser";
import { T } from "./context";
import { rng } from "./world";

/** Places an atlas sprite standing on (x, y): origin bottom-centre, depth = y (painter's order). */
export function put(scene: Phaser.Scene, frame: string, x: number, y: number, o: { depth?: number; flip?: boolean; alpha?: number; origin?: [number, number] } = {}) {
  const img = scene.add.image(Math.round(x), Math.round(y), "atlas", frame);
  const [ox, oy] = o.origin ?? [0.5, 1];
  img.setOrigin(ox, oy).setDepth(o.depth ?? y);
  if (o.flip) img.setFlipX(true);
  if (o.alpha !== undefined) img.setAlpha(o.alpha);
  return img;
}

export type Kind = "g" | "p" | "q" | "w" | "c" | "k" | "s" | "x" | null;

/** A tile-kind grid: paint rectangles, then resolve to atlas frame names (kerbs/edges are automatic). */
export class Grid {
  kinds: Kind[][];
  constructor(public cols: number, public rows: number, fill: Kind = "g") {
    this.kinds = Array.from({ length: rows }, () => Array<Kind>(cols).fill(fill));
  }
  rect(x0: number, y0: number, x1: number, y1: number, k: Kind) {
    for (let y = Math.max(0, y0); y <= Math.min(this.rows - 1, y1); y++) {
      for (let x = Math.max(0, x0); x <= Math.min(this.cols - 1, x1); x++) this.kinds[y][x] = k;
    }
  }
  at(x: number, y: number): Kind {
    if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return null;
    return this.kinds[y][x];
  }

  /** Resolves every tile to a frame name. */
  names(seed = 7): (string | null)[][] {
    const r = rng(seed);
    const paved = (k: Kind) => k === "p" || k === "q";
    return this.kinds.map((row, y) =>
      row.map((k, x) => {
        if (k === null) return null;
        if (k === "g") {
          const v = r();
          return `grass_${v < 0.55 ? 0 : v < 0.8 ? 1 : v < 0.92 ? 2 : v < 0.97 ? 4 : 5}`;
        }
        if (k === "p" || k === "q") {
          const edge = (dx: number, dy: number) => {
            const o = this.at(x + dx, y + dy);
            return o !== null && !paved(o) && o !== "x";
          };
          const n = edge(0, -1);
          const s = edge(0, 1);
          const w = edge(-1, 0);
          const e = edge(1, 0);
          const base = k === "p" ? "pave" : "plaza";
          const suf = (n ? "n" : s ? "s" : "") + (w ? "w" : e ? "e" : "");
          if (suf) return `${base}_${suf}`;
          if (k === "q") return (x + y) % 2 === 0 ? "plaza_a" : "plaza_b";
          return `pave_${Math.floor(r() * 4)}`;
        }
        if (k === "w") return `wood_${(x * 3 + y) % 3}`;
        if (k === "c") return (x + y) % 2 === 0 ? "check_a" : "check_b";
        if (k === "k") return "carpet_c";
        if (k === "s") return "stage_floor";
        return `grass_0`;
      }),
    );
  }
}

export const px = (tiles: number) => tiles * T;

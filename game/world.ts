import Phaser from "phaser";
import { T, sfx, view } from "./context";
import type { Dir, Keys } from "./input";
import { label } from "./ui/text";
import { randomMeme } from "./memes";

export type Pt = { x: number; y: number };
export type Rect = { x0: number; y0: number; x1: number; y1: number };

const ROW: Record<Dir, number> = { down: 0, left: 1, right: 2, up: 3 };
export type Outfit = "freshman" | "student" | "graduate";

/** Pixel position of a tile coordinate (centre of the tile). */
export const tc = (t: number) => t * T + T / 2;

/**
 * The one-way path of a scene: an axis-aligned polyline plus the rectangles around it the host may
 * stand on. Nothing can block progress: the host is always inside the union of the rectangles and
 * every rectangle is connected to the polyline.
 */
export class Walk {
  constructor(public rects: Rect[], public path: Pt[]) {}

  inside(x: number, y: number): boolean {
    return this.rects.some((r) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1);
  }

  /** Nearest point on the polyline to p and its arc length from the start. */
  project(p: Pt): { s: number; pt: Pt } {
    let best = { s: 0, pt: this.path[0], d: Infinity };
    let acc = 0;
    for (let i = 0; i < this.path.length - 1; i++) {
      const a = this.path[i];
      const b = this.path[i + 1];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      const t = len === 0 ? 0 : Phaser.Math.Clamp(((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / (len * len), 0, 1);
      const pt = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      const d = Math.hypot(p.x - pt.x, p.y - pt.y);
      if (d < best.d) best = { s: acc + len * t, pt, d };
      acc += len;
    }
    return { s: best.s, pt: best.pt };
  }

  /** Waypoints from arc length s0 to s1 (inclusive of the vertices in between). */
  between(s0: number, s1: number): Pt[] {
    const out: Pt[] = [];
    let acc = 0;
    const fwd = s1 >= s0;
    const lo = Math.min(s0, s1);
    const hi = Math.max(s0, s1);
    for (let i = 0; i < this.path.length; i++) {
      if (i > 0) acc += Math.hypot(this.path[i].x - this.path[i - 1].x, this.path[i].y - this.path[i - 1].y);
      if (acc > lo && acc < hi) out.push(this.path[i]);
    }
    return fwd ? out : out.reverse();
  }

  get length(): number {
    let acc = 0;
    for (let i = 1; i < this.path.length; i++) acc += Math.hypot(this.path[i].x - this.path[i - 1].x, this.path[i].y - this.path[i - 1].y);
    return acc;
  }
}

export const SPEED = 118; // px/s ≈ 7.4 tiles/s — snappy on phones without feeling like a sprint
/** Tap-to-walk is a bit faster than held input so long campus taps don't drag. */
const TAP_SPEED = 168;

/** The host: 4-direction walking with keyboard, D-pad, and tap-to-walk along the path. */
export default class Hero {
  readonly sprite: Phaser.GameObjects.Sprite;
  private shadowSpr: Phaser.GameObjects.Image;
  private dir: Dir = "up";
  private route: Pt[] = [];
  private stepAt = 0;
  private outfit: Outfit;
  frozen = false;
  /** Set by the D-pad buttons. */
  padDir: Dir | null = null;
  /** Analog joystick vector (-1..1 per axis); lets the host walk diagonally. */
  padVec: { x: number; y: number } | null = null;

  releasePad() {
    this.padDir = null;
    this.padVec = null;
  }

  constructor(private scene: Phaser.Scene, private walk: Walk, x: number, y: number, outfit: Outfit, private keys: Keys) {
    this.outfit = outfit;
    this.shadowSpr = scene.add.image(x, y - 1, "atlas", "shadow_player").setDepth(1);
    this.sprite = scene.add.sprite(x, y, `host-${outfit}`, ROW.up * 5).setOrigin(0.5, 0.94);
    this.sync();
  }

  get x() {
    return this.sprite.x;
  }
  get y() {
    return this.sprite.y;
  }

  setOutfit(o: Outfit) {
    this.outfit = o;
    this.idle();
  }

  face(d: Dir) {
    this.dir = d;
    this.idle();
  }

  private idle() {
    this.sprite.anims.stop();
    this.sprite.setTexture(`host-${this.outfit}`, ROW[this.dir] * 5);
  }

  private play() {
    this.sprite.anims.play(`walk-${this.outfit}-${this.dir}`, true);
  }

  private sync() {
    this.sprite.setDepth(this.sprite.y);
    this.shadowSpr.setPosition(Math.round(this.sprite.x), Math.round(this.sprite.y) - 1);
  }

  /** Tap-to-walk: head for the point of the path nearest to (x, y), following the path. */
  walkTo(x: number, y: number) {
    const target = this.walk.inside(x, y) ? { x, y } : this.walk.project({ x, y }).pt;
    const s0 = this.walk.project(this.sprite).s;
    const s1 = this.walk.project(target).s;
    this.route = [...this.walk.between(s0, s1), target];
  }

  cancelRoute() {
    this.route = [];
  }

  /** Moves the host along `pts` ignoring controls (cutscenes). Resolves when done. */
  autoWalk(pts: Pt[], speed = SPEED * 0.85): Promise<void> {
    return new Promise((resolve) => {
      this.frozen = true;
      this.route = [];
      let i = 0;
      const step = (_t: number, dt: number) => {
        if (!this.sprite.active) {
          this.scene.events.off("update", step);
          return resolve();
        }
        const p = pts[i];
        if (!p) {
          this.scene.events.off("update", step);
          this.idle();
          return resolve();
        }
        const dx = p.x - this.sprite.x;
        const dy = p.y - this.sprite.y;
        const move = (speed * dt) / 1000;
        if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
          i++;
          return;
        }
        if (Math.abs(dx) > 0.5) {
          this.dir = dx < 0 ? "left" : "right";
          this.sprite.x += Math.sign(dx) * Math.min(Math.abs(dx), move);
        } else {
          this.dir = dy < 0 ? "up" : "down";
          this.sprite.y += Math.sign(dy) * Math.min(Math.abs(dy), move);
        }
        this.play();
        this.sync();
      };
      this.scene.events.on("update", step);
    });
  }

  private canStand(x: number, y: number) {
    return this.walk.inside(x - 4, y) && this.walk.inside(x + 4, y);
  }

  update(time: number, delta: number) {
    if (this.frozen) return;
    const dt = delta / 1000;
    // manual control (held keys or the joystick) walks freely in 8 directions and wins over tap-to-walk
    const kv = this.keys.vec();
    const mv = kv.x || kv.y ? kv : this.padVec;
    if (mv && (mv.x || mv.y)) {
      this.route = [];
      const len = Math.hypot(mv.x, mv.y);
      const k = Math.min(1, len) / len;
      const vx = mv.x * k * SPEED * dt;
      const vy = mv.y * k * SPEED * dt;
      this.dir = Math.abs(mv.x) > Math.abs(mv.y) ? (mv.x < 0 ? "left" : "right") : mv.y < 0 ? "up" : "down";
      const x = this.sprite.x;
      const y = this.sprite.y;
      let moved = true;
      if (this.canStand(x + vx, y + vy)) this.sprite.setPosition(x + vx, y + vy);
      else if (vx && this.canStand(x + vx, y)) this.sprite.setPosition(x + vx, y); // slide along walls
      else if (vy && this.canStand(x, y + vy)) this.sprite.setPosition(x, y + vy);
      else moved = false;
      if (moved) {
        this.play();
        if (time > this.stepAt) {
          sfx(this.scene, "step", 0.2);
          this.stepAt = time + 220;
        }
      } else {
        this.idle();
      }
      this.sync();
      return;
    }
    let want: Dir | null = null;

    let vx = 0;
    let vy = 0;
    if (!want && this.route.length) {
      const p = this.route[0];
      const dx = p.x - this.sprite.x;
      const dy = p.y - this.sprite.y;
      if (Math.abs(dx) < 1.5 && Math.abs(dy) < 1.5) {
        this.route.shift();
      } else {
        // finish the longer axis first so the L-shaped detour stays inside the corridor
        want = Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? "left" : "right") : dy < 0 ? "up" : "down";
        if (Math.abs(dx) < 1.5) want = dy < 0 ? "up" : "down";
        if (Math.abs(dy) < 1.5) want = dx < 0 ? "left" : "right";
      }
    }
    if (want) {
      this.dir = want;
      const tapping = this.route.length > 0;
      const d = (tapping ? TAP_SPEED : SPEED) * dt;
      if (want === "left") vx = -d;
      if (want === "right") vx = d;
      if (want === "up") vy = -d;
      if (want === "down") vy = d;
      // snap to the target on the last pixels of a route so we never oscillate
      if (tapping) {
        const p = this.route[0];
        if (vx) vx = Phaser.Math.Clamp(p.x - this.sprite.x, -Math.abs(vx), Math.abs(vx));
        if (vy) vy = Phaser.Math.Clamp(p.y - this.sprite.y, -Math.abs(vy), Math.abs(vy));
      }
      const nx = this.sprite.x + vx;
      const ny = this.sprite.y + vy;
      let moved = false;
      if (this.canStand(nx, ny)) {
        this.sprite.setPosition(nx, ny);
        moved = true;
      } else if (this.route.length) {
        this.route = []; // blocked: give up the tap target, never get stuck
      }
      if (moved) {
        this.play();
        if (time > this.stepAt) {
          sfx(this.scene, "step", 0.2);
          this.stepAt = time + (tapping ? 180 : 220);
        }
      } else {
        this.idle();
      }
    } else {
      this.idle();
    }
    this.sync();
  }
}

/** Anim set for the host outfits and the NPC sheets: walk-<key>-<dir>. */
export function makeWalkAnims(scene: Phaser.Scene, keys: string[]) {
  for (const k of keys) {
    for (const d of ["down", "left", "right", "up"] as Dir[]) {
      const id = `walk-${k}-${d}`;
      if (scene.anims.exists(id)) continue;
      const r = ROW[d] * 5;
      scene.anims.create({
        key: id,
        frames: [1, 2, 3, 4].map((i) => ({ key: k.startsWith("npc") ? k : `host-${k}`, frame: r + i })),
        frameRate: 12,
        repeat: -1,
      });
    }
  }
}

/** A passer-by that strolls along a loop of waypoints (decoration only). */
export class Npc {
  readonly sprite: Phaser.GameObjects.Sprite;
  private i = 0;
  private wait = 0;
  private dir: Dir = "down";

  constructor(private scene: Phaser.Scene, private key: string, private pts: Pt[], private speed = 22, private idleAt = -1) {
    this.sprite = scene.add.sprite(pts[0].x, pts[0].y, key, 0).setOrigin(0.5, 0.94);
    scene.events.on("update", this.tick, this);
    scene.events.once("shutdown", () => scene.events.off("update", this.tick, this));
    this.sprite.setDepth(this.sprite.y);
    this.nextSay = 1500 + Math.random() * 3500;
  }

  private bubble?: Phaser.GameObjects.Text;
  private bubbleLeft = 0;
  private nextSay = 0;
  private last?: string;

  private say() {
    const text = randomMeme(this.last);
    this.last = text;
    this.bubble?.destroy();
    this.bubble = label(this.scene, this.sprite.x, this.sprite.y - 30, text, {
      size: 12, color: "#1a1030", stroke: null, bg: "#fff6d6", pad: [4, 2], wrap: 150, align: "center", origin: [0.5, 1],
    }).setDepth(100000);
    this.bubbleLeft = 3200;
    this.nextSay = 3000 + Math.random() * 4000;
  }

  private tick = (_t: number, dt: number) => {
    if (!this.sprite.active) return;
    if (this.bubble) {
      this.bubbleLeft -= dt;
      this.bubble.setPosition(Math.round(this.sprite.x), Math.round(this.sprite.y - 30));
      if (this.bubbleLeft <= 0) { this.bubble.destroy(); this.bubble = undefined; }
    } else if ((this.nextSay -= dt) <= 0) {
      this.say();
    }
    if (this.wait > 0) {
      this.wait -= dt;
      this.sprite.anims.stop();
      this.sprite.setFrame({ down: 0, left: 5, right: 10, up: 15 }[this.dir]);
      return;
    }
    const target = this.pts[(this.i + 1) % this.pts.length];
    const dx = target.x - this.sprite.x;
    const dy = target.y - this.sprite.y;
    const step = (this.speed * dt) / 1000;
    if (Math.abs(dx) < 0.6 && Math.abs(dy) < 0.6) {
      this.i = (this.i + 1) % this.pts.length;
      if (this.i === this.idleAt || Math.random() < 0.3) this.wait = 1200 + Math.random() * 2200;
      return;
    }
    if (Math.abs(dx) >= 0.6) {
      this.dir = dx < 0 ? "left" : "right";
      this.sprite.x += Math.sign(dx) * Math.min(Math.abs(dx), step);
    } else {
      this.dir = dy < 0 ? "up" : "down";
      this.sprite.y += Math.sign(dy) * Math.min(Math.abs(dy), step);
    }
    this.sprite.anims.play(`walk-${this.key}-${this.dir}`, true);
    this.sprite.setDepth(this.sprite.y);
  };
}

/** Bakes a grid of atlas frame names into one canvas texture (one draw call for the whole ground). */
export function bakeGround(scene: Phaser.Scene, key: string, cols: number, rows: number, names: (string | null)[][], overlay?: (string | null)[][]) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, cols * T, rows * T);
  if (!tex) throw new Error("canvas texture");
  const ctx2 = tex.getContext();
  const atlas = scene.textures.get("atlas");
  const img = atlas.getSourceImage() as CanvasImageSource;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      for (const n of [names[y]?.[x], overlay?.[y]?.[x]]) {
        if (!n) continue;
        const f = atlas.get(n);
        ctx2.drawImage(img, f.cutX, f.cutY, f.cutWidth, f.cutHeight, x * T, y * T, T, T);
      }
    }
  }
  tex.refresh();
  return scene.add.image(0, 0, key).setOrigin(0).setDepth(-1000);
}

/** Simple seeded RNG so every run looks the same. */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Shared camera setup: follows the host, clamps to the world, centres worlds smaller than the view. */
export function followCamera(scene: Phaser.Scene, hero: Hero, worldW: number, worldH: number, bg = "#10162e") {
  const cam = scene.cameras.main;
  cam.setBackgroundColor(bg);
  cam.setBounds(0, 0, worldW, worldH);
  cam.startFollow(hero.sprite, true, 0.32, 0.32, 0, 0);
  cam.roundPixels = true;
  const fit = () => {
    const v = view(scene);
    cam.setSize(v.w, v.h);
    cam.followOffset.set(0, Math.round(v.h * 0.14)); // hero a little below centre: more of the way ahead is visible
    // world narrower than the view: centre it (Phaser clamps to the bounds, which would pin it left)
    if (worldW < v.w) cam.setBounds(-(v.w - worldW) / 2, 0, v.w, worldH);
    else cam.setBounds(0, 0, worldW, worldH);
  };
  fit();
  scene.scale.on("resize", fit);
  scene.events.once("shutdown", () => scene.scale.off("resize", fit));
}


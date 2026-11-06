import Phaser from "phaser";
import { ctx, isTouch, T } from "../context";
import { featuredMedia, type Featured } from "../featured";
import type Hero from "../world";
import type Hud from "./Hud";

export type FrameSlot = {
  cx: number;
  base: number;
  depth: number;
  box: Phaser.GameObjects.Container;
  featured: Featured;
  active: boolean;
};

type HangOpts = {
  laneL: number;
  laneR: number;
  /** x of the marker posts on the left / right side (defaults to just outside the lane). */
  wallL?: number;
  wallR?: number;
};

/**
 * A milestone is a small pixel-art object that belongs to the memory (paper plane, lighthouse, camera, cake ...;
 * see tools/marker_art.py, frame `mk_<beat id>`). Walking up to it opens the photos in the HTML card
 * (see tickFrames); photos are never drawn in the pixel canvas.
 */
export function hangFrame(scene: Phaser.Scene, f: Featured, o: HangOpts): FrameSlot {
  const cx = f.side === "l" ? (o.wallL ?? o.laneL - 16) : (o.wallR ?? o.laneR + 16);
  const base = f.y * T;
  const d = base + 2;
  const box = scene.add.container(cx, base).setDepth(d);
  const key = `mk_${f.id}`;
  const spr = scene.add.image(0, 0, "atlas", scene.textures.get("atlas").has(key) ? key : "signpost").setOrigin(0.5, 1);
  const glow = scene.add.image(0, -spr.height * 0.55, "atlas", "glow64").setBlendMode(Phaser.BlendModes.ADD).setScale(1.1).setAlpha(0.12);
  box.add([glow, spr]);
  scene.tweens.add({ targets: glow, alpha: { from: 0.05, to: 0.32 }, duration: 1200 + (f.y % 5) * 140, yoyo: true, repeat: -1 });
  return { cx, base, depth: d, box, featured: f, active: false };
}

export function bindFrameHit(
  scene: Phaser.Scene,
  slot: FrameSlot,
  hud: Hud,
  hero: Hero,
  laneX: (side: "l" | "r") => number,
) {
  const hit = scene.add
    .rectangle(slot.cx, slot.base - 22, 3 * T, 64, 0xffffff, 0)
    .setDepth(slot.depth + 4)
    .setInteractive({ useHandCursor: true });
  hit.on("pointerdown", () => {
    if (hud.modalOpen) return;
    if (Math.abs(hero.y - slot.base) < 28) hud.openGallery(slot.featured.year);
    else if (!isTouch()) hero.walkTo(laneX(slot.featured.side), slot.base);
  });
}

export function tickFrames(
  scene: Phaser.Scene,
  frames: FrameSlot[],
  hero: Hero,
  featuredId: { current: string | null },
): FrameSlot | null {
  let nearFr: FrameSlot | null = null;
  for (const fr of frames) {
    const near = Math.abs(hero.y - fr.base) < 34 && Math.abs(hero.x - fr.cx) < 100;
    if (near && !nearFr) nearFr = fr;
    if (near !== fr.active) {
      fr.active = near;
      // the photos open in the HTML card; in the world the post just grows a little
      scene.tweens.killTweensOf(fr.box);
      fr.box.setDepth(near ? 4000 : fr.depth);
      scene.tweens.add({ targets: fr.box, scale: near ? 1.2 : 1, duration: 220, ease: "Sine.easeOut" });
    }
  }
  const id = nearFr?.featured.id ?? null;
  if (id !== featuredId.current) {
    featuredId.current = id;
    if (nearFr) {
      const photos = featuredMedia(ctx(scene).input.galleries, nearFr.featured);
      ctx(scene).cb.onFeatured({ title: nearFr.featured.title, caption: nearFr.featured.caption, photos });
    } else {
      ctx(scene).cb.onFeatured(null);
    }
  }
  return nearFr;
}

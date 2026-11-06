import Phaser from "phaser";
import { ctx, view } from "../context";

type LabelOpts = {
  size?: number;
  color?: string;
  stroke?: string | null;
  align?: "left" | "center" | "right";
  wrap?: number;
  origin?: [number, number];
  font?: "pixel" | "hand";
  bg?: string;
  pad?: [number, number];
  depth?: number;
  fixed?: boolean;
  lineSpacing?: number;
};

const MARK_PAD = 4;

/**
 * The game canvas is rendered at game-pixel size and scaled up by CSS, so a text pixel can never be sharper than a
 * game pixel. VT323's stacked Vietnamese marks (1/25 em thick) vanish at that size, so the in-game "pixel" text role
 * uses Plus Jakarta Sans Bold (full Vietnamese coverage, marks designed for small sizes). `size` keeps the old VT323
 * scale used all over the scenes; it is converted here (Jakarta is wider and taller per px).
 */
export function gameFontSize(size: number): number {
  return Math.max(8, Math.round(size * 0.75));
}

/**
 * Text that stays crisp under the integer CSS zoom: rendered at `resolution = zoom` so one text pixel
 * maps to one device pixel (game/index.ts re-applies it when the zoom changes).
 */
export function label(scene: Phaser.Scene, x: number, y: number, text: string, o: LabelOpts = {}): Phaser.GameObjects.Text {
  const fonts = ctx(scene).fonts;
  const t = scene.add.text(Math.round(x), Math.round(y), text, {
    fontFamily: o.font === "hand" ? fonts.hand : fonts.pixel,
    fontSize: `${o.font === "hand" ? (o.size ?? 16) : gameFontSize(o.size ?? 16)}px`,
    fontStyle: o.font === "hand" ? undefined : "bold",
    color: o.color ?? "#ffffff",
    align: o.align ?? "left",
    wordWrap: o.wrap ? { width: o.wrap, useAdvancedWrap: true } : undefined,
    stroke: o.stroke === null ? undefined : (o.stroke ?? "#1a1030"),
    strokeThickness: o.stroke === null ? 0 : 3,
    backgroundColor: o.bg,
    // Vietnamese stacked marks (Ẫ Ể Ợ) rise above the font's measured ascent and sink below the descent:
    // Phaser sizes the text canvas from those metrics, so always leave room above and below.
    padding: { x: o.pad ? o.pad[0] : 0, y: Math.max(o.pad ? o.pad[1] : 0, MARK_PAD, Math.ceil((o.size ?? 16) * 0.3)) },
  });
  t.setLineSpacing(o.lineSpacing ?? MARK_PAD);
  t.setResolution(view(scene).zoom);
  // oversampled text is averaged down to the game-pixel grid (a box filter at zoom 2) instead of nearest-sampled, which drops thin marks
  t.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
  const [ox, oy] = o.origin ?? [0.5, 0.5];
  t.setOrigin(ox, oy);
  if (o.depth !== undefined) t.setDepth(o.depth);
  if (o.fixed) t.setScrollFactor(0);
  return t;
}

/** Re-applies the text resolution to every Text in a scene (after the CSS zoom changed). */
export function applyResolution(scene: Phaser.Scene, zoom: number) {
  const walk = (list: Phaser.GameObjects.GameObject[]) => {
    for (const o of list) {
      if (o instanceof Phaser.GameObjects.Text) o.setResolution(zoom);
      else if (o instanceof Phaser.GameObjects.Container) walk(o.list);
    }
  };
  walk(scene.children.list);
}

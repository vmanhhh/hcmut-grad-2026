import Phaser from "phaser";
import { T, ctx, isTouch } from "../context";
import { FEATURED_INDOOR } from "../featured";
import type { Keys } from "../input";
import { Grid, put } from "../town";
import { bindFrameHit, hangFrame, tickFrames, type FrameSlot } from "../ui/frames";
import Hud from "../ui/Hud";
import { label } from "../ui/text";
import Hero, { Walk, bakeGround, followCamera } from "../world";

const COLS = 24;
const ROWS = 70;
const CX = (COLS * T) / 2;
const LANE_L = 6 * T;
const LANE_R = 18 * T;
const START_Y = 67 * T;
const EXIT_Y = 3 * T + 10;

/**
 * Indoor corridor: later memories hang on the walls as wooden frames (crisp photos via HTML).
 * No year billboards, no project alcove.
 */
export default class Hallway extends Phaser.Scene {
  private hero!: Hero;
  private hud!: Hud;
  private leaving = false;
  private zoned = false;
  private frames: FrameSlot[] = [];
  private nearFrame: FrameSlot | null = null;
  private featuredId = { current: null as string | null };

  constructor() {
    super("Hallway");
  }

  create() {
    const c = ctx(this);
    const keys = this.game.registry.get("keys") as Keys;
    this.leaving = false;
    this.zoned = false;
    this.frames = [];
    this.nearFrame = null;
    this.featuredId.current = null;
    this.events.once("shutdown", () => {
      if (this.featuredId.current !== null) {
        this.featuredId.current = null;
        ctx(this).cb.onFeatured(null);
      }
    });

    const g = new Grid(COLS, ROWS, null);
    g.rect(5, 3, 18, ROWS - 1, "w");
    const names = g.names();
    const over: (string | null)[][] = Array.from({ length: ROWS }, () => Array<string | null>(COLS).fill(null));
    for (let y = 3; y < ROWS; y++) {
      names[y][4] = "wallv_l";
      names[y][19] = "wallv_r";
      over[y][5] = "shade_l";
      over[y][18] = "shade_r";
      names[y][10] = "carpet_l";
      names[y][11] = "carpet_c";
      names[y][12] = "carpet_c";
      names[y][13] = "carpet_r";
    }
    for (let x = 5; x < 19; x++) {
      names[0][x] = "wall_cap";
      names[1][x] = "wall_up";
      names[2][x] = "wall_low";
      over[3][x] = "shade_n";
    }
    for (let y = 0; y < 3; y++) {
      names[y][4] = "wallv_l";
      names[y][19] = "wallv_r";
    }
    bakeGround(this, "hall-ground", COLS, ROWS, names as (string | null)[][], over);

    for (const mid of [58, 48, 38, 28, 18].map((r) => r * T)) {
      const left = mid % (32 * T) < 16 * T;
      // hallway furniture along the walls instead of benches: display easel, tall plant, bin, in turn
      const side = left ? -1 : 1;
      const kind = ["easel", "pot_plant", "k_bin_grey"][Math.floor(mid / (10 * T)) % 3];
      put(this, kind, CX + side * 66, mid + 4);
      put(this, "sconce", (left ? 5.3 : 18.7) * T, mid - 40, { depth: mid - 39 });
      put(this, "lamp_glow", (left ? 5.9 : 18.1) * T, mid - 34, { depth: -500, alpha: 0.5 })
        .setBlendMode(Phaser.BlendModes.ADD)
        .setOrigin(0.5, 0.5);
    }
    label(this, CX, 63 * T, "TRONG TÒA NHÀ", { size: 16, color: "#ffe9a8", depth: 2000 });
    put(this, "banner_blue", CX - 54, 16 + 2, { origin: [0.5, 0], depth: 40 });
    put(this, "banner_red", CX + 54, 16 + 2, { origin: [0.5, 0], depth: 40 });
    put(this, "door_small", CX, 3 * T, { depth: 60 });
    put(this, "pot_plant", CX + 70, 8.6 * T);
    put(this, "pot_plant", CX - 84, 15.6 * T);

    const strip = { x0: 5 * T + 10, x1: 19 * T - 10 }; // the whole corridor floor is walkable, not just the carpet
    const walk = new Walk(
      [{ x0: strip.x0, y0: EXIT_Y - 6, x1: strip.x1, y1: START_Y + 20 }],
      [
        { x: CX, y: START_Y },
        { x: CX, y: EXIT_Y },
      ],
    );
    this.hero = new Hero(this, walk, CX, START_Y, "student", keys);
    this.hero.face("up");
    followCamera(this, this.hero, COLS * T, ROWS * T, "#10162e");
    this.hud = new Hud(this, this.hero, keys, () => {
      if (this.nearFrame) this.hud.openGallery(this.nearFrame.featured.year);
    });

    for (const f of FEATURED_INDOOR) {
      const slot = hangFrame(this, f, { laneL: LANE_L, laneR: LANE_R, wallL: 5 * T + 32, wallR: 19 * T - 32 });
      bindFrameHit(this, slot, this.hud, this.hero, () => CX);
      this.frames.push(slot);
    }

    this.cameras.main.fadeIn(350);
    c.startMusic("hall");
  }

  update(time: number, delta: number) {
    if (this.leaving) return;
    this.hero.frozen = this.hud.modalOpen;
    this.hero.update(time, delta);

    if (!this.zoned) {
      this.zoned = true;
      ctx(this).zone("hallway");
    }

    const near = tickFrames(this, this.frames, this.hero, this.featuredId);
    if (near !== this.nearFrame) {
      this.nearFrame = near;
      this.hud.setInteractable(
        !!near,
        near ? (isTouch() ? `Chạm nút E · ${near.featured.title}` : `E / Space · ${near.featured.title}`) : "",
      );
    }

    if (this.hero.y <= EXIT_Y + 2 && !this.hud.modalOpen) {
      this.leaving = true;
      this.hero.frozen = true;
      this.hero.cancelRoute();
      this.cameras.main.fadeOut(350);
      this.cameras.main.once("camerafadeoutcomplete", () => this.scene.start("Stage"));
    }
  }
}

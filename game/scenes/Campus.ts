import Phaser from "phaser";
import { T, ctx, isTouch, view } from "../context";
import { FEATURED_OUTDOOR } from "../featured";
import type { Keys } from "../input";
import { Grid, put } from "../town";
import { bindFrameHit, hangFrame, tickFrames, type FrameSlot } from "../ui/frames";
import Hud from "../ui/Hud";
import { label } from "../ui/text";
import Hero, { Npc, Walk, bakeGround, followCamera, rng } from "../world";

const COLS = 32;
const ROWS = 104;
const CX = (COLS * T) / 2; // 256: centre line of the lane
const LANE_L = 13 * T; // paved lane x range: 208..304
const LANE_R = 19 * T;
const GATE_Y = 100 * T; // base line of the HCMUT gate
const START_Y = 101 * T; // just south of the gate: the whole pillar fits in a 266 px tall desktop view
const TOP_PAD = 40; // the camera may look this far above the map (the flag of the main hall reaches the top edge)

/** Main hall sprite (tools/hcmut_art.py MAIN_*): 336 x 214, the entrance centre is 164 px from its left edge, the sign fascia is 37..65. */
const HALL = { w: 336, h: 214, ex: 164, signY: 46 };
const DOOR_Y = 12 * T + 4; // top of the steps of the main hall: walking past this enters the building

/**
 * Zone "gate": the HCMUT gate (2022), then a one-way paved lane between hedge walls, through a park and
 * the town square up to the main hall. Top-down, 4-direction walking; no combat, no lives, nothing that
 * can block the path (FR-015). The lane is narrow on purpose: on a portrait phone the hedge walls on
 * both sides stay visible. Captions and hung photos use crisp HTML (onFeatured), not the pixel canvas.
 */
export default class Campus extends Phaser.Scene {
  private hero!: Hero;
  private hud!: Hud;
  private leaving = false;
  private fountainSpr: Phaser.GameObjects.Sprite | null = null;
  private frames: FrameSlot[] = [];
  private nearFrame: FrameSlot | null = null;
  private featuredId = { current: null as string | null };

  constructor() {
    super("Campus");
  }

  create() {
    const c = ctx(this);
    const keys = this.game.registry.get("keys") as Keys;
    this.leaving = false;
    this.frames = [];
    this.nearFrame = null;
    this.featuredId.current = null;
    this.events.once("shutdown", () => {
      if (this.featuredId.current !== null) {
        this.featuredId.current = null;
        ctx(this).cb.onFeatured(null);
      }
    });
    const r = rng(11);

    // ------------------------------------------------------------ ground
    const g = new Grid(COLS, ROWS, "g");
    g.rect(13, 12, 18, 103, "p"); // the lane
    g.rect(6, 12, 25, 29, "q"); // town square in front of the main hall
    g.rect(8, 99, 23, 103, "p"); // forecourt outside the gate
    g.rect(10, 60, 21, 77, "p"); // the park opens the lane up a little
    for (const y of [75, 52, 36]) g.rect(13, y, 18, y + 1, "q"); // inlaid plaza bands across the lane
    bakeGround(this, "campus-ground", COLS, ROWS, g.names(3));

    // ---------------------------------------------------- main building
    // asymmetric like the real building: anchored on the entrance, so the doors stay on the lane's centre line
    put(this, "main_hall", CX, 12 * T, { depth: 100, origin: [HALL.ex / HALL.w, 1] });
    // sign band: big blue name with a tiny second line; sized from the zoom so it stays crisp and legible
    const signTop = 12 * T - HALL.h + HALL.signY;
    const bigZoom = view(this).zoom >= 3;
    label(this, CX, signTop - 4, "TRƯỜNG ĐẠI HỌC BÁCH KHOA", { size: bigZoom ? 21 : 17, color: "#0d4a99", stroke: null, depth: 120 });
    label(this, CX, signTop + (bigZoom ? 14 : 12), "TP. HỒ CHÍ MINH", { size: 12, color: "#1c5db0", stroke: null, depth: 120 });
    for (let x = 0; x < 7; x++) put(this, x % 2 ? "hedge_a" : "hedge_b", x * T + 8, 14 * T, { depth: 90 });
    for (let x = 25; x < 32; x++) put(this, x % 2 ? "hedge_a" : "hedge_b", x * T + 8, 14 * T, { depth: 90 });
    for (const [x, y, k] of [
      [2, 6, "tree_a"],
      [6, 9, "palm_a"],
      [29, 7, "tree_b"],
      [25.5, 10, "palm_b"],
      [10, 4, "tree_c"],
      [22, 3, "tree_a"],
      [14, 2, "tree_b"],
    ] as [number, number, string][]) {
      put(this, k, x * T, y * T);
    }

    // ----------------------------------------------------- town square
    this.fountainSpr = this.add.sprite(9.2 * T, 26.5 * T, "atlas", "fountain_0").setOrigin(0.5, 1).setDepth(26.5 * T);
    this.fountainSpr.anims.play("fountain");
    for (const [x, y, k, f] of [
      [24, 18.5, "palm_c", false],
      [22.7, 25.5, "palm_a", true],
      [7, 16.5, "palm_b", false],
    ] as [number, number, string, boolean][]) {
      put(this, k, x * T, y * T, { flip: f });
    }
    put(this, "bench", 22.5 * T, 22 * T);
    put(this, "bench", 6.8 * T, 29.2 * T);
    put(this, "pot_plant", 11.3 * T, 14.3 * T);
    put(this, "pot_plant", 20.7 * T, 14.3 * T);
    put(this, "umbrella_blue", 23.5 * T, 28.5 * T);

    // ----------------------------------------------------- the gate
    // fences first, then the grey walls over their ends
    for (let x = 0; x < 5; x++) put(this, "fence", x * T, GATE_Y, { origin: [0, 1] });
    for (let x = 24; x < 32; x++) put(this, "fence", x * T, GATE_Y, { origin: [0, 1] });
    // massive blue glass pillar with the BK hexagon on top (left of the opening), grey walls on both sides
    const OPEN_L = CX - 32; // the opening is 64 px wide: x 224..288
    const OPEN_R = CX + 32;
    const PILLAR_X = OPEN_L - 36;
    put(this, "gate_wall", OPEN_R, GATE_Y, { origin: [0, 1], depth: GATE_Y - 1 });
    put(this, "gate_wall", OPEN_L - 40, GATE_Y, { origin: [1, 1], depth: GATE_Y - 1 }).setFlipX(true);
    put(this, "hcmut_gate", PILLAR_X, GATE_Y, { depth: GATE_Y });
    put(this, "flag_vn", OPEN_R + 90, GATE_Y - 4, { depth: GATE_Y - 2 });
    // address on the right wall (wall top is 91 px above the gate line; its panel spans 12..76 px below the top).
    // On a portrait phone only ~40 px of that wall is on screen, so the lines are short and stacked.
    const narrow = view(this).portrait;
    const wallTop = GATE_Y - 91;
    const addr = { color: "#f1f5fb", stroke: null, depth: GATE_Y } as const;
    if (narrow) {
      const ax = OPEN_R + 22;
      label(this, ax, wallTop + 24, "268", { ...addr, size: 22, color: "#ffffff" });
      label(this, ax, wallTop + 43, "LÝ", { ...addr, size: 14 });
      label(this, ax, wallTop + 57, "THƯỜNG", { ...addr, size: 14 });
      label(this, ax, wallTop + 71, "KIỆT", { ...addr, size: 14 });
    } else {
      const ax = OPEN_R + 49;
      label(this, ax, wallTop + 24, "268", { ...addr, size: 30, color: "#ffffff" });
      label(this, ax, wallTop + 44, "LÝ THƯỜNG", { ...addr, size: 16 });
      label(this, ax, wallTop + 59, "KIỆT", { ...addr, size: 16 });
      label(this, ax, wallTop + 72, "Q.10 · TP.HCM", { ...addr, size: 12, color: "#b9c6d6" });
    }
    // small "2022" plaque at the foot of the pillar keeps the Gate 2022 story
    put(this, "gate_plaque", PILLAR_X, GATE_Y + 12, { depth: GATE_Y + 12 });
    label(this, PILLAR_X, GATE_Y + 2, "2022", { size: 14, color: "#ffffff", stroke: null, depth: GATE_Y + 14 });
    put(this, "palm_c", 6.5 * T, 97 * T);
    put(this, "tree_a", 9.5 * T, 96.2 * T);
    put(this, "palm_c", 27 * T, 97.2 * T, { flip: true });
    put(this, "tree_a", 3 * T, 98 * T);
    put(this, "tree_b", 28.5 * T, 97.5 * T);
    put(this, "palm_a", 5 * T, 104 * T);
    put(this, "palm_b", 27 * T, 104 * T, { flip: true });
    put(this, "bush_b", 7.5 * T, 101.5 * T);
    put(this, "bush_c", 24.5 * T, 102 * T);
    put(this, "signpost", 9 * T, 102 * T);

    // street furniture by the lane
    put(this, "k_bin_grey", 12.4 * T, 53.6 * T);
    put(this, "k_hydrant", 19.6 * T, 52.6 * T);
    for (const [x, y] of [
      [12.4, 66],
      [19.6, 71],
      [12.4, 36],
      [19.6, 44],
    ] as [number, number][]) {
      put(this, "pot_plant", x * T, y * T);
    }

    // -------------------------------------------- the park (y 60..77)
    const park = [
      ["palm_c", 9.5, 75],
      ["tree_a", 11.2, 70],
      ["palm_a", 10.4, 66.5],
      ["tree_b", 7, 67],
      ["bush_b", 11.6, 73.5],
      ["bed_pink", 8.5, 73.3],
      ["bench", 11.4, 63.6],
      ["palm_b", 22.5, 75],
      ["tree_c", 20.8, 69],
      ["palm_a", 21.6, 65],
      ["tree_a", 25, 66.5],
      ["bush_c", 20.2, 73.6],
      ["bed_yellow", 23.6, 73.3],
      ["bench", 20.4, 63.4],
      ["umbrella_red", 7.2, 62.5],
      ["umbrella_blue", 24.4, 61.8],
    ] as [string, number, number][];
    for (const [k, x, y] of park) put(this, k, x * T, y * T);
    // grass beside the lane and the far edges carry trees, bushes and flower patches
    for (let y = 12; y < 98; y += 3) {
      for (const side of [0, 1]) {
        if (r() < 0.45) continue;
        if (y > 59 && y < 78) continue; // the park is hand-placed
        const x = side === 0 ? 0.6 + r() * 2.4 : 29 + r() * 2.4;
        put(this, ["bush_a", "bush_b", "bush_c", "tree_a", "tree_b", "palm_a", "palm_b"][Math.floor(r() * 7)], x * T, (y + r()) * T, { flip: r() < 0.5 });
      }
    }
    for (const [x, y] of [
      [2, 86],
      [29.5, 88],
      [2.5, 70],
      [4, 54],
      [28, 53],
      [3, 46],
      [29, 44],
    ] as [number, number][]) {
      put(this, r() < 0.5 ? "tree_a" : "tree_b", x * T, y * T);
    }

    // ------------------------------------------------------- walkers
    new Npc(this, "npc-1", [
      { x: 14.6 * T, y: 90 * T },
      { x: 14.6 * T, y: 76 * T },
    ]);
    new Npc(this, "npc-2", [
      { x: 17.4 * T, y: 70 * T },
      { x: 17.4 * T, y: 53 * T },
    ], 20);
    new Npc(this, "npc-3", [
      { x: 9 * T, y: 59.2 * T },
      { x: 11.5 * T, y: 59.2 * T },
    ], 14);
    new Npc(this, "npc-4", [
      { x: 19.6 * T, y: 31 * T },
      { x: 19.6 * T, y: 26 * T },
      { x: 23.5 * T, y: 26 * T },
      { x: 23.5 * T, y: 31 * T },
    ], 18);
    new Npc(this, "npc-2", [
      { x: 4 * T, y: 100.8 * T },
      { x: 8 * T, y: 100.8 * T },
    ], 12);
    new Npc(this, "npc-4", [
      { x: 14.4 * T, y: 38 * T },
      { x: 14.4 * T, y: 44 * T },
    ], 16);

    // ---------------------------------------------------------- hero
    const walk = new Walk(
      [
        { x0: CX - 32, y0: DOOR_Y - 12, x1: CX + 32, y1: START_Y + 6 },
        { x0: 9 * T, y0: 12 * T + 4, x1: 23 * T, y1: 16 * T },
        { x0: 10 * T, y0: GATE_Y + 2, x1: 22 * T, y1: START_Y + 6 },
        { x0: 11 * T, y0: 60 * T, x1: 21 * T, y1: 77 * T },
      ],
      [
        { x: CX, y: START_Y },
        { x: CX, y: DOOR_Y },
      ],
    );
    this.hero = new Hero(this, walk, CX, START_Y, "freshman", keys);
    this.hero.face("up");
    followCamera(this, this.hero, COLS * T, ROWS * T, "#5eb04d");
    // let the camera look above the map so the whole front of the main hall (flag, sign, roof) fits
    const cam = this.cameras.main;
    const stretch = () => {
      const v = view(this);
      const bx = COLS * T < v.w ? -(v.w - COLS * T) / 2 : 0;
      cam.setBounds(bx, -TOP_PAD, Math.max(COLS * T, v.w), ROWS * T + TOP_PAD);
    };
    stretch();
    this.scale.on("resize", stretch);
    this.events.once("shutdown", () => this.scale.off("resize", stretch));
    this.hud = new Hud(this, this.hero, keys, () => {
      if (this.nearFrame) this.hud.openGallery(this.nearFrame.featured.year);
    });
    // Outdoor memories: wooden frames only — crisp photos live in the HTML caption strip
    for (const f of FEATURED_OUTDOOR) {
      const slot = hangFrame(this, f, { laneL: LANE_L, laneR: LANE_R });
      bindFrameHit(this, slot, this.hud, this.hero, (side) => (side === "l" ? LANE_L + 20 : LANE_R - 20));
      this.frames.push(slot);
    }
    this.hud.showGuide("Mục tiêu: đi thẳng lên theo con đường, ghé các khung ảnh kỷ niệm, rồi vào tòa nhà Bách Khoa ở cuối đường.");
    this.cameras.main.fadeIn(300);
    c.startMusic("loop");
    c.zone("gate");
  }

  /**
   * Vertical framing: the hero sits lower on screen at the two landmarks so the gate pillar (start) and the
   * whole front of the main hall (arrival) fit; on a portrait phone the view also slides left at the gate
   * so the pillar and the address wall share the narrow screen.
   */
  private frameCamera() {
    const v = view(this);
    const y = this.hero.y;
    const k = (a: number, b: number) => Phaser.Math.Clamp((y - a) / (b - a), 0, 1);
    const gate = k(GATE_Y - 120, GATE_Y - 20);
    const hall = k(330, 210);
    const f = 0.14 + 0.28 * gate + 0.30 * hall;
    this.cameras.main.followOffset.set(v.portrait ? Math.round(18 * gate) : 0, Math.round(v.h * f));
  }

  update(time: number, delta: number) {
    if (this.leaving) return;
    this.hero.frozen = this.hud.modalOpen;
    this.hero.update(time, delta);
    if (this.hero.y < START_Y - 40) this.hud.hideHint();
    const near = tickFrames(this, this.frames, this.hero, this.featuredId);
    if (near !== this.nearFrame) {
      this.nearFrame = near;
      this.hud.setInteractable(
        !!near,
        near ? (isTouch() ? `Chạm nút E · ${near.featured.title}` : `E / Space · ${near.featured.title}`) : "",
      );
      if (near) this.hud.hideHint();
    }
    this.frameCamera();
    if (this.hero.y < DOOR_Y + 2 && !this.hud.modalOpen) {
      this.leaving = true;
      this.hero.frozen = true;
      this.hero.cancelRoute();
      this.cameras.main.fadeOut(350);
      this.cameras.main.once("camerafadeoutcomplete", () => this.scene.start("Hallway"));
    }
  }
}

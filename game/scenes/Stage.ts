import Phaser from "phaser";
import { T, ctx, sfx, view } from "../context";
import type { Keys } from "../input";
import { Grid, put } from "../town";
import Hud from "../ui/Hud";
import { label } from "../ui/text";
import Hero, { Walk, bakeGround, followCamera, rng } from "../world";

const COLS = 24;
const ROWS = 64;
const CX = (COLS * T) / 2;
const START_Y = 61 * T;
const DOORS_BASE = 45 * T; // base line of the big double doors
const TRIGGER_Y = DOORS_BASE + 14;
const WALL_TOP = 41; // wall band rows 41..44 (the hall's south wall)

/**
 * Zone "stage": the lobby in front of the big doors. Reaching the doors starts the cutscene (zone
 * "diploma"): the doors open, the host puts on the graduation gown, walks the red-carpet aisle to the
 * podium and receives the red diploma folder. Skippable from the host's Skip button.
 */
export default class Stage extends Phaser.Scene {
  private hero!: Hero;
  private hud!: Hud;
  private doors!: Phaser.GameObjects.Image;
  private fog!: Phaser.GameObjects.Rectangle;
  private cutscene = false;
  private going = false;
  private overlay: Phaser.GameObjects.GameObject[] = [];
  private heads: Phaser.GameObjects.Sprite[] = [];

  constructor() {
    super("Stage");
  }

  create() {
    const c = ctx(this);
    const keys = this.game.registry.get("keys") as Keys;
    this.cutscene = false;
    this.going = false;
    this.overlay = [];
    this.heads = [];
    const r = rng(5);

    // ------------------------------------------------------------ floor
    const g = new Grid(COLS, ROWS, null);
    g.rect(5, 45, 18, ROWS - 1, "c"); // lobby
    g.rect(5, 6, 18, 40, "w"); // hall
    g.rect(5, 6, 18, 9, "s"); // stage
    const names = g.names();
    const over: (string | null)[][] = Array.from({ length: ROWS }, () => Array<string | null>(COLS).fill(null));
    for (let y = 0; y < ROWS; y++) {
      if (y >= 0 && y <= 40 && y >= 0) {
        names[y][4] = "wallv_l";
        names[y][19] = "wallv_r";
      }
      if (y >= 41) {
        names[y][4] = "wallv_l";
        names[y][19] = "wallv_r";
      }
    }
    // red carpet aisle (hall + lobby) and a runner leading to the doors
    for (let y = 11; y <= 40; y++) {
      names[y][10] = "carpet_l";
      names[y][11] = "carpet_c";
      names[y][12] = "carpet_c";
      names[y][13] = "carpet_r";
    }
    for (let y = 45; y < ROWS; y++) {
      names[y][10] = "carpet_l";
      names[y][11] = "carpet_c";
      names[y][12] = "carpet_c";
      names[y][13] = "carpet_r";
    }
    // back wall behind the stage
    for (let x = 5; x < 19; x++) {
      names[0][x] = "wall_cap";
      for (let y = 1; y < 5; y++) names[y][x] = "wall_up";
      names[5][x] = "wall_low";
    }
    // front of the stage
    for (let x = 5; x < 19; x++) names[10][x] = "stage_front";
    // hall's south wall (seen from the lobby) with the doors in the middle
    for (let x = 5; x < 19; x++) {
      names[WALL_TOP][x] = "wall_cap";
      names[WALL_TOP + 1][x] = "wall_up";
      names[WALL_TOP + 2][x] = "wall_up";
      names[WALL_TOP + 3][x] = "wall_low";
    }
    for (let y = 6; y <= 40; y++) {
      over[y][5] = "shade_l";
      over[y][18] = "shade_r";
    }
    for (let y = 45; y < ROWS; y++) {
      over[y][5] = "shade_l";
      over[y][18] = "shade_r";
    }
    bakeGround(this, "stage-ground", COLS, ROWS, names as (string | null)[][], over);

    // ------------------------------------------------------------ stage set
    put(this, "stage_backdrop", CX, 6 * T - 2, { depth: 20 });
    put(this, "curtain_l", 5 * T, 8.6 * T, { origin: [0, 1], depth: 30 });
    put(this, "curtain_r", 19 * T, 8.6 * T, { origin: [1, 1], depth: 30 }).setFlipX(false);
    for (let x = 5; x < 19; x++) put(this, "valance", x * T, 1 * T + 14, { origin: [0, 1], depth: 31 });
    put(this, "stage_steps", CX, 12 * T, { depth: 10 * T });
    put(this, "podium", CX + 4, 8.4 * T, { depth: 8.4 * T });
    put(this, "pot_plant", 6.8 * T, 9.3 * T);
    put(this, "pot_plant", 17.2 * T, 9.3 * T);
    label(this, CX, 5.1 * T, "CHÚC MỪNG TỐT NGHIỆP", { size: 16, color: "#fff3c4", stroke: "#14306e", depth: 40 });
    for (const x of [8.8, 15.2]) {
      put(this, "spot_beam", x * T, 1.6 * T, { origin: [0.5, 0], depth: 5 * T, alpha: 0.7 }).setBlendMode(Phaser.BlendModes.ADD).setScale(1.5, 1.4);
    }

    // chairs: audience seen from behind, with a few heads peeking over
    const npcKeys = ["npc-1", "npc-2", "npc-3", "npc-4"];
    for (let row = 0; row < 8; row++) {
      const y = (14.5 + row * 3) * T;
      for (const x0 of [6, 14]) {
        for (let i = 0; i < 4; i++) {
          const x = (x0 + i + 0.5) * T;
          put(this, "chair_back", x, y + 2);
          if (r() < 0.45) {
            const head = this.add.sprite(x, y - 3, npcKeys[Math.floor(r() * 4)], 15).setOrigin(0.5, 0.94).setDepth(y - 1);
            head.setCrop(0, 0, 16, 14);
            this.heads.push(head);
          }
        }
      }
    }

    // ------------------------------------------------------------ lobby
    this.doors = put(this, "doors_closed", CX, DOORS_BASE, { depth: DOORS_BASE });
    label(this, CX, DOORS_BASE - 80, "HỘI TRƯỜNG", { size: 16, color: "#ffe9a8", stroke: "#14306e", depth: DOORS_BASE + 2 });
    for (const [x, k] of [
      [6.2, "pot_plant"],
      [17.8, "pot_plant"],
      [8.6, "easel"],
      [15.4, "easel"],
    ] as [number, string][]) {
      put(this, k, x * T, 48.6 * T);
    }
    put(this, "banner_blue", 7.4 * T, 41 * T + 2, { origin: [0.5, 0], depth: DOORS_BASE });
    put(this, "banner_red", 16.6 * T, 41 * T + 2, { origin: [0.5, 0], depth: DOORS_BASE });
    put(this, "picture_2", 6.4 * T, 42 * T + 18, { depth: DOORS_BASE });
    put(this, "picture_0", 17.6 * T, 42 * T + 18, { depth: DOORS_BASE });
    for (const y of [52, 57]) {
      put(this, "sconce", 5.4 * T, y * T, { depth: y * T });
      put(this, "sconce", 18.6 * T, y * T, { depth: y * T });
      put(this, "lamp_glow", 6 * T, y * T - 8, { depth: -500, alpha: 0.5 }).setBlendMode(Phaser.BlendModes.ADD).setOrigin(0.5, 0.5);
      put(this, "lamp_glow", 18 * T, y * T - 8, { depth: -500, alpha: 0.5 }).setBlendMode(Phaser.BlendModes.ADD).setOrigin(0.5, 0.5);
    }

    // darkness over the hall until the doors open
    this.fog = this.add.rectangle(0, 0, COLS * T + 400, WALL_TOP * T, 0x05060f, 1).setOrigin(0).setDepth(2900);
    this.fog.x = -200;

    // ------------------------------------------------------------ host
    const walk = new Walk(
      [{ x0: CX - 36, y0: TRIGGER_Y - 8, x1: CX + 36, y1: START_Y + 20 }],
      [
        { x: CX, y: START_Y },
        { x: CX, y: TRIGGER_Y },
      ],
    );
    this.hero = new Hero(this, walk, CX, START_Y, "student", keys);
    this.hero.face("up");
    followCamera(this, this.hero, COLS * T, ROWS * T, "#10162e");
    this.hud = new Hud(this, this.hero, keys, () => {});
    this.cameras.main.fadeIn(350);
    c.startMusic("grad");
    c.zone("stage");

    this.game.registry.set("skipCutscene", () => this.skip());
    this.events.once("shutdown", () => this.game.registry.set("skipCutscene", null));
  }

  update(time: number, delta: number) {
    if (this.cutscene || this.going) return;
    this.hero.frozen = this.hud.modalOpen;
    this.hero.update(time, delta);
    if (this.hero.y <= TRIGGER_Y + 2 && !this.hud.modalOpen) this.playCutscene();
  }

  private sparkles(x: number, y: number, n = 24) {
    const burst = this.add.particles(x, y, "atlas", {
      frame: "spark",
      speed: { min: 30, max: 110 },
      angle: { min: 0, max: 360 },
      lifespan: 900,
      gravityY: 40,
      quantity: n,
      tint: [0xf2c75a, 0xffffff, 0x8ab0f5],
      emitting: false,
    });
    burst.setDepth(3500);
    burst.explode(n);
    this.time.delayedCall(1400, () => burst.destroy());
  }

  private async playCutscene() {
    this.cutscene = true;
    this.hero.cancelRoute();
    this.hero.frozen = true;
    this.hud.hideHint();
    this.hud.setControlsVisible(false);
    const c = ctx(this);
    sfx(this, "interact");
    c.zone("diploma");

    // doors swing open and light floods the hall
    this.doors.setTexture("atlas", "doors_open").setDepth(5);
    this.tweens.add({ targets: this.fog, alpha: 0, duration: 1400 });
    await this.wait(700);
    if (this.going) return;

    // outfit change: student -> graduate (gown + cap), with a sparkle
    this.hero.face("up");
    this.sparkles(this.hero.x, this.hero.y - 12);
    this.hero.setOutfit("graduate");
    sfx(this, "diploma", 0.35);
    await this.wait(500);
    if (this.going) return;

    // walk the red carpet to the podium
    await this.hero.autoWalk(
      [
        { x: CX, y: DOORS_BASE - 8 },
        { x: CX, y: 9.6 * T }, // straight up the aisle and the steps to the podium
      ],
      72,
    );
    if (this.going) return;
    this.hero.face("down");
    await this.wait(400);
    if (this.going) return;
    this.showDiploma();
    await this.wait(5200);
    this.toLetter();
  }

  private showDiploma() {
    const v = view(this);
    sfx(this, "diploma", 0.6);
    // The hard-cover folder floats at the left of the host (clear of him, the podium and the chairs),
    // with a glow; he also holds a small copy at his chest. The name and congratulation sit in a compact plate
    // at the top of the screen: nothing is drawn over the audience or the host.
    const hx = this.hero.x;
    const hy = this.hero.y;
    const fx = hx - 50;
    const fy = hy - 44;
    const glow = this.add.image(fx, fy, "atlas", "glow64").setDepth(hy + 40).setBlendMode(Phaser.BlendModes.ADD).setScale(2).setAlpha(0);
    const folder = this.add.image(fx, fy + 14, "atlas", "diploma_folder").setDepth(hy + 41).setScale(0.3).setAlpha(0);
    const held = this.add.image(hx, hy - 8, "atlas", "diploma_mini").setDepth(hy + 1).setScale(0.55).setAlpha(0);
    const pw = Math.min(v.w - 16, 200);
    const plate = this.add.graphics().setScrollFactor(0).setDepth(3902).setAlpha(0);
    plate.fillStyle(0x0b1030, 0.78).fillRoundedRect((v.w - pw) / 2, 6, pw, 42, 5);
    plate.lineStyle(1, 0xf2c75a, 1).strokeRoundedRect((v.w - pw) / 2 + 0.5, 6.5, pw - 1, 41, 5);
    const t2 = label(this, v.w / 2, 19, ctx(this).input.hostName, { size: 18, depth: 3903, fixed: true, color: "#fde89a", stroke: null }).setAlpha(0);
    const t3 = label(this, v.w / 2, 37, "Chúc mừng tốt nghiệp!", { size: 14, depth: 3903, fixed: true, color: "#ffffff", stroke: null }).setAlpha(0);
    this.overlay.push(glow, folder, held, plate, t2, t3);
    this.tweens.add({ targets: glow, alpha: 0.6, duration: 800 });
    this.tweens.add({ targets: held, alpha: 1, duration: 400 });
    this.tweens.add({
      targets: folder,
      alpha: 1,
      scale: 1,
      y: fy,
      duration: 900,
      ease: "Back.Out",
      onComplete: () => this.tweens.add({ targets: [folder, glow], y: fy - 3, duration: 900, yoyo: true, repeat: -1, ease: "Sine.InOut" }),
    });
    this.tweens.add({ targets: [plate, t2, t3], alpha: 1, duration: 600, delay: 500 });
    // confetti rain across the screen
    const em = this.add.particles(0, 0, "atlas", {
      frame: "confetti",
      x: { min: 0, max: v.w },
      y: -6,
      speedY: { min: 40, max: 90 },
      speedX: { min: -20, max: 20 },
      lifespan: 4200,
      frequency: 50,
      quantity: 1,
      tint: [0xf2c75a, 0xffffff, 0xe8483e, 0x4a78e0, 0x3cc56c, 0xff8fb3],
    });
    em.setScrollFactor(0).setDepth(3904);
    this.overlay.push(em);
    this.sparkles(this.hero.x, this.hero.y - 20, 30);
    this.applaud();
  }

  /** The audience claps: applause sound, heads bounce, little clapping hands pop above the chairs. */
  private applaud() {
    sfx(this, "applause", 0.7);
    if (!this.textures.exists("clap")) {
      const g = this.make.graphics({}, false);
      g.fillStyle(0xf6d2b0, 1).fillRoundedRect(0, 1, 5, 7, 2).fillRoundedRect(6, 1, 5, 7, 2);
      g.fillStyle(0xc98a5a, 1).fillRect(5, 3, 2, 3);
      g.fillStyle(0xfff3c4, 1).fillRect(1, 0, 1, 1).fillRect(9, 0, 1, 1).fillRect(5, 9, 1, 1);
      g.generateTexture("clap", 11, 10);
      g.destroy();
    }
    for (const head of this.heads) {
      this.tweens.add({
        targets: head,
        y: head.y - 3,
        duration: 150,
        delay: Math.random() * 300,
        yoyo: true,
        repeat: 14,
        ease: "Sine.InOut",
      });
    }
    const hands = this.add.particles(0, 0, "clap", {
      x: { min: 6 * T, max: 18 * T },
      y: { min: 13 * T, max: 34 * T },
      speedY: { min: -26, max: -12 },
      lifespan: 700,
      frequency: 70,
      quantity: 1,
      scale: { start: 1.1, end: 0.7 },
      alpha: { start: 1, end: 0 },
      duration: 4500,
    });
    hands.setDepth(3500);
    this.overlay.push(hands);
  }

  private wait(ms: number) {
    return new Promise<void>((res) => this.time.delayedCall(ms, () => res()));
  }

  /** Host-owned Skip button: jump straight to the Letter. No-op until the cutscene has started. */
  private skip() {
    if (!this.cutscene || this.going) return;
    this.tweens.killAll();
    this.time.removeAllEvents();
    this.toLetter();
  }

  private toLetter() {
    if (this.going) return;
    this.going = true;
    this.hero.frozen = true;
    this.cameras.main.fadeOut(350);
    this.cameras.main.once("camerafadeoutcomplete", () => this.scene.start("Letter"));
  }
}

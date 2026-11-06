import Phaser from "phaser";
import { ctx } from "../context";
import { makeWalkAnims } from "../world";

const SHEETS = ["host-freshman", "host-student", "host-graduate", "npc-1", "npc-2", "npc-3", "npc-4"];

/**
 * Loads the packed atlas, host/NPC sheets, featured/memory photos and optional audio.
 * Featured photos get LINEAR filtering so they don't look nearest-neighbour broken in frames.
 */
export default class Boot extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  preload() {
    // No canvas progress bar: the HTML loader in JourneyHost stays up until the first zone report.

    let failed = false;
    this.load.on("loaderror", (file: Phaser.Loader.File) => {
      if ((file.type === "image" || file.type === "atlasJSON" || file.type === "spritesheet") && !failed) {
        failed = true;
        ctx(this).finish("skipped");
      }
    });

    this.load.atlas("atlas", "/game/atlas.png", "/game/atlas.json");
    for (const s of SHEETS) this.load.spritesheet(s, `/game/sprites/${s}.png`, { frameWidth: 16, frameHeight: 24 });
    // Photos are NOT preloaded: they are only shown as HTML <img> in the overlays, which load them
    // lazily when the guest reaches that milestone.
    for (const key of ["loop", "hall", "grad", "step", "interact", "diploma", "letter", "applause"]) {
      this.load.audio(key, `/game/audio/${key}.wav`);
    }
  }

  create() {
    makeWalkAnims(this, ["freshman", "student", "graduate", "npc-1", "npc-2", "npc-3", "npc-4"]);
    this.anims.create({
      key: "fountain",
      frames: [0, 1, 2, 1].map((i) => ({ key: "atlas", frame: `fountain_${i}` })),
      frameRate: 4,
      repeat: -1,
    });
    this.scene.start("Campus");
  }
}

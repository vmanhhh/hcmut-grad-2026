import Phaser from "phaser";
import { ctx, view } from "../context";
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
    const { input } = ctx(this);
    const v = view(this);
    const barBg = this.add.rectangle(v.w / 2, v.h / 2, 120, 6, 0x222244);
    const bar = this.add.rectangle(v.w / 2 - 60, v.h / 2, 0, 6, 0xf2c75a).setOrigin(0, 0.5);
    this.load.on("progress", (p: number) => {
      bar.width = 120 * p;
    });
    this.events.once("shutdown", () => barBg.destroy());

    let failed = false;
    this.load.on("loaderror", (file: Phaser.Loader.File) => {
      if ((file.type === "image" || file.type === "atlasJSON" || file.type === "spritesheet") && !failed) {
        failed = true;
        ctx(this).finish("skipped");
      }
    });

    this.load.atlas("atlas", "/game/atlas.png", "/game/atlas.json");
    for (const s of SHEETS) this.load.spritesheet(s, `/game/sprites/${s}.png`, { frameWidth: 16, frameHeight: 24 });
    for (const m of input.memories) this.load.image(`mem-${m.id}`, m.image);
    for (const key of ["loop", "hall", "grad", "step", "interact", "diploma", "letter", "applause"]) {
      this.load.audio(key, `/game/audio/${key}.wav`);
    }
  }

  create() {
    // Soften guest photos; atlas/sprites stay nearest for crisp pixel art
    const soft = Phaser.Textures.FilterMode.LINEAR;
    for (const key of this.textures.getTextureKeys()) {
      if (key.startsWith("mem-")) this.textures.get(key).setFilter(soft);
    }

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

import Phaser from "phaser";
import { ctx, sfx } from "../context";

/**
 * End of the journey path: hands the guest's letter to the host as crisp HTML (not drawn in the
 * pixel canvas), then finishes when they tap "Vào thiệp mời".
 */
export default class Letter extends Phaser.Scene {
  constructor() {
    super("Letter");
  }

  create() {
    const c = ctx(this);
    c.zone("letter");
    c.startMusic("grad");
    sfx(this, "letter", 0.5);
    this.cameras.main.setBackgroundColor("#1b1f4a");
    this.cameras.main.fadeIn(200);
    c.cb.onLetter(() => c.finish("completed"));
  }
}

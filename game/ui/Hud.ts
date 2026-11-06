import Phaser from "phaser";
import type { Memory } from "@/lib/types";
import { ctx, isTouch, sfx, view } from "../context";
import type { Dir, Keys } from "../input";
import type Hero from "../world";
import { label } from "./text";

const HUD_DEPTH = 5000;

/**
 * Everything drawn on top of the world in screen space: the touch D-pad and interact button, the
 * "press E" prompt and the first-seconds hint. Memory / gallery / letter UIs are host-owned HTML
 * overlays so captions and photos stay sharp (not pixel-canvas). Controls hide while an overlay is open.
 */
export default class Hud {
  private stickBase: Phaser.GameObjects.Graphics | null = null;
  private stickKnob: Phaser.GameObjects.Graphics | null = null;
  private stickId: number | null = null;
  private stick = { x: 0, y: 0, r: 16 };
  private eBtn: Phaser.GameObjects.Image | null = null;
  private prompt: Phaser.GameObjects.Text;
  private hint: Phaser.GameObjects.Text | null = null;
  private external = false; // an HTML overlay owned by the host is open
  private canInteract = false;
  private touch = isTouch();
  private controlsOn = true;
  private unsub: (() => void) | null = null;
  private onInteract: () => void;
  private guideObjs: Phaser.GameObjects.GameObject[] = [];
  private guideClose: (() => void) | null = null;
  private route: Phaser.GameObjects.Text | null = null;

  constructor(private scene: Phaser.Scene, private hero: Hero, private keys: Keys, onInteract: () => void) {
    this.onInteract = onInteract;
    this.prompt = label(scene, 0, 0, "", { size: 13, color: "#ffe9a8", bg: "#1a1030cc", pad: [6, 2], depth: HUD_DEPTH, fixed: true, stroke: null }).setVisible(false);

    if (this.touch) {
      // small virtual joystick bottom-left (replaces the four arrow buttons) + the E button bottom-right
      this.stickBase = scene.add.graphics().setScrollFactor(0).setDepth(HUD_DEPTH);
      this.stickKnob = scene.add.graphics().setScrollFactor(0).setDepth(HUD_DEPTH + 1);
      this.eBtn = scene.add.image(0, 0, "atlas", "btn_e").setScrollFactor(0).setDepth(HUD_DEPTH).setInteractive();
      this.eBtn.on("pointerdown", () => this.interact());
      scene.input.addPointer(2);
      scene.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
        if (this.external || this.stickId !== null || Math.hypot(p.x - this.stick.x, p.y - this.stick.y) > this.stick.r * 1.7) return;
        this.stickId = p.id;
        this.moveStick(p);
      });
      scene.input.on("pointermove", (p: Phaser.Input.Pointer) => {
        if (p.id === this.stickId) this.moveStick(p);
      });
      const release = (p: Phaser.Input.Pointer) => {
        if (p.id === this.stickId) this.releaseStick();
      };
      scene.input.on("pointerup", release);
      scene.input.on("pointerupoutside", release);
      scene.input.on("gameout", () => this.releaseStick());
      // safety net: a finger lifted off-canvas must never leave the stick (and the host) running
      scene.events.on("update", this.checkStick, this);
    }

    // mouse clicks: walk toward the clicked point along the path
    scene.input.on("pointerdown", (p: Phaser.Input.Pointer, over: unknown[]) => {
      if (this.touch || this.external || over.length > 0 || this.hero.frozen) return; // phones use the joystick, no tap-to-walk
      this.hero.walkTo(p.worldX, p.worldY);
    });

    this.unsub = keys.onAction((code) => {
      if (this.guideClose) {
        if (code === "KeyE" || code === "Space" || code === "Enter") this.guideClose();
        return;
      }
      if (this.external) return; // the overlay handles its own keys
      if (code === "KeyE" || code === "Space" || code === "Enter") this.interact();
    });

    scene.scale.on("resize", this.onResize, this);
    scene.events.once("shutdown", () => this.destroy());
    this.layout();
  }

  get modalOpen() {
    return this.external;
  }

  /** Opens the host-owned gallery overlay for a year; the game is paused until the guest closes it. */
  openGallery(year: number) {
    if (this.external) return;
    this.external = true;
    this.hero.padDir = null;
    this.hero.cancelRoute();
    sfx(this.scene, "interact");
    this.layout();
    ctx(this.scene).cb.onGallery(year, () => {
      this.external = false;
      this.layout();
    });
  }

  private destroy() {
    this.unsub?.();
    this.unsub = null;
    this.scene.scale.off("resize", this.onResize, this);
    this.scene.events.off("update", this.checkStick, this);
    this.hero.padDir = null;
  }

  /** The scene tells the HUD whether something can be interacted with right now (and what to say). */
  setInteractable(on: boolean, text = "") {
    this.canInteract = on;
    if (on) {
      this.prompt.setText(text);
    }
    this.layout();
  }

  private interact() {
    if (this.canInteract && !this.external) this.onInteract();
  }

  /** Shows a short first-seconds hint that fades out after `ms`. */
  showHint(text: string, ms = 7000) {
    this.hint?.destroy();
    const v = view(this.scene);
    this.hint = label(this.scene, v.w / 2, 8, text, {
      size: 13,
      color: "#fff3c4",
      align: "center",
      wrap: Math.min(v.w - 20, 320),
      bg: "#1a1030d9",
      pad: [8, 5],
      depth: HUD_DEPTH,
      fixed: true,
      origin: [0.5, 0],
      stroke: null,
    });
    this.scene.tweens.add({ targets: this.hint, alpha: 0, delay: ms, duration: 800, onComplete: () => this.hint?.destroy() });
  }

  hideHint() {
    if (this.hint) {
      const h = this.hint;
      this.hint = null;
      this.scene.tweens.add({ targets: h, alpha: 0, duration: 400, onComplete: () => h.destroy() });
    }
  }

  /**
   * "How to play" card shown at the start: controls for this device and the goal. The game is paused
   * (modalOpen) until the guest taps / presses E, Space or Enter.
   */
  showGuide(goal: string, onClose?: () => void) {
    if (this.guideClose) return;
    (document.activeElement as HTMLElement | null)?.blur?.(); // a focused host button would swallow Space / Enter
    const v = view(this.scene);
    const touch = this.touch;
    const lines = [
      "CÁCH CHƠI",
      "",
      touch ? "• Kéo joystick (góc trái) để đi" : "• Phím mũi tên hoặc W A S D để đi",
      touch ? null : "• Bấm chuột vào bản đồ: tự đi tới đó",
      touch ? "• Nút E (góc phải): xem kỷ niệm" : "• E hoặc Space: xem kỷ niệm khi đứng cạnh khung ảnh",
      "",
      goal,
      "",
      touch ? "[ Chạm để bắt đầu ]" : "[ Bấm E / Space / chuột để bắt đầu ]",
    ].filter((l): l is string => l !== null);
    const wrap = Math.min(v.w - 40, 280);
    const text = label(this.scene, v.w / 2, v.h / 2, lines.join("\n"), {
      size: 14,
      color: "#fff3c4",
      align: "center",
      wrap,
      depth: HUD_DEPTH + 11,
      fixed: true,
      stroke: null,
    });
    const b = text.getBounds();
    const panel = this.scene.add.graphics().setScrollFactor(0).setDepth(HUD_DEPTH + 10);
    panel.fillStyle(0x0b1030, 0.9).fillRoundedRect(b.x - 12, b.y - 10, b.width + 24, b.height + 20, 6);
    panel.lineStyle(1, 0xf2c75a, 1).strokeRoundedRect(b.x - 11.5, b.y - 9.5, b.width + 23, b.height + 19, 6);
    const catcher = this.scene.add.rectangle(0, 0, v.w * 2, v.h * 2, 0x000000, 0.35).setOrigin(0).setScrollFactor(0).setDepth(HUD_DEPTH + 9).setInteractive();
    this.guideObjs = [catcher, panel, text];
    this.external = true;
    this.hero.padDir = null;
    this.hero.cancelRoute();
    this.layout();
    const close = () => {
      if (!this.guideClose) return;
      this.guideClose = null;
      for (const o of this.guideObjs) o.destroy();
      this.guideObjs = [];
      this.external = false;
      this.layout();
      onClose?.();
    };
    this.guideClose = close;
    catcher.on("pointerdown", close);
  }

  /** Persistent direction hint at the bottom centre ("↑ …"); `null` hides it. */
  setRouteHint(text: string | null) {
    if (!text) {
      this.route?.setVisible(false);
      return;
    }
    const v = view(this.scene);
    if (!this.route) {
      this.route = label(this.scene, v.w / 2, 6, text, {
        size: 12,
        color: "#ffe9a8",
        align: "center",
        bg: "#1a1030cc",
        pad: [6, 2],
        depth: HUD_DEPTH,
        fixed: true,
        origin: [0.5, 0],
        stroke: null,
      });
    }
    const t = this.route;
    if (t.text !== text) t.setText(text);
    t.setPosition(v.w / 2, this.hint ? 56 : 6).setWordWrapWidth(Math.min(v.w - 120, 260)).setVisible(!this.external);
  }

  /** Hides the touch controls (cutscenes). */
  setControlsVisible(on: boolean) {
    this.controlsOn = on;
    this.layout();
  }

  /** Layout of D-pad, E button and prompt for the current viewport. */
  layout = () => {
    const v = view(this.scene);
    const k = v.zoom >= 2 ? 1 : 2; // 24px art, shown at >= 44 CSS px
    const cell = 24 * k + 1;
    const m = 5;
    const show = !this.external && this.controlsOn;
    if (this.stickBase && this.stickKnob) {
      const r = Math.max(14, Math.round(34 / v.zoom)); // about 34 css px radius on any zoom
      this.stick = { x: m + r * 1.6, y: v.h - m - r * 1.6, r };
      this.drawStick(show, 0, 0);
    }
    if (this.eBtn) {
      this.eBtn.setScale(k).setPosition(v.w - m - 12 * k, v.h - m - cell * 1.5 - 4).setVisible(show && this.canInteract);
    }
    const p = this.prompt;
    p.setVisible(false); // the photo card shows the memory; the E button (touch) / E-Space (keys) are explained in the start guide
    const top = this.hint ? 56 : this.route?.visible ? 44 : 14;
    p.setPosition(v.w / 2, top);
  };

  private drawStick(show: boolean, dx: number, dy: number) {
    const b = this.stickBase;
    const k = this.stickKnob;
    if (!b || !k) return;
    const { x, y, r } = this.stick;
    b.clear().setVisible(show);
    k.clear().setVisible(show);
    if (!show) return;
    b.fillStyle(0x1b1a38, 0.5).fillCircle(x, y, r).lineStyle(1, 0xf2c75a, 0.9).strokeCircle(x, y, r);
    k.fillStyle(0xf2c75a, 0.9).fillCircle(x + dx, y + dy, r * 0.42).lineStyle(1, 0x1b1a38, 1).strokeCircle(x + dx, y + dy, r * 0.42);
  }

  private moveStick(p: Phaser.Input.Pointer) {
    const { x, y, r } = this.stick;
    let dx = p.x - x;
    let dy = p.y - y;
    const d = Math.hypot(dx, dy);
    if (d > r) {
      dx = (dx / d) * r;
      dy = (dy / d) * r;
    }
    this.drawStick(true, dx, dy);
    if (d < r * 0.3) this.hero.padDir = null;
    else this.hero.padDir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "left" : "right") : dy < 0 ? "up" : "down";
  }

  private checkStick() {
    if (this.stickId === null) return;
    const p = this.scene.input.manager.pointers.find((q) => q.id === this.stickId);
    if (!p || !p.isDown) this.releaseStick();
  }

  private releaseStick() {
    this.stickId = null;
    this.hero.padDir = null;
    this.drawStick(!this.external && this.controlsOn, 0, 0);
  }

  private onResize() {
    this.layout();
  }

  /** Opens the host-owned crisp HTML memory card. */
  openMemory(m: Memory) {
    if (this.external) return;
    this.external = true;
    this.hero.padDir = null;
    this.hero.cancelRoute();
    sfx(this.scene, "interact");
    this.layout();
    ctx(this.scene).cb.onMemory(m, () => {
      this.external = false;
      this.layout();
    });
  }
}

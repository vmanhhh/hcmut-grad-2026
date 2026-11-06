#!/usr/bin/env python3
"""
Packs the sprites the journey actually uses into ONE texture atlas (Phaser "JSON hash" format):
  - every PNG in assets-src/generated/town/  (made by tools/gen-town-art.py)
  - a small list of 16x16 tiles cut from the Kenney CC0 packs (rpg-urban-pack, roguelike-modern-city,
    tiny-town), named k_*  (we never copy whole packs into public/)
and copies the host + NPC sprite sheets (80x96, 16x24 frames) next to it.

Outputs (public/game/): atlas.png, atlas.json, sprites/host-*.png, sprites/npc-*.png
Usage: python tools/build-atlas.py
"""
import json
import os

from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
SRC = os.path.join(ROOT, "assets-src")
GEN = os.path.join(SRC, "generated")
OUT = os.path.join(ROOT, "public", "game")

PACKS = {
    "rpg": os.path.join(SRC, "rpg-urban-pack", "Tilemap", "tilemap.png"),
    "rmc": os.path.join(SRC, "roguelike-modern-city", "Tilemap", "tilemap.png"),
    "tt": os.path.join(SRC, "tiny-town", "Tilemap", "tilemap.png"),
}
STEP = 17  # 16px tiles with 1px spacing in all three Kenney packs

# name -> (pack, col, row, cols_wide, rows_tall)
KENNEY = {
    "k_mailbox_red": ("rpg", 8, 9, 1, 2),
    "k_mailbox_blue": ("rpg", 8, 11, 1, 1),
    "k_bin_red": ("rpg", 9, 9, 1, 1),
    "k_bin_grey": ("rpg", 10, 10, 1, 1),
    "k_hydrant": ("rpg", 10, 11, 1, 1),
    "k_crate_produce": ("rpg", 7, 10, 1, 2),
    "k_crate_red": ("rpg", 6, 10, 1, 1),
    "k_crate_wide": ("rpg", 4, 11, 2, 1),
    "k_barrier": ("rpg", 5, 8, 1, 1),
    "k_cone": ("rmc", 14, 18, 1, 1),
    "k_trashcan_wood": ("rmc", 14, 14, 1, 1),
    "k_well": ("tt", 8, 8, 1, 1),
    "k_sign_tt": ("tt", 11, 6, 1, 1),
}


def crop(pack, col, row, cw, ch):
    im = Image.open(PACKS[pack]).convert("RGBA")
    x, y = col * STEP, row * STEP
    return im.crop((x, y, x + cw * 16 + (cw - 1), y + ch * 16 + (ch - 1)))


def main():
    sprites = {}
    town = os.path.join(GEN, "town")
    for f in sorted(os.listdir(town)):
        if f.endswith(".png"):
            sprites[f[:-4]] = Image.open(os.path.join(town, f)).convert("RGBA")
    for name, (pack, c, r, cw, ch) in KENNEY.items():
        # stitch multi-tile crops without the 1px spacing
        if cw == 1 and ch == 1:
            sprites[name] = crop(pack, c, r, 1, 1)
        else:
            im = Image.new("RGBA", (cw * 16, ch * 16))
            for j in range(ch):
                for i in range(cw):
                    im.alpha_composite(crop(pack, c + i, r + j, 1, 1), (i * 16, j * 16))
            sprites[name] = im

    # shelf packer, tallest first, 2px padding
    PAD = 2
    MAXW = 1024
    items = sorted(sprites.items(), key=lambda kv: (-kv[1].height, -kv[1].width, kv[0]))
    x = y = shelf_h = 0
    placed = {}
    for name, im in items:
        w, h = im.size
        if x + w + PAD > MAXW:
            x = 0
            y += shelf_h + PAD
            shelf_h = 0
        placed[name] = (x + PAD // 2, y + PAD // 2)
        x += w + PAD
        shelf_h = max(shelf_h, h)
    H = y + shelf_h + PAD
    # round the height up to a multiple of 4
    H = (H + 3) // 4 * 4
    atlas = Image.new("RGBA", (MAXW, H), (0, 0, 0, 0))
    frames = {}
    for name, (px_, py_) in placed.items():
        im = sprites[name]
        atlas.alpha_composite(im, (px_, py_))
        w, h = im.size
        frames[name] = {
            "frame": {"x": px_, "y": py_, "w": w, "h": h},
            "rotated": False,
            "trimmed": False,
            "spriteSourceSize": {"x": 0, "y": 0, "w": w, "h": h},
            "sourceSize": {"w": w, "h": h},
        }
    os.makedirs(os.path.join(OUT, "sprites"), exist_ok=True)
    atlas.save(os.path.join(OUT, "atlas.png"), optimize=True)
    with open(os.path.join(OUT, "atlas.json"), "w", encoding="utf-8") as f:
        json.dump({"frames": frames, "meta": {"image": "atlas.png", "format": "RGBA8888", "size": {"w": MAXW, "h": H}, "scale": "1"}}, f, separators=(",", ":"))
    for n in ["host-freshman", "host-student", "host-graduate", "npc-1", "npc-2", "npc-3", "npc-4"]:
        Image.open(os.path.join(GEN, f"{n}.png")).convert("RGBA").save(os.path.join(OUT, "sprites", f"{n}.png"), optimize=True)
    total = sum(os.path.getsize(os.path.join(dp, fn)) for dp, _, fns in os.walk(OUT) for fn in fns if not fn.endswith(".md"))
    print(f"atlas {MAXW}x{H}, {len(frames)} frames; public/game total {total / 1024:.0f} KB (incl. audio)")


if __name__ == "__main__":
    main()

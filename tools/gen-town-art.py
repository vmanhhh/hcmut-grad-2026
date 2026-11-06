#!/usr/bin/env python3
"""
Hand-drawn (by script) pixel art for the top-down HCMUT graduation journey.

Writes one PNG per sprite into assets-src/generated/town/ plus contact sheets
(assets-src/generated/town-preview-*.png). tools/build-atlas.py then packs these together with the handful
of Kenney CC0 tiles that are used into public/game/atlas.png.

Everything is drawn from the palette below: bright town, warm sandstone paving, terracotta roofs, white
trims, a 1px darker-hue outline on objects, light from the top-left.

Usage: python tools/gen-town-art.py [--out DIR]
"""
import argparse
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(__file__))
import diploma_art  # noqa: E402
import hcmut_art
import marker_art  # noqa: E402
from PIL import Image, ImageDraw  # noqa: E402
from pixart import (C, blob, ellipse, line, mix, new, outline, pad, paste, poly, px, rect, shade,  # noqa: E402
                    sheet_grid, shadow)

ASSETS: dict = {}


def reg(name, im):
    ASSETS[name] = im
    return im


# ---------------------------------------------------------------- palette ---
GRASS = [C("#4f9f45"), C("#5eb04d"), C("#72c45a"), C("#8bd66e")]
SAND = [C("#cbb48a"), C("#dcc799"), C("#ead8ae"), C("#f4e8c8")]
GREY = [C("#8e98a8"), C("#a9b2c0"), C("#c4cbd6"), C("#dfe4ec")]
WOOD = [C("#6f4528"), C("#93603a"), C("#b57e4c"), C("#d19b66")]
RED = [C("#7e1f2a"), C("#b02f36"), C("#d9483e"), C("#f0705a")]
BLUE = [C("#1b2f78"), C("#2b4fb8"), C("#4a78e0"), C("#8ab0f5")]
GOLD = [C("#a8761a"), C("#d9a233"), C("#f2c75a"), C("#fde89a")]
CREAM = [C("#c9b88f"), C("#e6d8b0"), C("#f4ead0"), C("#fff8e4")]
LEAF = [C("#1f6b3c"), C("#2f9148"), C("#4cb85a"), C("#8ee07a")]
LEAF2 = [C("#2a7a4a"), C("#3a9a58"), C("#58be6a"), C("#a0ea88")]
ORANGE_LEAF = [C("#a8441a"), C("#d9692a"), C("#f0923a"), C("#ffc766")]
WATER = [C("#2b78c9"), C("#4aa3e8"), C("#7cc9f5"), C("#c4eaff")]


# ------------------------------------------------------------- ground ---
def grass_tile(seed, flowers=0, tufts=True):
    r = random.Random(seed)
    im = new(16, 16, GRASS[1])
    for y in range(16):
        for x in range(16):
            if r.random() < 0.10:
                px(im, x, y, GRASS[0] if r.random() < 0.5 else GRASS[2])
    if tufts:
        for _ in range(4):
            x, y = r.randint(1, 13), r.randint(1, 13)
            px(im, x, y, GRASS[0]); px(im, x + 1, y - 1, GRASS[0]); px(im, x + 2, y, GRASS[0])
            px(im, x + 1, y, GRASS[2]); px(im, x + 1, y - 2, GRASS[3]) if r.random() < 0.4 else None
    cols = [C("#ffffff"), C("#ffd84a"), C("#ff8fb3"), C("#b9a2ff")]
    for i in range(flowers):
        x, y = r.randint(2, 12), r.randint(3, 12)
        c = cols[(seed + i) % 4]
        px(im, x, y, c); px(im, x + 1, y, shade(c, 0.9)); px(im, x, y + 1, GRASS[0]); px(im, x + 1, y + 1, GRASS[0])
    return im


def brick_pave(seed, base=SAND, w=16, h=16, bh=4, bw=8):
    r = random.Random(seed)
    im = new(w, h, base[0])
    row = 0
    for y in range(0, h, bh):
        off = (bw // 2) if row % 2 else 0
        for x in range(-off, w, bw):
            f = 1 + r.uniform(-0.05, 0.05)
            c = shade(base[2] if r.random() < 0.7 else base[1], f)
            rect(im, max(0, x + 1), y + 1, min(w - 1, x + bw - 1), y + bh - 1, c)
            # top-left highlight on every brick
            for xx in range(max(0, x + 1), min(w, x + bw)):
                px(im, xx, y + 1, shade(c, 1.07))
        row += 1
    return im


def plaza_tile(seed, light):
    r = random.Random(seed)
    base = [C("#bba982"), C("#d9c9a2"), C("#e9dcba"), C("#f6edd2")] if light else [C("#b19d74"), C("#cdbb92"), C("#ddcfa8"), C("#ebdfbd")]
    im = new(16, 16, base[0])
    rect(im, 1, 1, 14, 14, base[2])
    rect(im, 1, 1, 14, 1, base[3]); rect(im, 1, 1, 1, 14, base[3])
    rect(im, 2, 14, 14, 14, base[1]); rect(im, 14, 2, 14, 14, base[1])
    for _ in range(5):
        px(im, r.randint(3, 12), r.randint(3, 12), base[1])
    return im


def with_edges(tile_fn, name):
    """Paving tile with grass lips on any side: names get _n _s _e _w and corner suffixes."""
    base = tile_fn()
    g = grass_tile(77, 0, False)

    def lip(sides):
        im = base.copy()
        mask = new(16, 16)
        d = ImageDraw.Draw(mask)
        if "n" in sides:
            d.rectangle([0, 0, 15, 4], fill=(255, 255, 255, 255))
        if "s" in sides:
            d.rectangle([0, 12, 15, 15], fill=(255, 255, 255, 255))
        if "w" in sides:
            d.rectangle([0, 0, 4, 15], fill=(255, 255, 255, 255))
        if "e" in sides:
            d.rectangle([11, 0, 15, 15], fill=(255, 255, 255, 255))
        # kerb stone line
        kerb = new(16, 16)
        kd = ImageDraw.Draw(kerb)
        if "n" in sides:
            kd.rectangle([0, 4, 15, 4], fill=SAND[3]); kd.rectangle([0, 5, 15, 5], fill=GREY[0])
        if "s" in sides:
            kd.rectangle([0, 11, 15, 11], fill=GREY[3]); kd.rectangle([0, 12, 15, 12], fill=GREY[0])
        if "w" in sides:
            kd.rectangle([4, 0, 4, 15], fill=SAND[3]); kd.rectangle([5, 0, 5, 15], fill=GREY[0])
        if "e" in sides:
            kd.rectangle([11, 0, 11, 15], fill=GREY[3]); kd.rectangle([12, 0, 12, 15], fill=GREY[0])
        im.alpha_composite(kerb)
        # shrink the grass mask by 1 where the kerb is
        m2 = new(16, 16)
        d2 = ImageDraw.Draw(m2)
        if "n" in sides:
            d2.rectangle([0, 0, 15, 3], fill=(255, 255, 255, 255))
        if "s" in sides:
            d2.rectangle([0, 13, 15, 15], fill=(255, 255, 255, 255))
        if "w" in sides:
            d2.rectangle([0, 0, 3, 15], fill=(255, 255, 255, 255))
        if "e" in sides:
            d2.rectangle([12, 0, 15, 15], fill=(255, 255, 255, 255))
        im.paste(g, (0, 0), m2)
        # grass shadow lip next to kerb
        return im

    for s in ["n", "s", "e", "w", "nw", "ne", "sw", "se"]:
        reg(f"{name}_{s}", lip(s))
    return base


# ---------------------------------------------------------------- floors ---
def wood_floor(seed):
    r = random.Random(seed)
    im = new(16, 16, WOOD[1])
    for i, y in enumerate((0, 8)):
        base = shade(WOOD[2], 1 + r.uniform(-0.05, 0.05))
        rect(im, 0, y, 15, y + 6, base)
        rect(im, 0, y, 15, y, shade(base, 1.12))
        rect(im, 0, y + 7, 15, y + 7, WOOD[0])
        jx = (i * 9 + seed * 5) % 14 + 1
        rect(im, jx, y, jx, y + 7, WOOD[0])
        for _ in range(3):
            gx = r.randint(0, 12)
            gy = y + r.randint(2, 5)
            rect(im, gx, gy, gx + r.randint(2, 4), gy, shade(base, 0.9))
    return im


def check_floor(light):
    a, b = (C("#f4ecd8"), C("#d9e2ec")) if light else (C("#d9e2ec"), C("#f4ecd8"))
    im = new(16, 16)
    for qy in range(2):
        for qx in range(2):
            c = a if (qx + qy) % 2 == 0 else b
            rect(im, qx * 8, qy * 8, qx * 8 + 7, qy * 8 + 7, c)
            rect(im, qx * 8, qy * 8, qx * 8 + 7, qy * 8, shade(c, 1.06))
    for i in range(16):
        px(im, 8, i, shade(C("#c9d6e6"), 0.9)); px(im, i, 8, shade(C("#c9d6e6"), 0.9))
    return im


def carpet(kind):
    im = new(16, 16, C("#b8343a"))
    r = random.Random(5)
    for y in range(0, 16, 4):
        for x in range((y // 4 % 2) * 4, 16, 8):
            px(im, x, y + 1, C("#cf4c48")); px(im, x + 1, y + 1, C("#cf4c48"))
    for y in range(16):
        if y % 8 == 0:
            pass
    if kind == "l":
        rect(im, 0, 0, 1, 15, GOLD[1]); rect(im, 2, 0, 2, 15, GOLD[0]); rect(im, 3, 0, 3, 15, C("#8c2428"))
    if kind == "r":
        rect(im, 14, 0, 15, 15, GOLD[1]); rect(im, 13, 0, 13, 15, GOLD[0]); rect(im, 12, 0, 12, 15, C("#8c2428"))
    return im


def wall_tiles():
    # back wall: cap + plaster + wainscot
    cap = new(16, 16, C("#33406e"))
    rect(cap, 0, 0, 15, 2, C("#4b5b96")); rect(cap, 0, 13, 15, 15, C("#232d52"))
    rect(cap, 0, 11, 15, 12, GOLD[1]); rect(cap, 0, 12, 15, 12, GOLD[0])
    reg("wall_cap", cap)
    up = new(16, 16, C("#efe3c4"))
    r = random.Random(3)
    for _ in range(14):
        px(up, r.randint(0, 15), r.randint(0, 15), C("#e6d8b4"))
    rect(up, 0, 0, 15, 0, C("#fff6dc"))
    reg("wall_up", up)
    low = new(16, 16, C("#8f5b3a"))
    rect(low, 0, 0, 15, 1, GOLD[1]); rect(low, 0, 2, 15, 2, GOLD[0])
    for x in (0, 8):
        rect(low, x + 1, 5, x + 6, 13, C("#a66e46")); rect(low, x + 1, 5, x + 6, 5, C("#c28a5c")); rect(low, x + 1, 13, x + 6, 13, C("#6e4228"))
    rect(low, 0, 15, 15, 15, C("#3f2616"))
    reg("wall_low", low)
    # side walls (top-down: dark cap + thin inner face)
    for side in ("l", "r"):
        w = new(16, 16, C("#33406e"))
        rect(w, 0, 0, 15, 15, C("#33406e"))
        if side == "l":
            rect(w, 0, 0, 3, 15, C("#232d52")); rect(w, 4, 0, 5, 15, C("#4b5b96"))
            rect(w, 12, 0, 15, 15, C("#e3d5b0")); rect(w, 12, 0, 12, 15, C("#fff3d6")); rect(w, 11, 0, 11, 15, GOLD[0]); rect(w, 10, 0, 10, 15, GOLD[2])
            rect(w, 6, 0, 9, 15, C("#3b4a82"))
        else:
            rect(w, 12, 0, 15, 15, C("#232d52")); rect(w, 10, 0, 11, 15, C("#4b5b96"))
            rect(w, 0, 0, 3, 15, C("#e3d5b0")); rect(w, 3, 0, 3, 15, C("#b9a77a")); rect(w, 4, 0, 4, 15, GOLD[0]); rect(w, 5, 0, 5, 15, GOLD[2])
            rect(w, 6, 0, 9, 15, C("#3b4a82"))
        reg(f"wallv_{side}", w)
    # floor edge shadow (soft strip dropped along walls)
    for side, box in (("n", (0, 0, 15, 5)), ("l", (0, 0, 5, 15)), ("r", (10, 0, 15, 15))):
        s = new(16, 16)
        rect(s, *box, (30, 20, 60, 70))
        reg(f"shade_{side}", s)


# ---------------------------------------------------------------- plants ---
def round_tree(seed, cols, w=48, h=56, trunk=C("#7a4a2a")):
    r = random.Random(seed)
    im = new(w, h)
    cx = w // 2
    ellipse(im, cx, h - 4, 15, 4, (20, 30, 50, 80))
    rect(im, cx - 3, h - 22, cx + 2, h - 5, trunk); rect(im, cx - 3, h - 22, cx - 2, h - 5, shade(trunk, 1.25)); rect(im, cx + 1, h - 22, cx + 2, h - 5, shade(trunk, 0.7))
    px(im, cx - 4, h - 5, trunk); px(im, cx + 3, h - 5, trunk); px(im, cx - 5, h - 4, shade(trunk, 0.7)); px(im, cx + 4, h - 4, shade(trunk, 0.7))
    for dx, dy, rx, ry in [(-11, -14, 12, 11), (11, -14, 12, 11), (0, -20, 15, 14), (-6, -28, 12, 11), (7, -28, 12, 11), (0, -34, 11, 9)]:
        blob(im, cx + dx, h - 24 + dy + 14, rx, ry, cols, r)
    return outline(im)


def palm_tree(seed, h=92, w=96, lean=1):
    r = random.Random(seed)
    im = new(w, h)
    cx = w // 2
    base_y = h - 6
    ellipse(im, cx, base_y, 12, 4, (20, 30, 50, 80))
    # curved trunk with ring texture
    pts = []
    top_y = 32 if h < 100 else 40
    for i in range(0, 41):
        t = i / 40
        y = base_y - t * (base_y - top_y)
        x = cx + lean * (math.sin(t * 1.5) * 7)
        pts.append((x, y, 3.4 - 1.4 * t))
    for x, y, rr in pts:
        for dx in range(-int(rr), int(rr) + 1):
            c = C("#a8794e") if dx < -0.5 else (C("#8a5d3a") if dx < rr - 1 else C("#6b4529"))
            px(im, int(x) + dx, int(y), c)
    for i, (x, y, rr) in enumerate(pts):
        if i % 3 == 0:
            for dx in range(-int(rr), int(rr) + 1):
                px(im, int(x) + dx, int(y), C("#5a3a22"))
    tx, ty = pts[-1][0], pts[-1][1]
    # fronds: long arching leaves with drooping leaflets on both sides
    fronds = [(-178, 30), (-152, 32), (-126, 28), (-100, 24), (-78, 24), (-52, 28), (-26, 32), (-2, 30), (22, 22), (160, 22), (-90, 14)]
    for ang, ln in fronds:
        a = math.radians(ang)
        segs = []
        for i in range(0, ln + 1):
            t = i / ln
            x = tx + math.cos(a) * i * 1.05
            y = ty + math.sin(a) * i * 0.55 + (t ** 2) * 20
            segs.append((x, y))
        for i, (x, y) in enumerate(segs):
            t = i / ln
            if 0.08 < t < 0.98 and i % 2 == 0:
                L = int(8 * math.sin(math.pi * min(1, t * 1.15)) + 2)
                for k in range(1, L):
                    kk = k * (1.0 if ang > -90 and ang < 90 or True else 1)
                    for sgn, col in ((-1, LEAF[0] if k % 2 else LEAF[1]), (1, LEAF[2] if k % 2 else LEAF[1])):
                        px(im, x + sgn * k * 0.45, y + k * 0.95, col)
                        if k < L - 1:
                            px(im, x + sgn * k * 0.45 + sgn, y + k * 0.95, col)
        for i, (x, y) in enumerate(segs):
            px(im, x, y, LEAF[3] if i % 4 == 0 else LEAF[2]); px(im, x, y - 1, LEAF[3]); px(im, x, y + 1, LEAF[1])
    blob(im, int(tx), int(ty), 4, 3, LEAF, r)
    # coconuts
    for dx in (-3, 0, 3):
        ellipse(im, int(tx + dx), int(ty + 3), 1, 1, C("#7a4a1c"))
    px(im, int(tx) - 4, int(ty) + 2, C("#a8743a"))
    return outline(im)


def bush(seed, cols, flowers=None):
    r = random.Random(seed)
    im = new(24, 22)
    ellipse(im, 12, 19, 9, 2, (20, 30, 50, 70))
    blob(im, 7, 13, 7, 6, cols, r)
    blob(im, 16, 13, 7, 6, cols, r)
    blob(im, 12, 9, 8, 7, cols, r)
    if flowers:
        for _ in range(11):
            x, y = r.randint(4, 19), r.randint(5, 16)
            c = r.choice(flowers)
            px(im, x, y, c); px(im, x + 1, y, shade(c, 0.85)); px(im, x, y - 1, shade(c, 1.15))
    return outline(im)


def hedge_tile(seed):
    r = random.Random(seed)
    im = new(16, 16, LEAF[1])
    for y in range(16):
        for x in range(16):
            v = r.random()
            if v < 0.22:
                px(im, x, y, LEAF[2])
            elif v < 0.36:
                px(im, x, y, LEAF[0])
    rect(im, 0, 0, 15, 2, LEAF[2]); rect(im, 0, 0, 15, 0, LEAF[3])
    rect(im, 0, 13, 15, 15, LEAF[0]); rect(im, 0, 12, 15, 12, shade(LEAF[1], 0.85))
    return outline(pad(im))


def flower_bed(w, seed, cols):
    r = random.Random(seed)
    im = new(w, 20)
    rect(im, 0, 8, w - 1, 17, C("#a8553a")); rect(im, 0, 8, w - 1, 9, C("#d88a62")); rect(im, 0, 16, w - 1, 17, C("#7a3a2a"))
    for x in range(0, w, 8):
        rect(im, x, 10, x, 15, C("#8a4630"))
    rect(im, 1, 6, w - 2, 9, C("#5a3a22"))
    for x in range(2, w - 2, 3):
        px(im, x, 5 + r.randint(0, 2), LEAF[1]); px(im, x + 1, 6, LEAF[2]); px(im, x, 7, LEAF[0])
    for _ in range(w // 2):
        x = r.randint(2, w - 4)
        y = r.randint(1, 6)
        c = r.choice(cols)
        px(im, x, y, c); px(im, x + 1, y, shade(c, 0.9)); px(im, x, y - 1, shade(c, 1.2)); px(im, x - 1, y, shade(c, 0.85))
        px(im, x, y + 1, LEAF[0])
    return outline(pad(im))


# ----------------------------------------------------------------- props ---
def lamp_post():
    w, h = 16, 56
    im = new(w, h)
    ellipse(im, 8, h - 3, 6, 2, (20, 30, 50, 80))
    # base
    rect(im, 5, h - 8, 10, h - 4, C("#3d4a5c")); rect(im, 4, h - 5, 11, h - 4, C("#2c3646")); rect(im, 5, h - 8, 6, h - 5, C("#5c6c82"))
    # pole
    rect(im, 7, 14, 8, h - 8, C("#3d4a5c")); rect(im, 7, 14, 7, h - 8, C("#6d7d94"))
    rect(im, 6, 26, 9, 27, C("#2c3646"))
    # arms with hooks for bunting
    rect(im, 3, 14, 12, 15, C("#2c3646")); px(im, 2, 13, C("#2c3646")); px(im, 13, 13, C("#2c3646"))
    # lantern
    rect(im, 5, 5, 10, 12, C("#2c3646"))
    rect(im, 6, 6, 9, 11, C("#ffe48a")); rect(im, 6, 6, 7, 8, C("#fff7c8")); rect(im, 8, 9, 9, 11, C("#f0b84a"))
    poly(im, [(4, 5), (11, 5), (8, 1), (7, 1)], C("#2c3646")); px(im, 7, 0, C("#2c3646")); px(im, 8, 0, C("#2c3646"))
    rect(im, 5, 12, 10, 12, C("#2c3646"))
    return outline(pad(im))


def rug(w, h, c1, c2):
    im = new(w, h)
    ellipse(im, w // 2, h // 2, w // 2 - 1, h // 2 - 1, shade(c1, 0.7))
    ellipse(im, w // 2, h // 2, w // 2 - 3, h // 2 - 3, c1)
    ellipse(im, w // 2, h // 2, w // 2 - 7, h // 2 - 5, c2)
    ellipse(im, w // 2, h // 2, w // 2 - 9, h // 2 - 7, shade(c1, 1.1))
    for x in range(8, w - 8, 6):
        px(im, x, h // 2, c2)
    return im


def lamp_glow():
    im = new(48, 48)
    for y in range(48):
        for x in range(48):
            d = math.hypot(x - 23.5, y - 23.5) / 24
            if d < 1:
                a = int(120 * (1 - d) ** 2)
                im.putpixel((x, y), (255, 232, 150, a))
    return im


def bunting(width, offset=0, drop=11):
    h = drop + 16
    im = new(width, h)
    cols = [C("#e8483e"), C("#ffd23f"), C("#2f8be6"), C("#ffffff"), C("#3cc56c"), C("#ff8a2a"), C("#e8489e")]
    rope = C("#4a3a2a")
    pts = []
    for x in range(width):
        t = (x - 2) / max(1, width - 5)
        t = max(0, min(1, t))
        y = 2 + int(round(drop * 4 * t * (1 - t)))
        pts.append(y)
        px(im, x, y, rope)
        if x > 0 and abs(pts[x] - pts[x - 1]) > 1:
            for yy in range(min(pts[x], pts[x - 1]), max(pts[x], pts[x - 1])):
                px(im, x, yy, rope)
    n = max(3, width // 12)
    for i in range(n):
        x = int(6 + (width - 12) * (i + 0.5) / n) - 4
        y = pts[min(width - 1, max(0, x))]
        c = cols[(i + offset) % len(cols)]
        # triangular pennant hanging from the rope (7 wide, 8 tall)
        for k in range(10):
            half = max(0, 4 - (k * 4) // 10)
            for dx in range(-half, half + 1):
                cc = shade(c, 1.15) if dx < 0 and k < 6 else (shade(c, 0.78) if dx > 0 and k > 3 else c)
                px(im, x + 4 + dx, y + 1 + k, cc)
        for dx in range(9):
            px(im, x + dx, y + 1, shade(c, 1.2))
    # soft outline only on the pennants
    return outline(im, dark=0.35)


def bench():
    w, h = 36, 22
    im = new(w, h)
    ellipse(im, 18, 19, 15, 2, (20, 30, 50, 70))
    # legs
    rect(im, 4, 12, 6, 18, C("#2c3646")); rect(im, 29, 12, 31, 18, C("#2c3646"))
    # back rest (slats)
    for i, y in enumerate((1, 4, 7)):
        rect(im, 2, y, 33, y + 2, WOOD[2]); rect(im, 2, y, 33, y, WOOD[3]); rect(im, 2, y + 2, 33, y + 2, WOOD[1])
    rect(im, 3, 0, 4, 10, C("#2c3646")); rect(im, 31, 0, 32, 10, C("#2c3646"))
    # seat
    rect(im, 1, 11, 34, 15, WOOD[3]); rect(im, 1, 11, 34, 11, C("#e8b784")); rect(im, 1, 15, 34, 15, WOOD[1])
    for x in range(7, 34, 7):
        rect(im, x, 12, x, 14, WOOD[1])
    return outline(pad(im))


def umbrella_table(c1, c2):
    w, h = 56, 64
    im = new(w, h)
    ellipse(im, 28, 58, 17, 4, (20, 30, 50, 70))
    # chairs
    for cx in (9, 47):
        rect(im, cx - 4, 42, cx + 4, 46, C("#c28a5c")); rect(im, cx - 4, 36, cx + 4, 41, C("#a8704a")); rect(im, cx - 3, 47, cx - 2, 54, C("#6e4228")); rect(im, cx + 2, 47, cx + 3, 54, C("#6e4228"))
    # table
    ellipse(im, 28, 46, 14, 5, C("#f4ead0")); ellipse(im, 28, 45, 14, 4, C("#ffffff"))
    rect(im, 27, 48, 29, 56, C("#8e98a8")); rect(im, 22, 56, 34, 57, C("#6e7a8e"))
    ellipse(im, 24, 43, 2, 1, C("#e8483e"))
    # pole
    rect(im, 27, 12, 28, 46, C("#d9d9e6"))
    # umbrella panels
    poly(im, [(2, 24), (54, 24), (44, 8), (12, 8)], c1)
    for i, x0 in enumerate(range(2, 54, 10)):
        col = c1 if i % 2 == 0 else c2
        poly(im, [(x0, 24), (min(54, x0 + 10), 24), (28 + (min(54, x0 + 10) - 28) * 0.45, 8), (28 + (x0 - 28) * 0.45, 8)], col)
    for x in range(2, 54, 5):
        rect(im, x, 24, x + 2, 26, c1 if (x // 5) % 2 == 0 else c2)
    rect(im, 12, 8, 44, 9, shade(c2, 1.15)); px(im, 28, 6, C("#8e98a8")); px(im, 28, 7, C("#8e98a8"))
    return outline(pad(im))


def fountain(frame):
    w, h = 80, 76
    im = new(w, h)
    cx = 40
    ellipse(im, cx, 62, 38, 12, (20, 30, 50, 70))
    # outer basin: stone rim ellipse
    ellipse(im, cx, 56, 36, 15, C("#a9b2c0")); ellipse(im, cx, 54, 36, 15, C("#dfe4ec"))
    ellipse(im, cx, 55, 31, 12, C("#8e98a8"))
    ellipse(im, cx, 55, 30, 11, WATER[1])
    ellipse(im, cx - 4, 53, 22, 8, WATER[2])
    # water ripples (animated)
    rnd = random.Random(frame * 7 + 1)
    for k in range(10):
        ang = rnd.uniform(0, 6.28)
        rr = rnd.uniform(8, 26)
        x = int(cx + math.cos(ang) * rr)
        y = int(55 + math.sin(ang) * rr * 0.36)
        rect(im, x, y, x + 2, y, WATER[3])
    ring = 9 + frame * 3
    for a in range(0, 360, 6):
        x = int(cx + math.cos(math.radians(a)) * ring)
        y = int(56 + math.sin(math.radians(a)) * ring * 0.36)
        px(im, x, y, WATER[3])
    # rim stones
    for a in range(0, 360, 20):
        x = int(cx + math.cos(math.radians(a)) * 34)
        y = int(54 + math.sin(math.radians(a)) * 13.5)
        px(im, x, y, C("#8e98a8"))
    # central pedestal + upper bowl
    rect(im, cx - 4, 34, cx + 3, 56, C("#c4cbd6")); rect(im, cx - 4, 34, cx - 3, 56, C("#eef1f6")); rect(im, cx + 2, 34, cx + 3, 56, C("#8e98a8"))
    ellipse(im, cx, 56, 7, 3, C("#a9b2c0"))
    ellipse(im, cx, 36, 15, 6, C("#a9b2c0")); ellipse(im, cx, 35, 15, 6, C("#dfe4ec")); ellipse(im, cx, 36, 12, 4, WATER[1]); ellipse(im, cx - 2, 35, 8, 2, WATER[2])
    rect(im, cx - 2, 22, cx + 1, 34, C("#c4cbd6")); rect(im, cx - 2, 22, cx - 2, 34, C("#eef1f6"))
    ellipse(im, cx, 22, 6, 2, C("#dfe4ec"))
    # spray
    sp = [(-1, 0), (1, 0)]
    for i in range(10):
        t = (i + frame * 3.3) % 10 / 10
        for sgn in (-1, 1):
            x = cx + sgn * (2 + t * 18)
            y = 20 + (t - 0.35) ** 2 * 50 - 6
            if t < 0.95:
                px(im, x, y, WATER[3]); px(im, x + sgn, y + 1, WATER[2])
    for k in range(4):
        px(im, cx, 14 + ((k * 3 + frame * 4) % 10), WATER[3]); px(im, cx - 1, 15 + ((k * 3 + frame * 4) % 10), WATER[2])
    return outline(im, 0.4)


def pot_plant(seed):
    r = random.Random(seed)
    im = new(24, 34)
    ellipse(im, 12, 31, 8, 2, (20, 30, 50, 70))
    # terracotta pot with rim
    poly(im, [(5, 22), (19, 22), (17, 30), (7, 30)], C("#c8553a"))
    rect(im, 4, 20, 19, 23, C("#e8795a")); rect(im, 4, 20, 19, 20, C("#f59a7a")); rect(im, 4, 23, 19, 23, C("#92341f"))
    rect(im, 8, 25, 9, 29, C("#e0694a"))
    # round clipped shrub
    blob(im, 12, 11, 9, 9, LEAF, r)
    blob(im, 7, 15, 5, 5, LEAF, r)
    blob(im, 17, 15, 5, 5, LEAF, r)
    for _ in range(5):
        x, y = r.randint(6, 17), r.randint(5, 16)
        px(im, x, y, C("#ffd23f")); px(im, x + 1, y, C("#fff1a0"))
    return outline(pad(im))


def signpost():
    im = new(40, 40)
    ellipse(im, 20, 37, 8, 2, (20, 30, 50, 70))
    rect(im, 18, 14, 21, 36, WOOD[1]); rect(im, 18, 14, 18, 36, WOOD[2])
    for y, d in ((4, 1), (15, -1)):
        poly(im, [(3, y), (30, y), (36, y + 5) if d > 0 else (36, y + 5), (30, y + 11), (3, y + 11)], WOOD[3])
        rect(im, 3, y, 30, y + 1, C("#e8b784")); rect(im, 3, y + 10, 30, y + 11, WOOD[1])
    return outline(pad(im))


# ----------------------------------------------------------- buildings ---
def brick_wall(w, h, base, mortar, seed):
    r = random.Random(seed)
    im = new(w, h, mortar)
    row = 0
    for y in range(0, h, 4):
        off = 4 if row % 2 else 0
        for x in range(-off, w, 8):
            f = 1 + r.uniform(-0.06, 0.06)
            c = shade(base, f)
            rect(im, max(0, x), y, min(w - 1, x + 6), y + 2, c)
            rect(im, max(0, x), y, min(w - 1, x + 6), y, shade(c, 1.1))
        row += 1
    return im


def plaster_wall(w, h, base, seed):
    r = random.Random(seed)
    im = new(w, h, base)
    for _ in range(w * h // 18):
        x, y = r.randint(0, w - 1), r.randint(0, h - 1)
        px(im, x, y, shade(base, r.choice((0.94, 1.05))))
    return im


def roof(w, h, base, seed):
    r = random.Random(seed)
    im = new(w, h, shade(base, 0.7))
    rows = h // 5
    for j in range(rows):
        y = j * 5
        off = 3 if j % 2 else 0
        for x in range(-off, w, 6):
            f = 1 + r.uniform(-0.05, 0.05) + (0.06 if j < 2 else 0)
            c = shade(base, f)
            rect(im, max(0, x), y, min(w - 1, x + 5), y + 3, c)
            rect(im, max(0, x), y, min(w - 1, x + 5), y, shade(c, 1.18))
            px(im, min(w - 1, x + 5), y + 3, shade(c, 0.75))
            rect(im, max(0, x), y + 4, min(w - 1, x + 5), y + 4, shade(base, 0.55))
    rect(im, 0, 0, w - 1, 2, shade(base, 1.22))  # ridge
    rect(im, 0, 0, w - 1, 0, shade(base, 1.4))
    rect(im, 0, h - 3, w - 1, h - 1, shade(base, 0.62))  # eave shadow
    return im


def striped_awning(w, c1, c2, h=14):
    im = new(w, h)
    sw = 8
    for x in range(0, w, sw):
        c = c1 if (x // sw) % 2 == 0 else c2
        rect(im, x, 0, x + sw - 1, h - 5, c)
        rect(im, x, 0, x + sw - 1, 1, shade(c, 1.15))
        # scallop
        ellipse(im, x + sw // 2 - 1, h - 5, sw // 2, 4, c)
        rect(im, x + 1, h - 5, x + sw - 2, h - 3, c)
        px(im, x + sw // 2 - 1, h - 1, shade(c, 0.75))
        px(im, x + 2, h - 2, shade(c, 0.8)); px(im, x + sw - 3, h - 2, shade(c, 0.8))
    rect(im, 0, 0, w - 1, 0, shade(c1, 0.8))
    return im


def window(w, h, frame=C("#fbf4e2"), curtains=None, seed=0, arched=False):
    im = new(w, h, shade(frame, 0.7))
    rect(im, 1, 1, w - 2, h - 2, frame)
    gx0, gy0, gx1, gy1 = 3, 3, w - 4, h - 4
    for y in range(gy0, gy1 + 1):
        t = (y - gy0) / max(1, gy1 - gy0)
        rect(im, gx0, y, gx1, y, mix(C("#9fd3f5"), C("#4a86c8"), t * 0.9))
    # reflection streaks
    for i in range(min(w, h) // 2):
        px(im, gx0 + 1 + i, gy1 - 1 - i, C("#e8f6ff")); px(im, gx0 + 2 + i, gy1 - 1 - i, C("#cdeaff"))
    mid = (gx0 + gx1) // 2
    rect(im, mid, gy0, mid, gy1, frame)
    if h > 18:
        rect(im, gx0, (gy0 + gy1) // 2, gx1, (gy0 + gy1) // 2, frame)
    if curtains:
        rect(im, gx0, gy0, gx0 + 2, gy1 - 3, curtains); rect(im, gx1 - 2, gy0, gx1, gy1 - 3, curtains)
        rect(im, gx0, gy0, gx1, gy0 + 1, shade(curtains, 0.8))
    rect(im, 0, h - 2, w - 1, h - 1, shade(frame, 0.8))
    return im


def door(w, h, base, glass=True):
    im = new(w, h, shade(base, 0.55))
    rect(im, 1, 1, w - 2, h - 1, base)
    rect(im, 1, 1, w - 2, 1, shade(base, 1.2)); rect(im, 1, 1, 1, h - 1, shade(base, 1.15))
    if glass:
        rect(im, 3, 3, w - 4, h // 2 - 2, C("#9fd3f5")); rect(im, 3, 3, w - 4, 4, C("#cdeaff")); px(im, 4, 6, C("#ffffff")); px(im, 5, 7, C("#ffffff"))
    rect(im, 3, h // 2 + 1, w - 4, h - 4, shade(base, 0.9)); rect(im, 3, h // 2 + 1, w - 4, h // 2 + 1, shade(base, 1.15))
    rect(im, w - 5, h // 2, w - 4, h // 2 + 1, GOLD[2])
    return im


def icon_sign(w, h, board, trim, icon):
    im = new(w, h, shade(trim, 0.6))
    rect(im, 1, 1, w - 2, h - 2, trim)
    rect(im, 2, 2, w - 3, h - 3, board)
    rect(im, 2, 2, w - 3, 2, shade(board, 1.18))
    return im


def shop(name, wt, wall, roofc, awn1, awn2, floors=1, brick=False, seed=1, door_col=C("#2b6fc9"), box_flowers=True, chimney=True, roof_rows=36):
    W = wt * 16
    RH = roof_rows
    WH = 48 + (floors - 1) * 32
    H = RH + WH
    im = new(W, H)
    # body
    body = brick_wall(W, WH, wall, shade(wall, 0.72), seed) if brick else plaster_wall(W, WH, wall, seed)
    paste(im, body, 0, RH)
    # side shading
    rect(im, 0, RH, 1, H - 1, shade(wall, 1.12)); rect(im, W - 2, RH, W - 1, H - 1, shade(wall, 0.78))
    # roof with overhang
    rf = roof(W + 4, RH, roofc, seed + 3)
    paste(im, rf, -2, 0)
    # chimney
    if chimney:
        cx = W - 22
        rect(im, cx, -0, cx + 8, 12, C("#a85a3a")); rect(im, cx, 0, cx + 8, 1, C("#d98a62")); rect(im, cx + 7, 2, cx + 8, 12, C("#7a3a24"))
    # plinth
    rect(im, 0, H - 5, W - 1, H - 1, C("#9aa3b0")); rect(im, 0, H - 5, W - 1, H - 5, C("#c4cbd6")); rect(im, 0, H - 2, W - 1, H - 1, C("#6e7a8e"))
    # sign band
    sy = RH + 2
    # ground floor
    gy = RH + (floors - 1) * 32
    # upper floors: windows
    for fl in range(floors - 1):
        wy = RH + 6 + fl * 32
        n = max(2, wt // 3)
        for i in range(n):
            wx = int((i + 0.5) * W / n) - 8
            paste(im, window(16, 22, seed=i), wx, wy)
            # shutters
            rect(im, wx - 4, wy + 1, wx - 1, wy + 20, door_col); rect(im, wx + 17, wy + 1, wx + 20, wy + 20, door_col)
            for yy in range(wy + 3, wy + 20, 3):
                rect(im, wx - 4, yy, wx - 1, yy, shade(door_col, 0.75)); rect(im, wx + 17, yy, wx + 20, yy, shade(door_col, 0.75))
            if box_flowers:
                rect(im, wx - 1, wy + 21, wx + 16, wy + 24, C("#a8553a"))
                for k in range(0, 18, 3):
                    px(im, wx - 1 + k, wy + 20, [C("#ff6fa0"), C("#ffd23f"), C("#ffffff")][(k // 3 + fl) % 3]); px(im, wx + k, wy + 19, LEAF[2])
    # ground floor
    paste(im, striped_awning(W - 4, awn1, awn2), 2, gy + 14)
    # signboard above awning
    rect(im, 8, gy + 1, W - 9, gy + 12, shade(C("#fff3d0"), 0.7)); rect(im, 9, gy + 2, W - 10, gy + 11, C("#fff3d0")); rect(im, 9, gy + 2, W - 10, gy + 2, C("#ffffff"))
    rect(im, 9, gy + 11, W - 10, gy + 11, C("#d8c9a0"))
    # door in the middle
    dw = 16
    dx = W // 2 - dw // 2
    paste(im, door(dw, 28, door_col), dx, gy + 17)
    # windows left and right of the door
    for sx, ex in ((4, dx - 3), (dx + dw + 3, W - 5)):
        ww = ex - sx
        if ww >= 12:
            cx0 = (sx + ex) // 2 - min(ww, 24) // 2
            paste(im, window(min(ww, 24), 18, curtains=C("#f2a2b8") if seed % 2 else C("#a7d4f2"), seed=seed), cx0, gy + 24)
    return outline(pad(im, 1, 3, 1, 1))


def main_hall():
    W, H = 288, 176
    im = new(W, H)
    wall = C("#f1dfae")
    # wings
    for x0, x1 in ((0, 80), (W - 80, W)):
        body = plaster_wall(x1 - x0, 96, C("#f1dfae"), x0 + 3)
        paste(im, body, x0, 64)
        for i in range(2):
            for fl in range(2):
                paste(im, window(18, 22), x0 + 10 + i * 34, 72 + fl * 36)
        rect(im, x0, 60, x1 - 1, 66, C("#3a5ab8")); rect(im, x0, 60, x1 - 1, 61, C("#6a8ae0"))
        rect(im, x0, 164, x1 - 1, 175, C("#9aa3b0"))
    # roof wings
    for x0, x1 in ((0, 80), (W - 80, W)):
        paste(im, roof(x1 - x0 + 4, 30, C("#2f5fc4"), 9), x0 - 2, 34)
    # center block
    cb = plaster_wall(128, 100, C("#f8e9b8"), 5)
    paste(im, cb, 80, 60)
    # pediment
    poly(im, [(72, 60), (216, 60), (144, 14)], C("#3a62c8"))
    poly(im, [(82, 58), (206, 58), (144, 22)], C("#f8e9b8"))
    poly(im, [(76, 60), (212, 60), (144, 18)], C("#3a62c8")) if False else None
    for i in range(0, 5):
        line(im, 144 - (62 - i * 6), 58 - i * 2 if False else 58, 144, 22, C("#e6d49a")) if False else None
    # emblem: gear-like circle
    ellipse(im, 144, 42, 12, 12, C("#2b4fb8")); ellipse(im, 144, 42, 9, 9, C("#f2c75a")); ellipse(im, 144, 42, 5, 5, C("#2b4fb8")); ellipse(im, 144, 42, 2, 2, C("#fde89a"))
    for a in range(0, 360, 45):
        x = 144 + math.cos(math.radians(a)) * 12; y = 42 + math.sin(math.radians(a)) * 12
        rect(im, int(x) - 1, int(y) - 1, int(x) + 1, int(y) + 1, C("#f2c75a"))
    # roof edge of pediment
    for x in range(72, 217):
        t = abs(x - 144) / 72
        y = 60 - int((1 - t) * 46)
        px(im, x, y, C("#2a3f8f")); px(im, x, y + 1, C("#5a82e0"))
    # sign band (text overlay in game)
    rect(im, 80, 62, 207, 78, C("#244a9e")); rect(im, 80, 62, 207, 63, C("#4a78e0")); rect(im, 80, 77, 207, 78, C("#14306e"))
    rect(im, 82, 64, 205, 75, C("#2b4fb8"))
    # columns
    for cx in (84, 112, 164, 192):
        rect(im, cx, 80, cx + 9, 150, C("#fbf3dc")); rect(im, cx, 80, cx + 2, 150, C("#ffffff")); rect(im, cx + 7, 80, cx + 9, 150, C("#d8c9a0"))
        rect(im, cx - 2, 78, cx + 11, 83, C("#e6d49a")); rect(im, cx - 2, 148, cx + 11, 153, C("#e6d49a"))
        for y in range(88, 146, 5):
            rect(im, cx + 3, y, cx + 3, y + 2, C("#efe3c0"))
    # doors
    rect(im, 118, 92, 169, 152, C("#6a4a30"))
    for x0 in (120, 145):
        rect(im, x0, 94, x0 + 22, 152, C("#2b4fb8")); rect(im, x0 + 2, 96, x0 + 20, 128, C("#9fd3f5"))
        for k in range(10):
            px(im, x0 + 4 + k, 126 - k, C("#e8f6ff")); px(im, x0 + 5 + k, 126 - k, C("#cdeaff"))
        rect(im, x0 + 11, 96, x0 + 11, 128, C("#f4ead0")); rect(im, x0 + 2, 128, x0 + 20, 130, C("#f4ead0"))
        rect(im, x0 + 2, 132, x0 + 20, 150, C("#244a9e"))
    rect(im, 143, 104, 144, 118, GOLD[2])
    # balcony windows above
    for x0 in (94, 175):
        paste(im, window(17, 26), x0, 98)
    # steps
    for i in range(6):
        y = 154 + i * 3
        rect(im, 76 - i * 3, y, 212 + i * 3, y + 2, C("#e8dcc0") if i % 2 == 0 else C("#d7c9a8"))
        rect(im, 76 - i * 3, y, 212 + i * 3, y, C("#fff6e0"))
    return outline(pad(im, 1, 2, 1, 0))


def hcmut_gate():
    W, H = 224, 128
    im = new(W, H)
    # pillars (3/4 view): front face + lit left side
    for x0 in (0, W - 40):
        body = brick_wall(40, 84, C("#e8d4a0"), C("#bfa874"), x0 + 1)
        paste(im, body, x0, 40)
        rect(im, x0, 40, x0 + 1, 123, C("#f6eac4")); rect(im, x0 + 38, 40, x0 + 39, 123, C("#a8905a"))
        rect(im, x0 - 3, 36, x0 + 42, 46, C("#f6eac4")); rect(im, x0 - 3, 36, x0 + 42, 37, C("#ffffff")); rect(im, x0 - 3, 44, x0 + 42, 46, C("#bfa874"))
        rect(im, x0 + 6, 52, x0 + 33, 82, C("#244a9e")); rect(im, x0 + 8, 54, x0 + 31, 80, C("#2b4fb8"))
        ellipse(im, x0 + 20, 66, 9, 9, GOLD[2]); ellipse(im, x0 + 20, 66, 6, 6, C("#2b4fb8")); ellipse(im, x0 + 20, 66, 2, 2, GOLD[3])
        rect(im, x0 - 2, 116, x0 + 41, 127, C("#9aa3b0")); rect(im, x0 - 2, 116, x0 + 41, 117, C("#c4cbd6"))
        # cap + lantern
        poly(im, [(x0 - 3, 36), (x0 + 42, 36), (x0 + 30, 26), (x0 + 9, 26)], C("#d94a3a"))
        rect(im, x0 + 9, 26, x0 + 30, 27, C("#f0705a"))
        rect(im, x0 + 13, 8, x0 + 26, 25, C("#2c3646")); rect(im, x0 + 15, 10, x0 + 24, 23, C("#ffe48a")); rect(im, x0 + 15, 10, x0 + 17, 14, C("#fff7c8"))
        poly(im, [(x0 + 11, 8), (x0 + 28, 8), (x0 + 20, 0), (x0 + 19, 0)], C("#2c3646"))
    # beam / arch over the opening
    bx0, bx1 = 40, W - 40
    rect(im, bx0, 22, bx1 - 1, 52, C("#2b4fb8"))
    rect(im, bx0, 22, bx1 - 1, 24, C("#6a8ae0")); rect(im, bx0, 50, bx1 - 1, 52, C("#14306e"))
    rect(im, bx0, 30, bx1 - 1, 31, GOLD[1]); rect(im, bx0, 44, bx1 - 1, 45, GOLD[1])
    rect(im, bx0, 28, bx1 - 1, 28, GOLD[3])
    # iron gates folded open (left/right inner edges)
    for x0, sgn in ((bx0, 1), (bx1 - 12, -1)):
        for i in range(4):
            rect(im, x0 + i * 3, 56, x0 + i * 3, 124, C("#2c3646")); px(im, x0 + i * 3, 54, GOLD[2]); px(im, x0 + i * 3, 55, GOLD[2])
        rect(im, x0, 60, x0 + 10, 61, C("#2c3646")); rect(im, x0, 112, x0 + 10, 113, C("#2c3646"))
    return outline(pad(im, 1, 1, 1, 0))


def fence_iron(spear=True):
    im = new(16, 28)
    rect(im, 0, 12, 15, 13, C("#2f3a4f")); rect(im, 0, 22, 15, 23, C("#2f3a4f"))
    for x in (1, 5, 9, 13):
        rect(im, x, 8, x + 1, 25, C("#3d4a62")); rect(im, x, 8, x, 25, C("#5d6d8a"))
        poly(im, [(x - 1, 8), (x + 2, 8), (x, 3)], GOLD[2])
    rect(im, 0, 24, 15, 27, C("#9aa3b0")); rect(im, 0, 24, 15, 24, C("#c4cbd6")); rect(im, 0, 27, 15, 27, C("#6e7a8e"))
    return outline(pad(im, 0, 1, 0, 0))


# --------------------------------------------------------- interior props ---
def easel_frame():
    # Photo stand: wooden frame on two legs with a hanging gold plaque. Photo slot = (6,4)-(37,31) (32x28).
    w, h = 44, 56
    im = new(w, h)
    ellipse(im, 22, 51, 17, 3, (20, 30, 50, 80))
    rect(im, 8, 36, 10, 52, WOOD[1]); rect(im, 33, 36, 35, 52, WOOD[1]); rect(im, 8, 36, 8, 52, WOOD[2])
    rect(im, 3, 0, 40, 36, C("#6a4326"))
    rect(im, 4, 1, 39, 35, GOLD[2]); rect(im, 4, 1, 39, 2, GOLD[3]); rect(im, 4, 34, 39, 35, GOLD[0])
    rect(im, 6, 4, 37, 31, C("#241c38"))
    rect(im, 14, 38, 29, 46, GOLD[1]); rect(im, 14, 38, 29, 39, GOLD[3]); rect(im, 14, 45, 29, 46, GOLD[0])
    return outline(pad(im))


def gallery_board():
    """Memory gallery stand: a wooden notice board on two legs, pinned with polaroid photos, a gold plate on top
    (the 'Năm N' text is added in the scene). 64 x 74, feet at the bottom."""
    w, h = 62, 72
    im = new(w, h)
    ellipse(im, 31, 68, 24, 3, (20, 30, 50, 80))
    rect(im, 12, 50, 15, 68, WOOD[1]); rect(im, 46, 50, 49, 68, WOOD[1]); rect(im, 12, 50, 12, 68, WOOD[2])
    rect(im, 2, 12, 59, 54, C("#6a4326"))
    rect(im, 3, 13, 58, 53, WOOD[2]); rect(im, 3, 13, 58, 14, WOOD[3]); rect(im, 3, 52, 58, 53, WOOD[0])
    rect(im, 6, 16, 55, 49, C("#b98d5b"))   # cork
    rect(im, 6, 16, 55, 17, C("#d1a672"))
    rnd = random.Random(3)
    for _ in range(70):
        px(im, rnd.randint(7, 54), rnd.randint(18, 48), C("#9a6f42") if rnd.random() < 0.6 else C("#caa070"))
    pics = [(8, 19, "#6fb3e8", "#2f7ac0"), (24, 21, "#f2c75a", "#d6902a"), (40, 19, "#e98a8a", "#c24f5a"),
            (13, 33, "#8ed08a", "#3f9a54"), (31, 34, "#b99be8", "#7a5cc0"), (44, 32, "#7fd6d0", "#2d9a98")]
    for x, y, a, b in pics:
        rect(im, x, y, x + 11, y + 13, C("#fdfdf6")); rect(im, x, y + 13, x + 11, y + 13, C("#d8d8cc"))
        rect(im, x + 1, y + 1, x + 10, y + 9, C(a)); rect(im, x + 1, y + 6, x + 10, y + 9, C(b))
        px(im, x + 5, y - 1, C("#e84040")); px(im, x + 6, y - 1, C("#ff7a7a"))   # red pin
    rect(im, 14, 1, 47, 10, C("#6a4326"))
    rect(im, 15, 2, 46, 9, GOLD[2]); rect(im, 15, 2, 46, 3, GOLD[3]); rect(im, 15, 8, 46, 9, GOLD[0])
    rect(im, 17, 10, 17, 12, C("#4a3320")); rect(im, 44, 10, 44, 12, C("#4a3320"))
    return outline(pad(im))


def frame_glow():
    im = new(64, 64)
    for y in range(64):
        for x in range(64):
            d = max(abs(x - 31.5) / 32, abs(y - 29.5) / 30)
            d = min(1.0, (abs(x - 31.5) / 32) ** 2 + (abs(y - 29.5) / 30) ** 2) ** 0.5
            if d < 1:
                im.putpixel((x, y), (255, 226, 130, int(150 * (1 - d) ** 1.5)))
    return im


def project_board():
    # Poster board + table with laptop. 58x82 after padding; photo slot centre (29, 22), 40x30.
    w, h = 56, 80
    im = new(w, h)
    ellipse(im, 28, 74, 24, 4, (20, 30, 50, 80))
    rect(im, 10, 40, 12, 70, WOOD[1]); rect(im, 43, 40, 45, 70, WOOD[1])
    rect(im, 2, 0, 53, 42, C("#f4ead0")); rect(im, 2, 0, 53, 1, C("#ffffff")); rect(im, 2, 41, 53, 42, C("#c9b88f"))
    rect(im, 4, 2, 51, 40, C("#2b4fb8")); rect(im, 6, 4, 49, 38, C("#241c38"))
    # table
    rect(im, 2, 54, 53, 61, WOOD[3]); rect(im, 2, 54, 53, 55, C("#e8b784")); rect(im, 2, 60, 53, 61, WOOD[1])
    rect(im, 5, 62, 8, 72, WOOD[1]); rect(im, 47, 62, 50, 72, WOOD[1])
    # laptop
    rect(im, 17, 43, 37, 53, C("#2c3646")); rect(im, 19, 45, 35, 52, C("#5ad0e8")); rect(im, 19, 45, 35, 46, C("#9ef0ff"))
    for k in range(3):
        rect(im, 21, 47 + k * 2, 21 + 5 + k * 3, 47 + k * 2, C("#ffffff"))
    rect(im, 15, 54, 39, 55, C("#9aa3b0"))
    # coffee cup and trophy
    rect(im, 42, 49, 46, 53, C("#ffffff")); rect(im, 46, 50, 47, 52, C("#ffffff")); rect(im, 43, 48, 45, 48, C("#8a5a3a"))
    rect(im, 5, 49, 11, 53, GOLD[2]); rect(im, 7, 53, 9, 54, GOLD[0]); px(im, 4, 50, GOLD[1]); px(im, 12, 50, GOLD[1])
    return outline(pad(im))


def double_door_big(open_=False):
    # Stage doors (3 tiles wide, 3.5 tall)
    W, H = 64, 72
    im = new(W, H)
    rect(im, 0, 0, W - 1, H - 1, C("#e3d5b0"))
    rect(im, 0, 0, W - 1, 5, C("#f4ead0")); rect(im, 0, 5, W - 1, 6, GOLD[0])
    rect(im, 3, 10, W - 4, H - 1, C("#4a2c1a"))
    if not open_:
        for x0 in (5, 33):
            rect(im, x0, 12, x0 + 25, H - 1, C("#8a4a2a")); rect(im, x0, 12, x0 + 25, 13, C("#b06a42"))
            rect(im, x0 + 3, 16, x0 + 22, 38, C("#6a3820")); rect(im, x0 + 3, 16, x0 + 22, 16, C("#a05a38"))
            rect(im, x0 + 3, 42, x0 + 22, H - 6, C("#6a3820")); rect(im, x0 + 3, 42, x0 + 22, 42, C("#a05a38"))
            rect(im, x0, H - 3, x0 + 25, H - 1, GOLD[0])
        rect(im, 30, 36, 31, 52, GOLD[2]); rect(im, 33, 36, 34, 52, GOLD[2]); rect(im, 28, 40, 29, 46, GOLD[3]); rect(im, 35, 40, 36, 46, GOLD[3])
    else:
        # glowing opening, doors swung back
        for y in range(10, H):
            t = (y - 10) / (H - 10)
            rect(im, 3, y, W - 4, y, mix(C("#fff6c8"), C("#ffd36a"), t))
        rect(im, 3, 10, 9, H - 1, C("#8a4a2a")); rect(im, W - 10, 10, W - 4, H - 1, C("#8a4a2a"))
        rect(im, 3, 10, 4, H - 1, C("#b06a42"))
    # lintel
    rect(im, 0, 7, W - 1, 9, C("#c9b88f"))
    return outline(pad(im, 1, 1, 1, 0))


def door_small():
    W, H = 32, 48
    im = new(W, H)
    rect(im, 0, 0, W - 1, H - 1, C("#e3d5b0")); rect(im, 0, 0, W - 1, 3, C("#f4ead0"))
    rect(im, 2, 5, W - 3, H - 1, C("#4a2c1a"))
    for x0 in (3, 17):
        rect(im, x0, 7, x0 + 11, H - 1, C("#8a4a2a")); rect(im, x0 + 2, 10, x0 + 9, 28, C("#9fd3f5")); rect(im, x0 + 2, 10, x0 + 9, 11, C("#cdeaff")); rect(im, x0 + 2, 32, x0 + 9, H - 4, C("#6a3820"))
    rect(im, 15, 26, 16, 34, GOLD[2])
    return outline(pad(im, 1, 1, 1, 0))


def stage_pieces():
    # wooden stage floor, front face, steps
    sf = wood_floor(9)
    for y in range(16):
        for x in range(16):
            c = sf.getpixel((x, y))
            sf.putpixel((x, y), shade(c, 1.12))
    reg("stage_floor", sf)
    face = new(16, 16, C("#7a1f2a"))
    rect(face, 0, 0, 15, 1, GOLD[2]); rect(face, 0, 2, 15, 2, GOLD[0])
    for x in range(0, 16, 4):
        rect(face, x + 1, 5, x + 2, 13, C("#9a2a36"))
    rect(face, 0, 14, 15, 15, C("#4a1018"))
    reg("stage_front", face)
    # carpet stairs (2 tiles wide)
    st = new(32, 32)
    for i in range(4):
        y = i * 8
        rect(st, 0, y, 31, y + 5, C("#c0383e")); rect(st, 0, y, 31, y, C("#e86058")); rect(st, 0, y + 6, 31, y + 7, C("#6a1a22"))
        rect(st, 0, y, 1, y + 7, GOLD[1]); rect(st, 30, y, 31, y + 7, GOLD[1])
    reg("stage_steps", st)

    # curtain (left/right) 32x112
    for side in ("l", "r"):
        cu = new(40, 120)
        for x in range(40):
            f = 0.78 + 0.32 * (0.5 + 0.5 * math.sin(x * 0.9))
            c = shade(C("#b8232f"), f)
            rect(cu, x, 0, x, 119, c)
        # swag toward center
        for y in range(120):
            cut = int(max(0, (y - 40) * 0.30)) if True else 0
            if side == "l":
                for x in range(40 - cut, 40):
                    px(cu, x, y, (0, 0, 0, 0))
            else:
                for x in range(0, cut):
                    px(cu, x, y, (0, 0, 0, 0))
        # tie-back (gold)
        yy = 78
        if side == "l":
            rect(cu, 14, yy, 40 - int((yy - 40) * 0.30), yy + 3, GOLD[2]); rect(cu, 14, yy + 3, 28, yy + 3, GOLD[0])
        else:
            rect(cu, int((yy - 40) * 0.30), yy, 25, yy + 3, GOLD[2]); rect(cu, 12, yy + 3, int((yy - 40) * 0.30) + 20, yy + 3, GOLD[0])
        rect(cu, 0, 0, 39, 3, GOLD[0])
        reg(f"curtain_{side}", outline(pad(cu, 1, 1, 1, 0)))
    # valance: tile 16x24 repeating, scalloped gold fringe
    va = new(16, 28)
    rect(va, 0, 0, 15, 14, C("#a01f2b")); rect(va, 0, 0, 15, 2, GOLD[2]); rect(va, 0, 3, 15, 3, GOLD[0])
    ellipse(va, 8, 15, 9, 8, C("#a01f2b")); ellipse(va, 8, 14, 9, 7, C("#c0303c"))
    rect(va, 0, 0, 15, 12, C("#c0303c")); rect(va, 0, 0, 15, 2, GOLD[2]); rect(va, 0, 3, 15, 3, GOLD[0])
    for x in range(1, 16, 3):
        px(va, x, 22, GOLD[2]); px(va, x, 23, GOLD[1])
    for x in range(0, 16):
        px(va, x, 21, GOLD[1])
    reg("valance", va)
    # backdrop 224x72 blue banner with gold stripes + emblem
    bd = new(224, 80, C("#274aa8"))
    for y in range(80):
        rect(bd, 0, y, 223, y, mix(C("#3a62c8"), C("#1b3a8c"), y / 80))
    rect(bd, 0, 0, 223, 3, GOLD[1]); rect(bd, 0, 76, 223, 79, GOLD[1])
    rect(bd, 4, 8, 219, 8, GOLD[2]); rect(bd, 4, 70, 219, 70, GOLD[2])
    for x in range(6, 220, 12):
        rect(bd, x, 10, x + 1, 68, shade(C("#3a62c8"), 1.06))
    ellipse(bd, 112, 40, 20, 20, GOLD[1]); ellipse(bd, 112, 40, 17, 17, C("#274aa8")); ellipse(bd, 112, 40, 12, 12, GOLD[2]); ellipse(bd, 112, 40, 8, 8, C("#274aa8"))
    for a in range(0, 360, 30):
        x = 112 + math.cos(math.radians(a)) * 20; y = 40 + math.sin(math.radians(a)) * 20
        rect(bd, int(x) - 1, int(y) - 1, int(x) + 1, int(y) + 1, GOLD[3])
    poly(bd, [(112, 32), (115, 38), (121, 39), (116, 43), (118, 49), (112, 46), (106, 49), (108, 43), (103, 39), (109, 38)], GOLD[3])
    reg("stage_backdrop", outline(pad(bd, 1, 1, 1, 0)))
    # podium
    pd = new(36, 52)
    ellipse(pd, 18, 47, 15, 3, (20, 30, 50, 80))
    poly(pd, [(4, 14), (31, 14), (29, 46), (6, 46)], WOOD[1])
    poly(pd, [(4, 14), (31, 14), (29, 20), (6, 20)], WOOD[3])
    rect(pd, 7, 22, 28, 42, WOOD[2]); rect(pd, 7, 22, 28, 22, WOOD[3]); rect(pd, 7, 42, 28, 42, WOOD[0])
    ellipse(pd, 17, 32, 5, 5, GOLD[2]); ellipse(pd, 17, 32, 3, 3, GOLD[0]); px(pd, 16, 31, GOLD[3])
    # microphone
    rect(pd, 17, 2, 17, 13, C("#2c3646")); ellipse(pd, 17, 2, 2, 2, C("#6e7a8e")); rect(pd, 17, 12, 20, 13, C("#2c3646"))
    reg("podium", outline(pad(pd)))
    # audience chair seen from behind
    ch = new(16, 18)
    rect(ch, 2, 3, 13, 11, C("#2b4fb8")); rect(ch, 2, 3, 13, 4, C("#5a82e0")); rect(ch, 2, 10, 13, 11, C("#1b2f78"))
    rect(ch, 3, 12, 4, 16, C("#6a4a30")); rect(ch, 11, 12, 12, 16, C("#6a4a30"))
    rect(ch, 5, 5, 10, 9, C("#3a62c8"))
    reg("chair_back", outline(pad(ch, 0, 0, 0, 0)))
    # hard-cover diploma folder (3/4 view) and the small copy the host holds (tools/diploma_art.py)
    reg("diploma_folder", diploma_art.diploma_folder())
    reg("diploma_mini", diploma_art.diploma_mini())


def spot_light_beam():
    im = new(64, 128)
    for y in range(128):
        half = 6 + y * 0.22
        for x in range(64):
            d = abs(x - 32) / half
            if d < 1:
                a = int(70 * (1 - d) * (1 - y / 140))
                im.putpixel((x, y), (255, 244, 190, a))
    return im


def wall_sconce():
    im = new(16, 24)
    rect(im, 6, 2, 9, 6, C("#2c3646")); rect(im, 5, 6, 10, 15, C("#2c3646"))
    rect(im, 6, 7, 9, 14, C("#ffe48a")); rect(im, 6, 7, 7, 10, C("#fff7c8"))
    rect(im, 4, 15, 11, 16, C("#2c3646")); rect(im, 7, 16, 8, 20, C("#2c3646")); rect(im, 5, 19, 10, 20, C("#2c3646"))
    return outline(pad(im))


def banner_hang(c1):
    im = new(20, 44)
    rect(im, 0, 0, 19, 2, GOLD[1]); px(im, 0, 0, GOLD[3])
    poly(im, [(2, 2), (17, 2), (17, 36), (9, 42), (2, 36)], c1)
    poly(im, [(2, 2), (17, 2), (17, 8), (2, 8)], shade(c1, 1.2))
    ellipse(im, 9, 18, 5, 5, GOLD[2]); ellipse(im, 9, 18, 3, 3, c1); px(im, 9, 18, GOLD[3])
    rect(im, 3, 28, 16, 28, GOLD[2])
    return outline(pad(im))


def wall_picture(seed):
    r = random.Random(seed)
    im = new(20, 18)
    rect(im, 0, 0, 19, 17, GOLD[1]); rect(im, 1, 1, 18, 16, GOLD[2]); rect(im, 2, 2, 17, 15, C("#f4ead0"))
    sky = [C("#9fd3f5"), C("#ffd9a0"), C("#d9c4f5")][seed % 3]
    rect(im, 3, 3, 16, 9, sky)
    rect(im, 3, 10, 16, 14, [C("#6bbf59"), C("#d9b27a"), C("#7cc9f5")][seed % 3])
    poly(im, [(3, 10), (8, 5), (12, 10)], C("#3a8a4a") if seed % 2 == 0 else C("#8a6a4a"))
    return outline(pad(im))


def particle_tiles():
    sp = new(4, 4)
    rect(sp, 1, 0, 2, 3, (255, 255, 255, 255)); rect(sp, 0, 1, 3, 2, (255, 255, 255, 255))
    reg("spark", sp)
    cf = new(3, 3, (255, 255, 255, 255))
    reg("confetti", cf)
    reg("glow64", lamp_glow().resize((64, 64), Image.NEAREST))
    # soft shadow pool
    sh = new(32, 12)
    ellipse(sh, 16, 6, 15, 5, (20, 30, 50, 60))
    reg("shadow_player", sh)


def ui_buttons():
    # round dark button with a gold arrow (24x24)
    for name, pts in {
        "up": [(12, 5), (19, 14), (5, 14)],
        "down": [(12, 19), (19, 10), (5, 10)],
        "left": [(5, 12), (14, 5), (14, 19)],
        "right": [(19, 12), (10, 5), (10, 19)],
    }.items():
        im = new(24, 24)
        ellipse(im, 12, 12, 11, 11, (20, 24, 48, 200))
        ellipse(im, 12, 12, 10, 10, (30, 38, 72, 215))
        ellipse(im, 12, 12, 11, 11, (0, 0, 0, 0)) if False else None
        d = ImageDraw.Draw(im)
        d.ellipse([1, 1, 22, 22], outline=GOLD[2])
        poly(im, pts, GOLD[2])
        reg(f"btn_{name}", im)
    im = new(24, 24)
    ellipse(im, 12, 12, 11, 11, (60, 30, 20, 220))
    ImageDraw.Draw(im).ellipse([1, 1, 22, 22], outline=GOLD[2])
    # "E" glyph
    for x0, y0, x1, y1 in ((8, 6, 9, 17), (8, 6, 15, 7), (8, 11, 14, 12), (8, 16, 15, 17)):
        rect(im, x0, y0, x1, y1, GOLD[3])
    reg("btn_e", im)


# -------------------------------------------------------------------- npc ---
def recolor_sheet(src_path, out_path, hair, jacket, pants):
    """Palette-swap the student sheet (red hoodie / blue jeans / dark hair) into a different passer-by."""
    import colorsys
    im = Image.open(src_path).convert("RGBA")
    px_ = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px_[x, y]
            if a == 0:
                continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            hd = h * 360
            if s > 0.35 and (hd < 20 or hd > 340) and 0.35 < v:  # hoodie reds
                nh, ns, nv = jacket
                h2 = nh / 360
                r2, g2, b2 = colorsys.hsv_to_rgb(h2, min(1, s * ns), min(1, v * nv))
                px_[x, y] = (int(r2 * 255), int(g2 * 255), int(b2 * 255), a)
            elif s > 0.25 and 200 < hd < 235 and v > 0.4:  # jeans blues
                nh, ns, nv = pants
                r2, g2, b2 = colorsys.hsv_to_rgb(nh / 360, min(1, s * ns), min(1, v * nv))
                px_[x, y] = (int(r2 * 255), int(g2 * 255), int(b2 * 255), a)
            elif v < 0.42 and s < 0.5 and hd > 200 and y % 24 < 11:  # hair
                nh, ns, nv = hair
                r2, g2, b2 = colorsys.hsv_to_rgb(nh / 360, ns, min(1, max(0.05, v * nv * 1.8)))
                px_[x, y] = (int(r2 * 255), int(g2 * 255), int(b2 * 255), a)
    im.save(out_path)


# ------------------------------------------------------------------- main ---
def build():
    # ground
    for i in range(6):
        reg(f"grass_{i}", grass_tile(10 + i, 0 if i < 4 else 2))
    street = with_edges(lambda: brick_pave(1), "pave")
    for i in range(4):
        reg(f"pave_{i}", brick_pave(20 + i))
    for i in range(4):
        reg(f"path_{i}", brick_pave(40 + i, base=GREY))
    reg("plaza_a", plaza_tile(1, True)); reg("plaza_b", plaza_tile(2, False))
    with_edges(lambda: plaza_tile(3, True), "plaza")
    # interior
    for i in range(3):
        reg(f"wood_{i}", wood_floor(30 + i))
    reg("check_a", check_floor(True)); reg("check_b", check_floor(False))
    reg("carpet_c", carpet("c")); reg("carpet_l", carpet("l")); reg("carpet_r", carpet("r"))
    wall_tiles()
    stage_pieces()
    # plants
    reg("tree_a", round_tree(1, LEAF))
    reg("tree_b", round_tree(2, LEAF2))
    reg("tree_c", round_tree(3, ORANGE_LEAF, trunk=C("#6a3a22")))
    reg("palm_a", palm_tree(1, lean=1))
    reg("palm_b", palm_tree(2, lean=-1))
    reg("palm_c", palm_tree(3, h=112, w=104, lean=1))
    reg("bush_a", bush(1, LEAF))
    reg("bush_b", bush(2, LEAF2, flowers=[C("#ff6fa0"), C("#ffffff")]))
    reg("bush_c", bush(3, LEAF, flowers=[C("#ffd23f"), C("#ff8a2a")]))
    reg("hedge_a", hedge_tile(1)); reg("hedge_b", hedge_tile(2))
    reg("bed_pink", flower_bed(48, 1, [C("#ff6fa0"), C("#ffb3d0"), C("#ffffff")]))
    reg("bed_yellow", flower_bed(48, 2, [C("#ffd23f"), C("#ff9f2a"), C("#ffffff")]))
    reg("bed_red", flower_bed(32, 3, [C("#e8483e"), C("#ff8a6a"), C("#ffd23f")]))
    reg("bed_blue", flower_bed(32, 4, [C("#6a8cff"), C("#b9a2ff"), C("#ffffff")]))
    reg("pot_plant", pot_plant(1))
    # props
    reg("rug_blue", rug(72, 36, C("#2b4fb8"), C("#f2c75a")))
    reg("rug_red", rug(72, 36, C("#b8343a"), C("#f2c75a")))
    reg("lamp", lamp_post())
    reg("lamp_glow", lamp_glow())
    reg("bunting_144", bunting(180, 0))
    reg("bunting_144b", bunting(180, 3))
    reg("bunting_80", bunting(80, 1, drop=8))
    reg("bunting_80b", bunting(80, 4, drop=8))
    reg("bunting_96", bunting(96, 1, drop=9))
    reg("bunting_64", bunting(64, 2, drop=7))
    reg("bench", bench())
    reg("umbrella_red", umbrella_table(C("#e8483e"), C("#ffffff")))
    reg("umbrella_blue", umbrella_table(C("#2f8be6"), C("#ffffff")))
    for fr in range(3):
        reg(f"fountain_{fr}", fountain(fr))
    reg("signpost", signpost())
    reg("fence", fence_iron())
    # buildings
    reg("shop_a", shop("a", 7, C("#ffe3b0"), C("#d9553a"), C("#e8483e"), C("#ffffff"), seed=1, door_col=C("#2b6fc9")))
    reg("shop_b", shop("b", 6, C("#cfeee0"), C("#3a6fb8"), C("#2fa05a"), C("#ffffff"), seed=2, door_col=C("#d94a3a"), chimney=False))
    reg("shop_c", shop("c", 7, C("#b9503f"), C("#5a6a8c"), C("#f0a52a"), C("#ffffff"), brick=True, seed=3, door_col=C("#2c3646")))
    reg("shop_d", shop("d", 6, C("#ffd1dc"), C("#8a4ab8"), C("#2f8be6"), C("#ffffff"), seed=4, door_col=C("#2fa05a"), chimney=False))
    reg("house_a", shop("e", 6, C("#fff2c4"), C("#2f8bb8"), C("#e8483e"), C("#ffffff"), floors=2, seed=5, door_col=C("#2b6fc9")))
    reg("house_b", shop("f", 7, C("#f4c6a8"), C("#b8493a"), C("#2fa05a"), C("#ffffff"), floors=2, seed=6, door_col=C("#8a4ab8")))
    reg("main_hall", hcmut_art.main_building())
    for mid, fn in marker_art.MARKERS.items():  # one object per milestone (game/featured.ts ids)
        reg(f"mk_{mid}", fn())
    reg("hcmut_gate", hcmut_art.gate_pillar())
    reg("gate_wall", hcmut_art.gate_wall())
    reg("gate_plaque", hcmut_art.gate_plaque())
    reg("flag_vn", hcmut_art.flag_vn(112))
    # interior
    reg("easel", easel_frame())
    reg("gallery_board", gallery_board())
    reg("frame_glow", frame_glow())
    reg("project_board", project_board())
    reg("doors_closed", double_door_big(False))
    reg("doors_open", double_door_big(True))
    reg("door_small", door_small())
    reg("spot_beam", spot_light_beam())
    reg("sconce", wall_sconce())
    reg("banner_blue", banner_hang(C("#2b4fb8")))
    reg("banner_red", banner_hang(C("#c0303c")))
    for i in range(3):
        reg(f"picture_{i}", wall_picture(i))
    particle_tiles()
    ui_buttons()


def main():
    ap = argparse.ArgumentParser()
    root = os.path.join(os.path.dirname(__file__), "..", "assets-src", "generated")
    ap.add_argument("--out", default=os.path.join(root, "town"))
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)
    build()
    for name, im in ASSETS.items():
        im.save(os.path.join(args.out, f"{name}.png"))
    # NPC recolors of the student sheet
    src = os.path.join(root, "host-student.png")
    npcs = {
        "npc-1": ((30, 0.9, 1.0), (205, 1.0, 1.15), (30, 0.4, 0.8)),
        "npc-2": ((40, 0.7, 1.6), (50, 1.1, 1.1), (210, 0.7, 0.9)),
        "npc-3": ((20, 0.8, 1.3), (280, 0.9, 1.0), (220, 0.5, 0.6)),
        "npc-4": ((0, 0.0, 1.0), (140, 0.9, 1.0), (30, 0.5, 0.9)),
    }
    for n, (h, j, p) in npcs.items():
        recolor_sheet(src, os.path.join(root, f"{n}.png"), h, j, p)
    # contact sheets for review
    names = list(ASSETS)
    print(f"{len(names)} sprites -> {args.out}")


if __name__ == "__main__":
    main()

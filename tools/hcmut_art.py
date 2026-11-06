"""HCMUT landmarks drawn from the reference photos: the blue glass gate pillar with the BK logo block,
the grey gate walls, and the central building (flat roof band + sign, blue columns, glass bands, white
canopy with trapezoid planters, red flag, bonsai at the entrance).

Same conventions as pixart.py: 1x, RGBA, no anti-aliasing, light from the top-left, 1px darker-hue outline.
Generic on purpose: no building code, only the street address and the school name are ever written on them
(text is added in game/scenes/Campus.ts, not baked here).
"""
import random

from pixart import C, blob, ellipse, line, mix, new, outline, pad, paste, poly, px, rect, shade

# BK blue (photo: ~#0A4F9E .. #1C5DB0) with lighter highlights
BK = [C("#082f66"), C("#0a4f9e"), C("#1c5db0"), C("#4c8dd8"), C("#8fbbea"), C("#cfe3f7")]
WHITE = C("#f7fafd")
LG = C("#dde5ee")
MG = C("#b9c6d6")
DG = C("#8e9bb0")
WALLG = [C("#2f3642"), C("#444c5a"), C("#596273"), C("#7b8597"), C("#a3acba")]  # gate walls: dark grey granite
LEAF = [C("#1f6b3c"), C("#2f9148"), C("#4cb85a"), C("#8ee07a")]

LETTERS = {
    "B": ["1110", "1001", "1001", "1110", "1001", "1001", "1110"],
    "K": ["1001", "1010", "1100", "1100", "1010", "1001", "1001"],
}


def flag_vn(pole_h=34, fw=17, fh=11):
    """Vietnamese flag (red field, yellow star) on a grey pole with a gold knob."""
    w, h = fw + 5, pole_h
    im = new(w, h)
    rect(im, 1, 2, 2, h - 1, C("#c4cbd6")); rect(im, 1, 2, 1, h - 1, C("#ffffff")); rect(im, 2, 2, 2, h - 1, C("#8e98a8"))
    rect(im, 0, 0, 3, 2, C("#f2c75a"))
    red = C("#da251d")
    for x in range(fw):
        wave = 1 if (x // 5) % 2 else 0
        rect(im, 3 + x, 3 + wave, 3 + x, 3 + wave + fh - 1, red if x > 0 else shade(red, 1.15))
        px(im, 3 + x, 3 + wave + fh - 1, shade(red, 0.78))
    cx, cy = 3 + fw // 2, 3 + fh // 2 + 1
    star = [(cx, cy - 4), (cx + 1, cy - 1), (cx + 4, cy - 1), (cx + 2, cy + 1), (cx + 3, cy + 4), (cx, cy + 2),
            (cx - 3, cy + 4), (cx - 2, cy + 1), (cx - 4, cy - 1), (cx - 1, cy - 1)]
    poly(im, star, C("#ffeb3b"))
    return outline(pad(im, 1, 1, 1, 1))


def _letters(im, text, x0, y0, col, skew):
    x = x0
    for ch in text:
        bm = LETTERS[ch]
        off = int((x - x0) * skew)
        for r, row in enumerate(bm):
            for c, bit in enumerate(row):
                if bit == "1":
                    px(im, x + c, y0 + r + off, col)
        x += 6


FONT3 = {  # tiny 3x5 caps for the 'HCM' line under the BK on the logo
    "H": ["101", "101", "111", "101", "101"],
    "C": ["111", "100", "100", "100", "111"],
    "M": ["10001", "11011", "10101", "10001", "10001"],
}


def _hex_pts(cx, cy, r, flat=True):
    """Regular hexagon: flat-top (points left/right) when flat=True."""
    sq = 0.8660254
    if flat:
        return [(cx - r, cy), (cx - r / 2, cy - r * sq), (cx + r / 2, cy - r * sq), (cx + r, cy), (cx + r / 2, cy + r * sq), (cx - r / 2, cy + r * sq)]
    return [(cx, cy - r), (cx + r * sq, cy - r / 2), (cx + r * sq, cy + r / 2), (cx, cy + r), (cx - r * sq, cy + r / 2), (cx - r * sq, cy - r / 2)]


def _big_letters(im, text, x0, y0, col, s=2):
    x = x0
    for ch in text:
        for r, row in enumerate(LETTERS[ch]):
            for c, bit in enumerate(row):
                if bit == "1":
                    rect(im, x + c * s, y0 + r * s, x + c * s + s - 1, y0 + r * s + s - 1, col)
        x += 4 * s + 2


def bk_hexagon(r=23):
    """The real Bach Khoa logo, sampled from assets-src/reference/bk-logo.png: six navy / sky-blue rhombi
    around a white hexagon holding 'BK' + 'TP.HCM'. Returned about 2r+4 px wide."""
    import os
    from PIL import Image
    src = Image.open(os.path.join(os.path.dirname(__file__), "..", "assets-src", "reference", "bk-logo.png")).convert("RGBA")
    W = 2 * r + 4
    H = round(W * src.height / src.width)
    small = src.resize((W, H), Image.BOX)
    navy, sky = (4, 43, 148), (20, 139, 219)
    pal = {"n": BK[0], "s": BK[3]}
    im = new(W, H)
    for y in range(H):
        for x in range(W):
            rr, gg, bb, a = small.getpixel((x, y))
            if a < 110:
                continue
            dn = sum((u - v) ** 2 for u, v in zip((rr, gg, bb), navy))
            ds = sum((u - v) ** 2 for u, v in zip((rr, gg, bb), sky))
            px(im, x, y, pal["n"] if dn < ds else pal["s"])
    # white hexagon in the middle (transparent in the source): fill from the centre, then lettering
    cx, cy = W // 2, H // 2
    poly(im, _hex_pts(cx, cy, r * 0.58, flat=False), WHITE)
    # navy 'BK' (2x letters) and a tiny 'HCM' line in sky blue
    _big_letters(im, "BK", cx - 9, cy - 9, BK[0], 2)
    x = cx - 6
    for ch in "HCM":
        for rr_, row in enumerate(FONT3[ch]):
            for c, bit in enumerate(row):
                if bit == "1":
                    px(im, x + c, cy + 7 + rr_, BK[3])
        x += len(FONT3[ch][0]) + 1
    return outline(pad(im, 1, 1, 1, 1))


def gate_pillar():
    """Tall faceted blue glass monolith with angular shoulders, a grey plinth and the BK hexagon logo on top
    (reference photo 5). 108 x 226, feet at the bottom edge."""
    W, H = 108, 226
    im = new(W, H)
    # ---- plinth (two grey tiers)
    rect(im, 2, 206, 105, 222, DG)
    rect(im, 2, 206, 105, 208, C("#c4cbd6")); rect(im, 2, 206, 3, 222, LG); rect(im, 2, 220, 105, 222, shade(DG, 0.7))
    rect(im, 5, 197, 102, 205, MG); rect(im, 5, 197, 102, 198, LG); rect(im, 5, 197, 6, 205, WHITE); rect(im, 5, 204, 102, 205, DG)
    # ---- body silhouette (angular shoulders) and its three faces
    top, bot = 50, 197
    xl, xa, xb, xr = 6, 28, 78, 102
    sh = 24  # shoulder drop
    poly(im, [(xl, top + sh), (xa, top), (xb, top), (xr, top + sh), (xr, bot), (xl, bot)], BK[2])
    for y in range(top, bot):  # centre face: sky gradient, lighter high up
        t = (y - top) / (bot - top)
        rect(im, xa + 1, y, xb - 1, y, mix(BK[3], BK[1], min(1.0, t * 1.1)))
    for y in range(top + sh, bot):  # left bevel face (lit)
        t = (y - top) / (bot - top)
        rect(im, xl + 1, y, xa - 1, y, mix(BK[3], BK[2], min(1.0, t * 1.3)))
    for y in range(top, bot):  # right face (shaded)
        if y >= top + sh:
            rect(im, xb + 1, y, xr - 1, y, mix(BK[2], BK[0], min(1.0, 0.35 + (y - top) / (bot - top))))
    for y in range(top, top + sh):  # shoulder wedges
        x0 = xl + (xa - xl) * (top + sh - y) // sh
        if x0 < xa:
            rect(im, max(xl, x0), y, xa - 1, y, BK[4])
        x1 = xb + (xr - xb) * (y - top) // sh
        if x1 >= xb + 1:
            rect(im, xb + 1, y, x1, y, BK[2])
    # ---- diagonal sheen streaks on the centre face (45 degrees, lower-left to upper-right)
    def streak(xs, ys, length, wd, col, face=(xa + 2, xb - 2)):
        for k in range(length):
            for w in range(wd):
                x = xs + k + w
                if face[0] <= x <= face[1]:
                    px(im, x, ys - k, col)
    streak(xa + 2, top + 76, 48, 9, BK[4]); streak(xa + 2, top + 96, 48, 4, BK[3])
    streak(xa + 2, top + 128, 40, 11, BK[3]); streak(xa + 2, top + 118, 30, 3, BK[4])
    streak(xa + 20, top + 56, 30, 5, BK[4])
    # a large darker reflected panel (the sky above the tree line) in the upper centre
    poly(im, [(xa + 6, top + 8), (xb - 6, top + 8), (xb - 6, top + 40), (xa + 6, top + 56)], BK[2])
    poly(im, [(xa + 6, top + 8), (xb - 6, top + 8), (xb - 6, top + 12), (xa + 6, top + 12)], BK[4])
    # panel joints (thin dark diagonal lines, like the frame lines in the photo)
    for k in range(0, xb - xa - 2):
        px(im, xa + 1 + k, top + 60 - k * 3 // 5, BK[0])
        px(im, xa + 1 + k, top + 124 - k * 3 // 5, BK[0])
    # ---- edge faces: bright arris between faces, dark return on the far right
    rect(im, xl, top + sh, xl, bot - 1, BK[5])
    rect(im, xa, top, xa, bot - 1, BK[5]); rect(im, xa + 1, top, xa + 1, bot - 1, BK[4])
    rect(im, xb, top, xb, bot - 1, BK[0]); rect(im, xb - 1, top, xb - 1, bot - 1, BK[2])
    rect(im, xr - 4, top + sh, xr, bot - 1, BK[0]); rect(im, xr - 4, top + sh, xr - 4, bot - 1, BK[1])
    line(im, xl, top + sh, xa, top, BK[5]); line(im, xa, top, xb, top, BK[5]); line(im, xb, top, xr, top + sh, BK[4])
    line(im, xl + 1, top + sh + 1, xa, top + 1, BK[4])
    # reflections on the side faces
    rect(im, xl + 3, 156, xa - 4, 188, BK[3]); rect(im, xl + 3, 156, xa - 4, 157, BK[4])
    poly(im, [(xb + 3, 138), (xr - 7, 132), (xr - 7, 188), (xb + 3, 188)], BK[0])
    poly(im, [(xb + 3, 96), (xr - 7, 90), (xr - 7, 120), (xb + 3, 126)], BK[2])
    # ---- bolts (white dots) at the panel corners with fine lines joining some of them
    bolts = [(xa + 5, top + 8), (xa + 24, top + 2), (xb - 4, top + 5), (xa + 5, top + 60), (xa + 25, top + 50), (xb - 5, top + 36),
             (xa + 6, top + 92), (xa + 28, top + 82), (xb - 6, top + 70), (xa + 7, top + 124), (xa + 30, top + 110), (xb - 6, top + 104),
             (xl + 9, top + 56), (xl + 11, top + 100), (xb + 7, top + 60), (xb + 12, top + 104), (xl + 8, top + 124), (xa + 22, top + 132), (xb - 8, top + 130)]
    for i in range(len(bolts) - 3):
        (x0, y0), (x1, y1) = bolts[i], bolts[i + 3]
        if abs(x1 - x0) < 30 and abs(y1 - y0) < 40 and i % 2 == 0:
            line(im, x0, y0, x1, y1, BK[4])
    for x, y in bolts:
        px(im, x, y, WHITE); px(im, x + 1, y, BK[5]); px(im, x, y + 1, BK[4])
    # ---- mount for the logo (grey-blue steel) and the hexagon
    # slim the body to the v3 proportions (nearest-neighbour squeeze keeps the pixel look), then add the logo
    from PIL import Image
    NW = 62
    im = im.resize((NW, H), Image.NEAREST)
    hx = bk_hexagon(24)
    big = new(max(NW, hx.width), H)
    paste(big, im, (big.width - NW) // 2, 0)
    paste(big, hx, (big.width - hx.width) // 2, top - hx.height + 8)
    return outline(pad(big, 1, 1, 1, 0))


def gate_wall(w=96, h=90):
    """Dark grey granite wall segment with a recessed panel (white text is added in the scene)."""
    im = new(w, h)
    # coping
    rect(im, 0, 0, w - 1, 6, WALLG[4]); rect(im, 0, 0, w - 1, 1, C("#dfe4ec")); rect(im, 0, 5, w - 1, 6, WALLG[3])
    # body
    rect(im, 1, 7, w - 2, h - 9, WALLG[1])
    rect(im, 1, 7, w - 2, 8, WALLG[0])
    # recessed panel
    rect(im, 5, 12, w - 6, h - 14, WALLG[2])
    rect(im, 5, 12, w - 6, 12, WALLG[0]); rect(im, 5, 12, 5, h - 14, WALLG[0])
    rect(im, 6, h - 14, w - 6, h - 14, WALLG[3]); rect(im, w - 6, 12, w - 6, h - 14, WALLG[3])
    rnd = random.Random(7)
    for _ in range(90):  # granite speckle
        x, y = rnd.randint(6, w - 7), rnd.randint(13, h - 15)
        px(im, x, y, WALLG[3] if rnd.random() < 0.5 else WALLG[1])
    # plinth
    rect(im, 0, h - 8, w - 1, h - 1, DG); rect(im, 0, h - 8, w - 1, h - 7, LG); rect(im, 0, h - 2, w - 1, h - 1, shade(DG, 0.7))
    return outline(pad(im, 1, 1, 1, 0))


def gate_plaque(w=36, h=18):
    """Small blue plate on a stone base: the '2022' text is added in the scene."""
    im = new(w, h)
    rect(im, 0, 0, w - 1, h - 1, MG); rect(im, 0, 0, w - 1, 0, WHITE)
    rect(im, 1, 1, w - 2, h - 4, WHITE)
    rect(im, 2, 2, w - 3, h - 5, BK[2]); rect(im, 2, 2, w - 3, 3, BK[3]); rect(im, 2, h - 5, w - 3, h - 5, BK[1])
    rect(im, 0, h - 3, w - 1, h - 1, DG); rect(im, 0, h - 3, w - 1, h - 3, LG)
    return outline(pad(im, 1, 1, 1, 0))


def _glass_pane(im, x0, y0, x1, y1, dark=False, sky=True):
    for y in range(y0, y1 + 1):
        t = (y - y0) / max(1, y1 - y0)
        c = mix(BK[4], BK[2], t) if not dark else mix(C("#46698f"), C("#1f3452"), t)
        rect(im, x0, y, x1, y, c)
    if not dark and sky:
        for k in range(min(x1 - x0, y1 - y0) - 2):
            px(im, x0 + 2 + k, y1 - 1 - k, BK[5])
            if k % 3 == 0:
                px(im, x0 + 3 + k, y1 - 1 - k, BK[5])


def _planter(im, cx, base, green):
    pts = [(cx - 6, base), (cx + 7, base), (cx + 10, base - 11), (cx - 9, base - 11)]
    poly(im, pts, WHITE)
    poly(im, [(cx + 3, base), (cx + 7, base), (cx + 9, base - 11), (cx + 4, base - 11)], MG)
    rect(im, cx - 9, base - 11, cx + 9, base - 11, WHITE)
    rect(im, cx - 7, base - 1, cx + 8, base, DG)
    rect(im, cx - 8, base - 12, cx + 8, base - 12, MG)
    if green:
        for dx in (-4, -1, 2, 5):
            rect(im, cx + dx - 1, base - 15 + abs(dx) % 2, cx + dx, base - 12, LEAF[1])
            px(im, cx + dx - 1, base - 15 + abs(dx) % 2, LEAF[3])


def bonsai(w=26, h=34, seed=1):
    """Round clipped shrub on a trunk in a white pot (the shrubs at the entrance)."""
    rnd = random.Random(seed)
    im = new(w, h)
    cx = w // 2
    rect(im, cx - 1, 14, cx, h - 8, C("#7a4a2a")); rect(im, cx - 1, 14, cx - 1, h - 8, C("#a8744a"))
    blob(im, cx, 10, 10, 8, LEAF, rnd)
    blob(im, cx - 6, 17, 6, 5, LEAF, rnd)
    blob(im, cx + 6, 16, 6, 5, LEAF, rnd)
    # pot
    poly(im, [(cx - 8, h - 9), (cx + 8, h - 9), (cx + 6, h - 1), (cx - 6, h - 1)], WHITE)
    poly(im, [(cx + 2, h - 9), (cx + 8, h - 9), (cx + 6, h - 1), (cx + 2, h - 1)], MG)
    rect(im, cx - 8, h - 9, cx + 8, h - 8, LG)
    return outline(pad(im, 1, 1, 1, 0))


MAIN_W, MAIN_H = 336, 214
MAIN_EX = 164  # x of the entrance centre inside the sprite (the scene anchors the sprite there)
MAIN_SIGN_Y = 46  # y of the sign text first line inside the sprite (fascia spans y 37..65)


def _mullion_glass(im, x0, y0, x1, y1, cols, rows, dark=False):
    """Glass panel divided by thin frame lines (blue + white) into cols x rows panes."""
    _glass_pane(im, x0, y0, x1, y1, dark=dark, sky=not dark)
    fr = C("#e9f1fa") if not dark else C("#cfd9e6")
    for i in range(1, cols):
        x = x0 + (x1 - x0) * i // cols
        rect(im, x, y0, x, y1, BK[1]); rect(im, x + 1, y0, x + 1, y1, fr)
    for j in range(1, rows):
        y = y0 + (y1 - y0) * j // rows
        rect(im, x0, y, x1, y, BK[1]); rect(im, x0, y + 1, x1, y + 1, fr)
    rect(im, x0, y0, x1, y0, BK[1]); rect(im, x0, y1, x1, y1, BK[1]); rect(im, x0, y0, x0, y1, BK[1]); rect(im, x1, y0, x1, y1, BK[1])


def main_building():
    """Central HCMUT building (reference photo 4), asymmetric. Left: tall light-blue wall block with blue frame
    columns, a row of small clerestory panes and two white box balconies on the left edge. Middle: glass band.
    Right: dark grid-window block and a long low white wing. Roof: thin white slab with a light-blue fascia (sign band)
    and soffit. White cantilevered canopy with 5 trapezoid planters over a glass entrance with grid mullions,
    bonsai in pots, red flag. Entrance centre at x = MAIN_EX, ground line at y = 16 + 188 (see MAIN_*)."""
    W, H = MAIN_W, MAIN_H
    T0 = 16  # top margin for the flag pole
    GY = 188
    im = new(W, H - T0)
    rnd = random.Random(3)
    WALL = C("#b9d6f2")
    # ---- back wall (light blue), slightly darker towards the ground
    rect(im, 22, 66, 320, GY, WALL)
    for y in range(120, GY):
        rect(im, 22, y, 320, y, mix(WALL, C("#9dbfe4"), (y - 120) / 70))
    # ---- right-hand low wing (flat roof extends past the main slab) + dark glazing
    rect(im, 226, 140, 335, GY, C("#9fbfe0"))
    for x0 in range(236, 330, 16):
        _glass_pane(im, x0, 154, x0 + 13, 180, dark=True)
        rect(im, x0 - 2, 154, x0 - 1, 180, WHITE)
    rect(im, 226, 150, 335, 153, MG)

    def col(x0, x1, y0=66, y1=GY):
        rect(im, x0, y0, x1, y1, BK[2]); rect(im, x0, y0, x0 + 1, y1, BK[3]); rect(im, x1 - 2, y0, x1, y1, BK[1]); rect(im, x1, y0, x1, y1, BK[0])

    # ---- LEFT block: clerestory panes, plain wall with seams, frame columns
    for i in range(5):
        x0 = 38 + i * 16
        _glass_pane(im, x0, 70, x0 + 13, 82)
        rect(im, x0 + 14, 70, x0 + 14, 82, WHITE)
    rect(im, 36, 69, 118, 69, WHITE); rect(im, 36, 83, 118, 84, WHITE); rect(im, 36, 84, 118, 84, MG)
    for x in range(48, 112, 21):
        rect(im, x, 90, x, GY - 8, C("#aacbeb"))
    rect(im, 36, 138, 110, 138, C("#a3c4e6"))
    col(22, 35)
    col(112, 122)
    # white box balconies stuck on the left edge
    for y0 in (106, 142):
        rect(im, 3, y0, 24, y0 + 28, WHITE)
        rect(im, 3, y0 + 1, 24, y0 + 2, LG)
        rect(im, 18, y0 + 3, 24, y0 + 28, MG)
        rect(im, 3, y0 + 26, 24, y0 + 28, MG)
        rect(im, 6, y0 + 9, 14, y0 + 17, BK[4]); rect(im, 6, y0 + 9, 14, y0 + 9, BK[2]); rect(im, 6, y0 + 17, 14, y0 + 17, BK[3])
        rect(im, 10, y0 + 9, 10, y0 + 17, WHITE)
    # ---- MIDDLE glass band and RIGHT dark grid block (upstairs)
    _mullion_glass(im, 124, 70, 205, 118, 4, 2)
    col(205, 215)
    for j in range(4):
        for i in range(7):
            x0 = 217 + i * 12
            y0 = 70 + j * 12
            _glass_pane(im, x0, y0, x0 + 9, y0 + 9, dark=True)
    rect(im, 216, 69, 302, 69, WHITE)
    rect(im, 216, 118, 302, 119, WHITE); rect(im, 216, 119, 302, 119, MG)
    col(301, 313)
    # the low wing's roof passes in front of the last column
    poly(im, [(228, 134), (335, 134), (335, 139), (224, 139)], LG)
    rect(im, 224, 139, 335, 146, WHITE); rect(im, 224, 145, 335, 146, MG)
    rect(im, 224, 147, 335, 148, DG)
    for x in range(300, 334, 8):  # solar panel strip on the far end of the wing roof
        poly(im, [(x, 134), (x + 6, 134), (x + 7, 131), (x + 1, 131)], C("#3a4d6a")); px(im, x + 2, 133, C("#8fb0d8"))
    # ---- ROOF slab: top face, pale-blue fascia (sign band), light-blue soffit, cantilevered both ends
    poly(im, [(16, 14), (318, 14), (324, 20), (4, 20)], C("#eef4fb"))
    rect(im, 16, 14, 318, 14, WHITE); rect(im, 4, 20, 324, 20, LG)
    for y in range(21, 49):  # fascia: sky-blue band, a touch lighter in the middle where the sign sits
        rect(im, 4, y, 324, y, mix(C("#c4dcf4"), C("#a9cdee"), (y - 21) / 27))
    rect(im, 4, 21, 324, 23, WHITE); rect(im, 4, 47, 324, 47, C("#eaf3fc")); rect(im, 4, 48, 324, 49, C("#7fa9d9"))
    rect(im, 4, 21, 5, 49, WHITE); rect(im, 322, 21, 324, 49, C("#8fb7e2"))
    rect(im, 4, 50, 324, 55, C("#6f9fd6")); rect(im, 4, 50, 324, 50, C("#5a8ac4")); rect(im, 4, 55, 324, 55, C("#46709f"))
    # ---- CANOPY: white cantilevered slab (angled left end) with five trapezoid planters on top
    poly(im, [(96, 100), (238, 100), (248, 106), (84, 106)], LG)
    rect(im, 96, 100, 238, 100, WHITE)
    poly(im, [(84, 106), (248, 106), (248, 114), (92, 114), (84, 108)], WHITE)
    rect(im, 84, 106, 248, 107, LG); rect(im, 92, 113, 248, 114, MG); rect(im, 92, 115, 248, 115, DG)
    for i, cx in enumerate((110, 138, 166, 194, 222)):
        _planter(im, cx, 99, green=(i % 2 == 1))
    # ---- ENTRANCE: dark hall behind glass doors with grid mullions
    rect(im, 124, 116, 205, GY, C("#1d2a42"))
    rect(im, 124, 116, 205, 121, C("#141d30"))
    for x in range(130, 202, 14):
        rect(im, x, 118, x + 3, 119, C("#ffe9a8"))
    for i in range(4):
        x0 = 126 + i * 20
        _mullion_glass(im, x0 + 1, 124, x0 + 17, GY - 4, 2, 4)
        rect(im, x0, 123, x0 + 18, 123, BK[3]); rect(im, x0, 123, x0, GY - 3, BK[2]); rect(im, x0 + 18, 123, x0 + 18, GY - 3, BK[1])
    rect(im, 124, GY - 2, 205, GY, MG)
    for x in (122, 206):  # slim white posts under the canopy
        rect(im, x, 115, x + 1, GY - 1, WHITE); rect(im, x + 1, 115, x + 1, GY - 1, MG)
    # ---- left wall lower part: vents; ground apron
    rect(im, 40, GY - 38, 108, GY - 8, C("#a2c3e6"))
    for y in range(GY - 34, GY - 8, 4):
        rect(im, 44, y, 104, y, C("#8fb3da"))
    rect(im, 0, GY, W - 1, GY + 2, LG); rect(im, 0, GY, W - 1, GY, WHITE)
    rect(im, 0, GY + 3, W - 1, GY + 5, MG); rect(im, 0, GY + 3, W - 1, GY + 3, LG)
    # shrubs along the foot of the building and a hedge in front of the low wing
    for cx, cy, rx, ry in ((40, 180, 9, 8), (56, 182, 8, 7), (72, 181, 8, 7), (88, 182, 9, 6), (240, 181, 9, 7), (258, 182, 9, 7), (276, 181, 9, 8), (294, 182, 9, 7), (312, 181, 9, 8), (328, 182, 8, 7)):
        blob(im, cx, cy, rx, ry, LEAF, rnd)
    body = outline(pad(im, 1, 0, 1, 0))
    out = new(W, H)
    out.alpha_composite(body.crop((0, 0, W, H - T0)), (0, T0))
    # bonsai in white pots flank the entrance, red flag on a tall pole at the roof
    for cx in (100, 230):
        b = bonsai(seed=cx)
        paste(out, b, cx - b.width // 2 + 1, T0 + GY - b.height + 5)
    b = bonsai(w=22, h=30, seed=77)
    paste(out, b, 68, T0 + GY - b.height + 5)
    fl = flag_vn(T0 + 31)
    paste(out, fl, 168, 0)
    return out

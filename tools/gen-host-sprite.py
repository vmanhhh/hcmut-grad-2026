#!/usr/bin/env python3
"""
Procedural pixel-art generator for the host "Tran Van Manh" (HCMUT graduate).

Outputs (default: ../assets-src/generated/):
  host-freshman.png  host-student.png  host-graduate.png
      5 columns x 4 rows of 16x24 frames  (80 x 96 px)
      columns: 0 = idle, 1..4 = walk cycle
      rows   : 0 = down, 1 = left, 2 = right, 3 = up
  host-preview.png   three outfits, front-facing idle, 8x scale

No external assets. Everything is drawn from the palette + ASCII head maps below.
A 1px outline is generated automatically from the fill colours (darker hue of the
neighbouring colour, never pure black). Light comes from the top-left.

Usage:
  python gen-host-sprite.py [--out DIR] [--no-glasses]
                            [--set key=#rrggbb ...] [--palette overrides.json]
Palette keys are listed in PAL below (e.g. --set gown=#7c3aed --set sash_teal=#f59e0b).
"""
import argparse
import json
import os
from PIL import Image

W, H = 16, 24
DIRS = ["down", "left", "right", "up"]
OUTFITS = ["freshman", "student", "graduate"]


def hx(s):
    s = s.lstrip("#")
    return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))


# ---------------------------------------------------------------- palette ---
PAL_HEX = dict(
    # base body (shared by all outfits)
    skin_l="#fbd9b6", skin="#ebb88e", skin_d="#c78f69", mouth="#a65a4c",
    hair="#25273d", hair_l="#4d5278", hair_d="#171929",
    eye="#14172b", glasses="#454c7a",
    # graduate gown (royal blue ramp) + cap
    gown_l="#4b82f7", gown="#1d4ed8", gown_d="#1636a3",
    trim_a="#a9ccff", trim_b="#f4f8ff",          # patterned trim on sleeves
    # stole / sash
    sash="#f6fafe", sash_d="#cadbea",
    teal="#22b8cf", teal_l="#7ae6f2", teal_d="#0e8aa1",
    shirt_w="#f6fafe", shirt_w_d="#cadbea",
    gold="#f2c14e", gold_d="#b98a1f",
    grad_shoe="#3c4068", grad_sole="#1a1c36",
    # freshman: light polo, dark trousers, sneakers, backpack
    polo_l="#e6f6d6", polo="#bfe3b0", polo_d="#8dbd84",
    ftr_l="#59638c", ftr="#3d4568", ftr_d="#2a3050",
    bag_l="#f59a50", bag="#e0793a", bag_d="#a85a24",
    # student: hoodie, jeans, lanyard + ID card
    hood_l="#f0928a", hood="#d4605c", hood_d="#a0413f",
    jean_l="#7ba0d8", jean="#5078b3", jean_d="#35547f",
    card="#f4f8ff", card_top="#1d4ed8",
    # sneakers
    shoe="#eef1f8", shoe_d="#b4bbd2", sole="#8890ae",
)
PAL = {k: hx(v) for k, v in PAL_HEX.items()}


# ----------------------------------------------------------------- canvas ---
class Cv:
    def __init__(self):
        self.g = [[None] * W for _ in range(H)]

    @staticmethod
    def c(k):
        return k if (k is None or isinstance(k, tuple)) else PAL[k]

    def px(self, x, y, k):
        if 0 <= x < W and 0 <= y < H:
            self.g[y][x] = self.c(k)

    def rect(self, x0, y0, x1, y1, k):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.px(x, y, k)

    def rows(self, x0, y0, lines, mp):
        for j, line in enumerate(lines):
            for i, ch in enumerate(line):
                if ch != "." and ch in mp:
                    self.px(x0 + i, y0 + j, mp[ch])

    def flip(self):
        self.g = [row[::-1] for row in self.g]

    def outline(self):
        def dark(c):
            return (int(c[0] * .36), int(c[1] * .36), min(255, int(c[2] * .42) + 14))
        src = [row[:] for row in self.g]
        for y in range(H):
            for x in range(W):
                if src[y][x] is not None:
                    continue
                best = None
                for dx, dy in ((0, -1), (-1, 0), (1, 0), (0, 1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < W and 0 <= ny < H and src[ny][nx] is not None:
                        o = dark(src[ny][nx])
                        if best is None or sum(o) < sum(best):
                            best = o
                if best:
                    self.g[y][x] = best

    def image(self):
        im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        for y in range(H):
            for x in range(W):
                if self.g[y][x] is not None:
                    im.putpixel((x, y), self.g[y][x] + (255,))
        return im


# ------------------------------------------------------------------ heads ---
# Fill only (outline is automatic). Head occupies x4..11, rows 2..9.
# H hair, h hair highlight, d hair shade, S skin, s skin shade, G glasses,
# E eye, m mouth
HEAD = {
    "down": (4, [
        ".HhhHHH.",
        "HhhHHHHH",
        "HHHHHHHH",
        "HHSSSSSH",
        "SGGSSGGS",
        "SGEGGEGS",
        "SSSSSSSs",
        ".SSmmSS.",
    ]),
    "left": (4, [
        ".HhhHHH.",
        "HhhHHHHH",
        "HHHHHHHH",
        "HSSSHHHH",
        "SGGGGGHH",
        "SGEGSsHH",
        "SSSSSsHH",
        ".mSSsHH.",
    ]),
    "up": (4, [
        ".HhhHHH.",
        "HhhHHHHH",
        "HHHHHHHH",
        "HHHHHHHH",
        "HHHHHHHH",
        "SHHHHHHS",
        "HHddddHH",
        ".HddddH.",
    ]),
}
# the "left" map has its face on the left; an eyeless variant when glasses are off
# is made by swapping G -> S at draw time (eyes stay).


def draw_head(cv, d, dy, glasses):
    key = {"down": "down", "left": "left", "right": "left", "up": "up"}[d]
    x0, lines = HEAD[key]
    mp = dict(H="hair", h="hair_l", d="hair_d", S="skin", s="skin_d",
              G="glasses" if glasses else "skin", E="eye", m="mouth")
    cv.rows(x0, 2 + dy, lines, mp)
    if not glasses and key == "down":
        pass


def draw_cap(cv, d, dy):
    dy += 1
    """Flat royal-blue mortarboard with a gold tassel (covers hair rows 2..4)."""
    cv.rect(3, 1 + dy, 12, 1 + dy, "gown")
    cv.rect(1, 2 + dy, 14, 2 + dy, "gown")
    cv.rect(2, 3 + dy, 13, 3 + dy, "gown")
    cv.rect(4, 4 + dy, 11, 4 + dy, "gown_d")       # underside / thickness
    # top-left light
    cv.rect(3, 1 + dy, 8, 1 + dy, "gown_l")
    cv.rect(1, 2 + dy, 5, 2 + dy, "gown_l")
    cv.rect(2, 3 + dy, 3, 3 + dy, "gown_l")
    # shade on the right / front edge
    cv.rect(11, 1 + dy, 12, 1 + dy, "gown_d")
    cv.rect(12, 2 + dy, 14, 2 + dy, "gown_d")
    cv.rect(10, 3 + dy, 13, 3 + dy, "gown_d")
    # centre button
    cv.px(7, 2 + dy, "gown_d")
    cv.px(8, 2 + dy, "gown_d")
    tx = 1 if d == "up" else 14
    if tx == 14:
        for x in range(9, 14):
            cv.px(x, 2 + dy, "gold")
    else:
        for x in range(2, 7):
            cv.px(x, 2 + dy, "gold")
    for y in range(3, 6):
        cv.px(tx, y + dy, "gold")
    cv.px(tx, 6 + dy, "gold_d")
    cv.px(tx, 2 + dy, "gold")


# ---------------------------------------------------------- shared pieces ---
def shoe(cv, x0, x1, y_top, k_top="shoe", k_sole="sole"):
    cv.rect(x0, y_top, x1, y_top, k_top)
    cv.rect(x0, y_top + 1, x1, y_top + 1, k_sole)
    cv.px(x0, y_top, "shoe" if k_top == "shoe" else k_top)


def legs_front(cv, o, liftL, liftR):
    gown = o == "graduate"
    pl, pm, pd = {"freshman": ("ftr_l", "ftr", "ftr_d"),
                  "student": ("jean_l", "jean", "jean_d"),
                  "graduate": ("gown_l", "gown", "gown_d")}[o]
    for (x0, lift, left) in ((5, liftL, True), (8, liftR, False)):
        if not gown:
            top = 16
            bot = 19 if lift else 20
            cv.rect(x0, top, x0 + 2, bot, pm)
            if left:
                cv.rect(x0, top, x0, bot, pl)
                cv.rect(x0 + 2, top, x0 + 2, bot, pd)
            else:
                cv.rect(x0 + 2, top, x0 + 2, bot, pd)
        y = 20 if lift else 21
        sx0, sx1 = (x0 - 1, x0 + 2) if left else (x0, x0 + 3)
        if gown:
            cv.rect(sx0, y, sx1, y, "grad_shoe")
            cv.rect(sx0, y + 1, sx1, y + 1, "grad_sole")
        else:
            cv.rect(sx0, y, sx1, y, "shoe")
            cv.rect(sx0, y + 1, sx1, y + 1, "sole")
            cv.px(sx1 if left else sx0, y, "shoe_d")


def legs_back(cv, o, liftL, liftR):
    legs_front(cv, o, liftL, liftR)


def legs_side(cv, o, nx, fx, nlift, flift):
    """near leg at x offset nx, far leg at fx (base x = 6, 3 wide)."""
    gown = o == "graduate"
    pl, pm, pd = {"freshman": ("ftr_l", "ftr", "ftr_d"),
                  "student": ("jean_l", "jean", "jean_d"),
                  "graduate": ("gown_l", "gown", "gown_d")}[o]
    for (x0, lift, near) in ((fx, flift, False), (nx, nlift, True)):
        if not gown:
            bot = 19 if lift else 20
            col = pm if near else pd
            cv.rect(x0, 16, x0 + 2, bot, col)
            if near:
                cv.rect(x0, 16, x0, bot, pl)
                cv.rect(x0 + 2, 16, x0 + 2, bot, pd)
        y = 20 if lift else 21
        sx0, sx1 = x0 - 1, x0 + 2
        if gown:
            cv.rect(sx0, y, sx1, y, "grad_shoe")
            cv.rect(sx0, y + 1, sx1, y + 1, "grad_sole")
        else:
            top = "shoe" if near else "shoe_d"
            cv.rect(sx0, y, sx1, y, top)
            cv.rect(sx0, y + 1, sx1, y + 1, "sole")


def sleeve_trim(cv, x0, x1, y0, y1):
    """patterned light-blue / white trim"""
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            cv.px(x, y, "trim_a" if (x + y) % 2 == 0 else "trim_b")


# ---------------------------------------------------- torso: casual outfits ---
def torso_casual_front(cv, o, dy, aL, aR, back=False):
    if o == "freshman":
        sl, sm, sd = "polo_l", "polo", "polo_d"
    else:
        sl, sm, sd = "hood_l", "hood", "hood_d"
    # backpack drawn first when seen from behind (covers torso)
    cv.rect(5, 10 + dy, 10, 16 + dy, sm)
    cv.rect(5, 10 + dy, 6, 10 + dy, sl)
    cv.rect(5, 11 + dy, 5, 15 + dy, sl)
    cv.rect(10, 11 + dy, 10, 16 + dy, sd)
    cv.rect(5, 16 + dy, 10, 16 + dy, sd) if o == "student" else None
    # arms
    for (x0, a, left) in ((3, aL, True), (11, aR, False)):
        y0 = 11 + dy + a
        if o == "freshman":
            cv.rect(x0, y0, x0 + 1, y0 + 1, sm)      # short sleeve
            cv.rect(x0, y0 + 2, x0 + 1, y0 + 4, "skin")
            cv.rect(x0, y0 + 5, x0 + 1, y0 + 5, "skin_d")
            if left:
                cv.px(x0, y0, sl)
                cv.rect(x0 + 1, y0 + 2, x0 + 1, y0 + 4, "skin_d")
            else:
                cv.rect(x0, y0 + 2, x0, y0 + 4, "skin_d")
                cv.px(x0 + 1, y0 + 1, sd)
        else:
            cv.rect(x0, y0, x0 + 1, y0 + 4, sm)
            cv.rect(x0, y0 + 5, x0 + 1, y0 + 5, sd)  # cuff
            cv.rect(x0, y0 + 6, x0 + 1, y0 + 6, "skin")
            if left:
                cv.rect(x0, y0, x0, y0 + 4, sl)
                cv.rect(x0 + 1, y0, x0 + 1, y0 + 4, sd)
            else:
                cv.rect(x0, y0, x0, y0 + 4, sd)
            cv.px(x0 if left else x0 + 1, y0 + 6, "skin")
    if back:
        if o == "freshman":
            # backpack
            cv.rect(4, 10 + dy, 11, 17 + dy, "bag")
            cv.rect(4, 10 + dy, 11, 10 + dy, "bag_l")
            cv.rect(4, 11 + dy, 4, 16 + dy, "bag_l")
            cv.rect(11, 11 + dy, 11, 17 + dy, "bag_d")
            cv.rect(4, 17 + dy, 11, 17 + dy, "bag_d")
            cv.rect(6, 14 + dy, 9, 16 + dy, "bag_d")     # pocket
            cv.rect(6, 14 + dy, 9, 14 + dy, "bag")
            cv.rect(6, 15 + dy, 6, 16 + dy, "bag")
            cv.px(7, 11 + dy, "bag_d")
            cv.px(8, 11 + dy, "bag_d")                  # top handle
            # arms re-drawn over bag edges
            for (x0, a) in ((3, aL), (11, aR)):
                pass
        else:
            # hood bunched at the nape + lanyard strap
            cv.rect(5, 10 + dy, 10, 12 + dy, "hood_d")
            cv.rect(6, 12 + dy, 9, 12 + dy, "hood")
            cv.rect(5, 10 + dy, 7, 10 + dy, "hood")
            cv.px(7, 10 + dy, "teal")
            cv.px(8, 10 + dy, "teal")
        return
    # ---- front details
    if o == "freshman":
        # polo collar + placket, backpack straps
        cv.rect(6, 10 + dy, 9, 10 + dy, "skin_d")
        cv.px(6, 10 + dy, "polo_l")
        cv.px(9, 10 + dy, "polo_l")
        cv.px(6, 11 + dy, "polo_l")
        cv.px(9, 11 + dy, "polo_d")
        cv.px(7, 11 + dy, "polo_d")
        cv.px(8, 11 + dy, "polo_d")
        cv.px(7, 12 + dy, "polo_d")
        cv.rect(5, 10 + dy, 5, 14 + dy, "bag_d")    # shoulder straps
        cv.rect(10, 10 + dy, 10, 14 + dy, "bag_d")
        cv.px(5, 10 + dy, "bag")
        cv.px(10, 10 + dy, "bag")
        cv.rect(5, 15 + dy, 5, 15 + dy, "bag")
        cv.rect(10, 15 + dy, 10, 15 + dy, "bag_d")
        cv.rect(6, 13 + dy, 9, 13 + dy, "polo")  # no-op keeps shirt tone
    else:
        # hoodie neckline + lanyard + ID card
        cv.rect(5, 10 + dy, 10, 10 + dy, "hood_d")
        cv.rect(7, 10 + dy, 8, 10 + dy, "skin_d")
        cv.px(5, 10 + dy, "hood")
        cv.px(6, 10 + dy, "hood")
        cv.px(6, 11 + dy, "teal")
        cv.px(9, 11 + dy, "teal")
        cv.px(7, 12 + dy, "teal")
        cv.px(8, 12 + dy, "teal_d")
        cv.px(7, 13 + dy, "teal")
        cv.px(8, 13 + dy, "teal_d")
        cv.rect(7, 14 + dy, 8, 16 + dy, "card")
        cv.rect(7, 14 + dy, 8, 14 + dy, "card_top")
        cv.px(8, 16 + dy, "shoe_d")
        cv.px(7, 15 + dy, "shoe_d")


def torso_casual_side(cv, o, dy, nx, bag=True):
    """left-facing; nx = near-arm swing in x (-1,0,1)"""
    if o == "freshman":
        sl, sm, sd = "polo_l", "polo", "polo_d"
    else:
        sl, sm, sd = "hood_l", "hood", "hood_d"
    if o == "freshman":
        cv.rect(10, 11 + dy, 12, 17 + dy, "bag")
        cv.rect(10, 11 + dy, 12, 11 + dy, "bag_l")
        cv.rect(12, 12 + dy, 12, 17 + dy, "bag_d")
        cv.rect(10, 17 + dy, 12, 17 + dy, "bag_d")
        cv.rect(11, 14 + dy, 12, 16 + dy, "bag_d")
        cv.px(11, 14 + dy, "bag")
    if o == "student":
        cv.rect(10, 10 + dy, 11, 12 + dy, "hood_d")   # hood bump at the back
    cv.rect(5, 10 + dy, 10, 16 + dy, sm)
    cv.rect(5, 10 + dy, 7, 10 + dy, sl)
    cv.rect(5, 11 + dy, 5, 15 + dy, sl)
    cv.rect(10, 11 + dy, 10, 16 + dy, sd)
    if o == "student":
        cv.rect(5, 16 + dy, 10, 16 + dy, sd)
        cv.rect(5, 10 + dy, 6, 10 + dy, "hood_d")
        cv.px(5, 11 + dy, "teal")
        cv.px(5, 12 + dy, "teal")
        cv.rect(5, 13 + dy, 6, 15 + dy, "card")          # ID card seen edge-on
        cv.rect(5, 13 + dy, 6, 13 + dy, "card_top")
        cv.px(6, 15 + dy, "shoe_d")
    else:
        cv.rect(5, 10 + dy, 6, 10 + dy, "skin_d")
        cv.px(6, 10 + dy, "polo_l")
        cv.px(5, 11 + dy, "polo_d")
        cv.px(8, 10 + dy, "bag_d")  # backpack strap
        cv.rect(8, 11 + dy, 8, 14 + dy, "bag_d")
    # far arm (darker) then near arm
    for (ax, near) in ((8 - nx, False), (6 + nx, True)):
        col = sm if near else sd
        if o == "freshman":
            cv.rect(ax, 11 + dy, ax + 1, 12 + dy, col)
            cv.rect(ax, 13 + dy, ax + 1, 15 + dy, "skin" if near else "skin_d")
            cv.rect(ax, 16 + dy, ax + 1, 16 + dy, "skin_d")
        else:
            cv.rect(ax, 11 + dy, ax + 1, 15 + dy, col)
            cv.rect(ax, 16 + dy, ax + 1, 16 + dy, sd if near else "hood_d")
            cv.rect(ax, 17 + dy, ax + 1, 17 + dy, "skin" if near else "skin_d")
        if near:
            cv.rect(ax, 11 + dy, ax, 12 + dy, sl)


# --------------------------------------------------------- graduate gown ---
def skirt(cv, flare=True):
    cv.rect(4, 16, 11, 20, "gown")
    cv.rect(4, 16, 4, 20, "gown_l")
    cv.rect(11, 16, 11, 20, "gown_d")
    cv.rect(7, 17, 7, 20, "gown_d")                  # fold
    if flare:
        cv.rect(3, 19, 12, 20, "gown")
        cv.rect(3, 19, 3, 20, "gown_l")
        cv.rect(12, 19, 12, 20, "gown_d")
        cv.rect(7, 19, 7, 20, "gown_d")
        cv.rect(10, 18, 10, 20, "gown_d")
    cv.rect(3, 20, 12, 20, "gown_d")                  # hem shadow
    for x in range(3, 13):
        if x % 2 == 0:
            cv.px(x, 20, "trim_a")                  # hem trim dashes
        else:
            cv.px(x, 20, "gown_d")


def gown_sleeve(cv, dy, left, a):
    y = dy + a
    if left:
        cells = [(3, 3, 11), (2, 3, 12), (2, 3, 13), (1, 3, 14), (1, 3, 15)]
        for (x0, x1, r) in cells:
            cv.rect(x0, r + y, x1, r + y, "gown")
            cv.px(x0, r + y, "gown_l")
            cv.px(x1, r + y, "gown_d")
        sleeve_trim(cv, 1, 3, 16 + y, 17 + y)
        cv.px(3, 16 + y, "gown_d")
        cv.px(1, 17 + y, "trim_b")
    else:
        cells = [(12, 12, 11), (12, 13, 12), (12, 13, 13), (12, 14, 14), (12, 14, 15)]
        for (x0, x1, r) in cells:
            cv.rect(x0, r + y, x1, r + y, "gown")
            cv.px(x0, r + y, "gown_d")
            cv.px(x1, r + y, "gown_d")
        cv.rect(12, 11 + y, 12, 15 + y, "gown_d")
        sleeve_trim(cv, 12, 14, 16 + y, 17 + y)
        cv.px(12, 16 + y, "gown_d")
        cv.px(14, 17 + y, "trim_a")


def stole_band_front(cv, dy, left):
    # upper narrow strip over the shoulder, then broader teal panel hanging down
    if left:
        xs_top = (4, 5)
        xs = (4, 6)
    else:
        xs_top = (10, 11)
        xs = (9, 11)
    cv.rect(xs_top[0], 10 + dy, xs_top[1], 12 + dy, "sash")
    cv.rect(xs[0], 13 + dy, xs[1], 18 + dy, "teal")
    # white border on the outer edge + lighter inner / darker shade
    if left:
        cv.rect(4, 13 + dy, 4, 18 + dy, "sash")
        cv.rect(6, 13 + dy, 6, 18 + dy, "teal_d")
        for j, x in enumerate((5, 6, 5, 6, 5)):
            if x == 5:
                cv.px(5, 14 + dy + j, "teal_l")
        cv.px(5, 13 + dy, "teal_l")
        cv.px(6, 15 + dy, "teal_l")
        cv.px(6, 17 + dy, "teal_l")
        cv.px(4, 10 + dy, "sash_d") if False else None
        cv.px(5, 12 + dy, "sash_d")
    else:
        cv.rect(11, 13 + dy, 11, 18 + dy, "sash_d")
        cv.rect(9, 13 + dy, 9, 18 + dy, "teal")
        cv.rect(10, 13 + dy, 10, 18 + dy, "teal_d")
        cv.px(9, 13 + dy, "teal_l")
        cv.px(9, 15 + dy, "teal_l")
        cv.px(9, 17 + dy, "teal_l")
        cv.px(10, 14 + dy, "teal")
        cv.px(10, 16 + dy, "teal")
        cv.px(10, 12 + dy, "sash_d")
        cv.px(11, 12 + dy, "sash_d")
    # tip
    cv.rect(xs[0], 18 + dy, xs[1], 18 + dy, "teal_d")
    cv.px(xs[0], 18 + dy, "sash_d")


def gown_front(cv, dy, aL, aR):
    skirt(cv)
    # torso
    cv.rect(4, 10 + dy, 11, 16 + dy, "gown")
    cv.rect(4, 10 + dy, 8, 10 + dy, "gown_l")
    cv.rect(4, 11 + dy, 4, 16 + dy, "gown_l")
    cv.rect(11, 11 + dy, 11, 16 + dy, "gown_d")
    cv.rect(7, 13 + dy, 7, 16 + dy, "gown_d") if False else None
    gown_sleeve(cv, dy, True, aL)
    gown_sleeve(cv, dy, False, aR)
    # white shirt + teal V
    cv.rect(6, 10 + dy, 9, 10 + dy, "shirt_w")
    cv.px(6, 10 + dy, "teal")
    cv.px(9, 10 + dy, "teal")
    cv.px(7, 11 + dy, "teal")
    cv.px(8, 11 + dy, "teal")
    cv.px(6, 11 + dy, "shirt_w")
    cv.px(9, 11 + dy, "shirt_w_d")
    stole_band_front(cv, dy, True)
    stole_band_front(cv, dy, False)
    # trim lines down the gown front edges (between the stoles)
    for y in range(13, 19):
        cv.px(7, y + dy, "trim_a" if y % 2 else "gown_d")
        cv.px(8, y + dy, "gown_d")


def gown_back(cv, dy, aL, aR):
    skirt(cv)
    cv.rect(4, 10 + dy, 11, 16 + dy, "gown")
    cv.rect(4, 10 + dy, 8, 10 + dy, "gown_l")
    cv.rect(4, 11 + dy, 4, 16 + dy, "gown_l")
    cv.rect(11, 11 + dy, 11, 16 + dy, "gown_d")
    cv.rect(7, 11 + dy, 7, 16 + dy, "gown_d")           # centre seam
    gown_sleeve(cv, dy, True, aL)
    gown_sleeve(cv, dy, False, aR)
    cv.rect(5, 10 + dy, 10, 10 + dy, "shirt_w")        # collar seen from behind
    cv.rect(4, 10 + dy, 4, 11 + dy, "sash")             # stole over shoulders
    cv.rect(11, 10 + dy, 11, 11 + dy, "sash_d")
    cv.px(5, 11 + dy, "sash")
    cv.px(10, 11 + dy, "sash_d")
    cv.rect(6, 11 + dy, 9, 11 + dy, "gown_l")
    # stole trailing a bit at the hem line on both sides
    cv.rect(4, 12 + dy, 4, 13 + dy, "teal")
    cv.rect(11, 12 + dy, 11, 13 + dy, "teal_d")


def gown_side(cv, dy, nx):
    # skirt (left-facing)
    cv.rect(5, 16, 10, 19, "gown")
    cv.rect(5, 16, 5, 19, "gown_l")
    cv.rect(10, 16, 10, 19, "gown_d")
    cv.rect(4, 19, 11, 20, "gown")
    cv.rect(4, 19, 4, 20, "gown_l")
    cv.rect(11, 19, 11, 20, "gown_d")
    cv.rect(8, 17, 8, 20, "gown_d")
    for x in range(4, 12):
        cv.px(x, 20, "trim_a" if x % 2 == 0 else "gown_d")
    # torso
    cv.rect(5, 10 + dy, 10, 16 + dy, "gown")
    cv.rect(5, 10 + dy, 8, 10 + dy, "gown_l")
    cv.rect(5, 11 + dy, 5, 16 + dy, "gown_l")
    cv.rect(10, 11 + dy, 10, 16 + dy, "gown_d")
    # far sleeve behind (dark), swinging opposite
    fx = -nx
    for (x0, x1, r) in ((8, 10, 12), (8, 10, 13), (8, 10, 14), (7, 10, 15)):
        cv.rect(x0 + fx, r + dy, x1 + fx, r + dy, "gown_d")
    sleeve_trim(cv, 7 + fx, 10 + fx, 16 + dy, 17 + dy)
    cv.rect(7 + fx, 16 + dy, 10 + fx, 16 + dy, "trim_a")
    for x in range(7 + fx, 11 + fx):
        cv.px(x, 17 + dy, "trim_b" if x % 2 else "trim_a")
    # white shirt collar / teal V (seen from the side)
    cv.rect(5, 10 + dy, 6, 10 + dy, "shirt_w")
    cv.px(5, 10 + dy, "teal")
    # stole hangs down the front
    cv.rect(5, 11 + dy, 6, 12 + dy, "sash")
    cv.rect(5, 13 + dy, 6, 18 + dy, "teal")
    cv.rect(5, 13 + dy, 5, 18 + dy, "sash")
    cv.rect(6, 13 + dy, 6, 18 + dy, "teal")
    cv.px(6, 14 + dy, "teal_l")
    cv.px(6, 16 + dy, "teal_l")
    cv.px(6, 18 + dy, "teal_d")
    cv.px(5, 18 + dy, "sash_d")
    cv.px(6, 12 + dy, "sash_d")
    # near wide sleeve
    sx = nx
    for (x0, x1, r) in ((6, 8, 11), (6, 9, 12), (6, 9, 13), (5, 9, 14), (5, 9, 15)):
        cv.rect(x0 + sx, r + dy, x1 + sx, r + dy, "gown")
        cv.px(x0 + sx, r + dy, "gown_l")
        cv.px(x1 + sx, r + dy, "gown_d")
    cv.rect(5 + sx, 16 + dy, 9 + sx, 17 + dy, "trim_a")
    for x in range(5 + sx, 10 + sx):
        cv.px(x, 16 + dy, "trim_a" if x % 2 == 0 else "trim_b")
        cv.px(x, 17 + dy, "trim_b" if x % 2 == 0 else "trim_a")


# ---------------------------------------------------------------- frames ---
def make_frame(outfit, d, f, glasses):
    """f: 0 idle, 1..4 walk. returns finished Cv (left-facing drawn then flipped)."""
    cv = Cv()
    bob = -1 if f in (2, 4) else 0
    gown = outfit == "graduate"

    if d in ("down", "up"):
        liftL = f == 3          # screen-left leg lifted
        liftR = f == 1
        aL = {1: -1, 3: 1}.get(f, 0)   # arm swings opposite of its same-side leg
        aR = {1: 1, 3: -1}.get(f, 0)
        legs_front(cv, outfit, liftL, liftR)
        if gown:
            (gown_front if d == "down" else gown_back)(cv, bob, aL, aR)
        else:
            torso_casual_front(cv, outfit, bob, aL, aR, back=(d == "up"))
        if d == "up" and outfit == "freshman":
            pass
    else:
        mirror = d == "right"
        # left-facing drawing
        if f == 1:
            nx, fx, nl, fl, sw = 4, 8, False, False, 1
        elif f == 2:
            nx, fx, nl, fl, sw = 6, 6, False, True, 0
        elif f == 3:
            nx, fx, nl, fl, sw = 8, 4, False, False, -1
        elif f == 4:
            nx, fx, nl, fl, sw = 6, 6, True, False, 0
        else:
            nx, fx, nl, fl, sw = 6, 6, False, False, 0
        if f in (1, 3):
            # near leg forward at f1 (x-2) -> arm back (+1)
            pass
        legs_side(cv, outfit, nx, fx, nl, fl)
        if gown:
            gown_side(cv, bob, sw)
        else:
            torso_casual_side(cv, outfit, bob, sw)

    dh = {"down": "down", "up": "up", "left": "left", "right": "left"}[d]
    draw_head(cv, d, bob, glasses)
    if gown:
        draw_cap(cv, d if d != "right" else "left", bob)
    if d == "right":
        cv.flip()
    cv.outline()
    return cv


def build_sheet(outfit, glasses):
    sheet = Image.new("RGBA", (W * 5, H * 4), (0, 0, 0, 0))
    for r, d in enumerate(DIRS):
        for c in range(5):
            sheet.paste(make_frame(outfit, d, c, glasses).image(), (c * W, r * H))
    return sheet


def build_preview(glasses, scale=8):
    bg = (206, 218, 200, 255)
    pad = 2
    pw = (W + pad) * 3 + pad
    ph = H + 2 * pad
    img = Image.new("RGBA", (pw, ph), bg)
    for i, o in enumerate(OUTFITS):
        fr = make_frame(o, "down", 0, glasses).image()
        # tiny ground shadow
        sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        for x in range(4, 12):
            sh.putpixel((x, 23), (120, 135, 115, 255))
        img.alpha_composite(sh, (pad + i * (W + pad), pad))
        img.alpha_composite(fr, (pad + i * (W + pad), pad))
    return img.resize((pw * scale, ph * scale), Image.NEAREST)


def main():
    ap = argparse.ArgumentParser()
    here = os.path.dirname(os.path.abspath(__file__))
    ap.add_argument("--out", default=os.path.join(here, "..", "assets-src", "generated"))
    ap.add_argument("--no-glasses", action="store_true")
    ap.add_argument("--set", action="append", default=[], metavar="key=#hex")
    ap.add_argument("--palette", help="JSON file {key: '#hex'}")
    a = ap.parse_args()
    ov = {}
    if a.palette:
        with open(a.palette, encoding="utf-8") as fh:
            ov.update(json.load(fh))
    for s in a.set:
        k, v = s.split("=", 1)
        ov[k] = v
    for k, v in ov.items():
        if k not in PAL:
            raise SystemExit("unknown palette key: %s" % k)
        PAL[k] = hx(v)
    out = os.path.abspath(a.out)
    os.makedirs(out, exist_ok=True)
    glasses = not a.no_glasses
    for o in OUTFITS:
        build_sheet(o, glasses).save(os.path.join(out, "host-%s.png" % o))
    build_preview(glasses).save(os.path.join(out, "host-preview.png"))
    print("wrote sprites to", out)


if __name__ == "__main__":
    main()

"""Milestone objects for the journey: one small pixel-art object per memory (paper plane for the flight,
lighthouse for Nha Trang, camera for Media, cake for the colleagues ...). Each sprite is 44 x 60 with the
feet on the bottom row so the scene can anchor it at (0.5, 1).

Same conventions as pixart.py: 1x, RGBA, no anti-aliasing, light from the top-left, 1px darker outline.
Usage: marker_art.MARKERS maps the beat id (game/featured.ts) to a function returning an Image.
"""
from PIL import Image

from pixart import C, ellipse, line, mix, new, outline, pad, paste, poly, px, rect, shade, shadow

W, H = 44, 58
CX = W // 2
WOOD = [C("#5a3615"), C("#8a5a2b"), C("#b7814a"), C("#d9a76a")]
SKIN = [C("#c98a5a"), C("#e8b48a"), C("#f6d2b0")]
WHITE = C("#f7fafd")
INK = C("#1f2433")
GREEN = [C("#1f6b3c"), C("#2f9148"), C("#4cb85a"), C("#8ee07a")]
RED = [C("#8f1f2a"), C("#c0303c"), C("#e8483e"), C("#ff8a7a")]
BLUE = [C("#16397a"), C("#2b64c8"), C("#4f8be8"), C("#9cc3f5")]
YEL = [C("#b8801a"), C("#e2b02a"), C("#f6d84a"), C("#fff0a0")]
GREY = [C("#4a5262"), C("#7c8799"), C("#a9b2c0"), C("#dfe4ec")]

# 3x5 pixel digits / letters (for door numbers, "K22")
FONT = {
    "0": ["111", "101", "101", "101", "111"], "1": ["010", "110", "010", "010", "111"],
    "2": ["111", "001", "111", "100", "111"], "7": ["111", "001", "010", "010", "010"],
    "K": ["101", "101", "110", "101", "101"],
}


def text(im, s, x, y, c):
    for i, ch in enumerate(s):
        for ry, row in enumerate(FONT[ch]):
            for rx, v in enumerate(row):
                if v == "1":
                    px(im, x + i * 4 + rx, y + ry, c)


def finish(im, shadow_w=13):
    im = shadow(im, CX, H - 3, shadow_w, 3, 75)
    return outline(im)


def canvas():
    return new(W, H)


def post(im, x=CX, top=24, bot=H - 3, w=3):
    rect(im, x - w // 2, top, x + w // 2, bot, WOOD[1])
    rect(im, x - w // 2, top, x - w // 2, bot, WOOD[2])
    rect(im, x + w // 2, top, x + w // 2, bot, WOOD[0])


# ---------------------------------------------------------------- year 1 -----
def plane():  # Day 1: flying into Saigon
    im = canvas()
    post(im, top=26)
    poly(im, [(4, 14), (40, 6), (22, 28)], WHITE)
    poly(im, [(4, 14), (22, 28), (18, 17)], GREY[3])
    poly(im, [(22, 28), (40, 6), (27, 17)], GREY[2])
    line(im, 4, 14, 27, 17, GREY[1])
    for x, y in ((9, 22), (3, 26), (13, 30)):  # speed dots
        px(im, x, y, BLUE[2])
    return finish(im)


def balloons():  # Khai giang: flag + balloons
    im = canvas()
    post(im, top=14, w=1)
    rect(im, CX + 1, 14, CX + 11, 21, RED[1])
    rect(im, CX + 1, 14, CX + 11, 15, RED[2])
    rect(im, CX + 5, 16, CX + 7, 19, YEL[2])
    for (x, y, c) in ((9, 26, BLUE), (CX, 22, YEL), (35, 27, GREEN)):
        ellipse(im, x, y, 5, 6, c[1])
        ellipse(im, x - 2, y - 2, 1, 2, c[3])
        line(im, x, y + 6, CX, H - 6, GREY[2])
    return finish(im)


def friends():  # new friends: two people side by side
    im = canvas()
    for x, shirt, hair in ((14, BLUE, INK), (30, RED, WOOD[0])):
        rect(im, x - 5, 34, x + 5, 50, shirt[1])
        rect(im, x - 5, 34, x - 5, 50, shirt[2])
        rect(im, x - 4, 50, x - 1, 55, INK)
        rect(im, x + 1, 50, x + 4, 55, INK)
        ellipse(im, x, 26, 6, 7, SKIN[1])
        rect(im, x - 6, 19, x + 6, 23, hair)
        px(im, x - 2, 27, INK)
        px(im, x + 2, 27, INK)
        line(im, x - 1, 31, x + 1, 31, RED[1])
    rect(im, 19, 40, 25, 42, SKIN[1])  # linked arms
    ellipse(im, CX, 12, 3, 3, RED[2])  # little heart
    px(im, CX - 3, 10, RED[2]), px(im, CX + 3, 10, RED[2])
    return finish(im, 16)


def lighthouse():  # first trip to Nha Trang
    im = canvas()
    poly(im, [(16, H - 6), (28, H - 6), (25, 16), (19, 16)], WHITE)
    for y0, y1 in ((22, 28), (36, 42)):
        poly(im, [(19 + (y0 - 16) // 6, y0), (25 - (y0 - 16) // 6, y0), (25 - (y1 - 16) // 6, y1), (19 + (y1 - 16) // 6, y1)], RED[1])
    rect(im, 16, 12, 28, 16, INK)
    rect(im, 18, 6, 26, 12, YEL[2])
    rect(im, 20, 7, 24, 11, YEL[3])
    poly(im, [(17, 6), (27, 6), (22, 0)], RED[1])
    for x in range(8, 36, 4):  # waves
        px(im, x, H - 5, BLUE[3]), px(im, x + 1, H - 4, BLUE[2])
    return finish(im, 16)


def helmet():  # military training
    im = canvas()
    post(im, top=26)
    ellipse(im, CX, 20, 13, 9, GREEN[1])
    rect(im, CX - 13, 20, CX + 13, 27, GREEN[1])
    ellipse(im, CX - 4, 15, 5, 3, GREEN[2])
    rect(im, CX - 15, 26, CX + 15, 29, GREEN[0])
    for x, y in ((CX - 3, 19), (CX + 2, 21), (CX + 6, 18)):  # camo spots
        rect(im, x, y, x + 3, y + 1, GREEN[0])
    for dx, dy in ((0, -3), (-2, 0), (2, 0), (-1, 2), (1, 2)):  # little star
        px(im, CX + dx, 21 + dy, YEL[2])
    return finish(im, 16)


def tent():  # Mua he Xanh: green tent + non la
    im = canvas()
    poly(im, [(4, H - 5), (CX, 14), (W - 8, H - 5)], GREEN[1])
    poly(im, [(CX, 14), (W - 8, H - 5), (CX + 3, H - 5)], GREEN[0])
    poly(im, [(CX - 7, H - 5), (CX - 1, 28), (CX + 3, H - 5)], INK)
    line(im, CX, 14, CX, 8, GREY[2])
    poly(im, [(CX, 8), (CX + 8, 10), (CX, 12)], YEL[2])
    poly(im, [(32, H - 5), (38, 38), (43, H - 5)], YEL[3])  # conical hat
    line(im, 32, H - 5, 43, H - 5, YEL[0])
    return finish(im, 18)


# ---------------------------------------------------------------- year 2 -----
def bike():  # K23 kids: fallen motorbike
    b = new(40, 30)
    for cx in (9, 31):
        ellipse(b, cx, 21, 7, 7, INK)
        ellipse(b, cx, 21, 4, 4, GREY[2])
        ellipse(b, cx, 21, 1, 1, INK)
    poly(b, [(9, 21), (16, 11), (28, 11), (31, 21), (24, 18), (14, 18)], RED[1])
    rect(b, 15, 8, 25, 11, INK)
    rect(b, 27, 6, 33, 8, GREY[1])
    line(b, 31, 8, 31, 21, GREY[1])
    b = b.rotate(-32, expand=True, resample=Image.NEAREST)
    im = canvas()
    paste(im, b, max(0, (W - b.width) // 2), H - b.height - 3)
    px(im, 6, 14, YEL[2]), px(im, 38, 18, YEL[2])  # "oops" sparks
    return finish(im, 16)


def blossom():  # Xuan tinh nguyen: peach blossom with red envelopes
    im = canvas()
    rect(im, CX - 2, 30, CX + 2, H - 4, WOOD[0])
    line(im, CX, 34, CX - 10, 24, WOOD[0])
    line(im, CX, 32, CX + 10, 22, WOOD[0])
    for x, y, r in ((12, 20, 9), (CX, 14, 10), (32, 18, 9), (CX, 26, 8)):
        ellipse(im, x, y, r, r - 2, C("#f59ac0"))
        ellipse(im, x - 3, y - 3, r // 2, r // 3, C("#ffc9de"))
    for x, y in ((8, 30), (36, 31), (CX - 1, 36)):  # red envelopes
        rect(im, x, y, x + 4, y + 6, RED[1])
        rect(im, x + 1, y + 2, x + 3, y + 3, YEL[2])
        line(im, x + 2, y - 3, x + 2, y, YEL[1])
    return finish(im, 14)


def pine():  # Da Lat: pine tree + lantern
    im = canvas()
    rect(im, CX - 2, H - 12, CX + 2, H - 4, WOOD[0])
    for top, half, c in ((8, 8, GREEN[1]), (18, 12, GREEN[1]), (28, 16, GREEN[0])):
        poly(im, [(CX, top), (CX - half, top + 16), (CX + half, top + 16)], c)
        poly(im, [(CX, top), (CX - half, top + 16), (CX - half // 3, top + 16)], GREEN[2])
    rect(im, CX + 10, 26, CX + 14, 32, YEL[2])  # lantern
    rect(im, CX + 10, 25, CX + 14, 25, RED[1])
    rect(im, CX + 10, 32, CX + 14, 32, RED[1])
    line(im, CX + 12, 18, CX + 12, 25, GREY[1])
    return finish(im, 14)


def camera():  # Media: camera on a tripod
    im = canvas()
    line(im, CX, 34, 10, H - 4, GREY[1])
    line(im, CX, 34, 34, H - 4, GREY[1])
    line(im, CX, 34, CX, H - 4, GREY[0])
    rect(im, 8, 14, 36, 32, INK)
    rect(im, 8, 14, 36, 17, GREY[0])
    ellipse(im, 25, 24, 8, 8, GREY[0])
    ellipse(im, 25, 24, 6, 6, BLUE[0])
    ellipse(im, 25, 24, 3, 3, BLUE[2])
    px(im, 22, 21, WHITE)
    rect(im, 11, 18, 15, 20, RED[1])
    rect(im, 28, 10, 34, 13, GREY[2])  # flash
    return finish(im, 15)


def lamp_off():  # blackout night: dead street lamp + fireflies
    im = canvas()
    rect(im, CX - 1, 14, CX + 1, H - 4, GREY[0])
    rect(im, CX - 5, H - 7, CX + 5, H - 4, GREY[0])
    poly(im, [(CX - 8, 14), (CX + 8, 14), (CX + 5, 8), (CX - 5, 8)], GREY[1])
    rect(im, CX - 5, 14, CX + 5, 18, GREY[2])
    for x, y in ((8, 26), (34, 20), (30, 38), (11, 40), (38, 32)):  # fireflies
        px(im, x, y, YEL[3]), px(im, x + 1, y, YEL[1])
    ellipse(im, 36, 8, 3, 3, GREY[3])  # moon
    return finish(im, 12)


def board():  # LBD: blackboard
    im = canvas()
    line(im, 10, 42, 6, H - 4, WOOD[0])
    line(im, 34, 42, 38, H - 4, WOOD[0])
    rect(im, 4, 10, 40, 42, WOOD[1])
    rect(im, 4, 10, 40, 11, WOOD[2])
    rect(im, 7, 13, 37, 39, C("#24473c"))
    for i, (x0, x1) in enumerate(((10, 28), (10, 22), (10, 32))):
        line(im, x0, 19 + i * 6, x1, 19 + i * 6, C("#e9f0e6"))
    ellipse(im, 31, 30, 3, 3, C("#e9f0e6"))
    ellipse(im, 31, 30, 1, 1, C("#24473c"))
    rect(im, 8, 40, 14, 41, WHITE)  # chalk
    return finish(im, 15)


# ---------------------------------------------------------------- year 3 -----
def signposts():  # last Doan Hoi trip: direction signs
    im = canvas()
    post(im, top=8)
    poly(im, [(CX - 14, 12), (CX + 10, 12), (CX + 18, 17), (CX + 10, 22), (CX - 14, 22)], RED[1])
    poly(im, [(CX + 14, 26), (CX - 10, 26), (CX - 18, 31), (CX - 10, 36), (CX + 14, 36)], BLUE[1])
    line(im, CX - 10, 17, CX + 6, 17, WHITE)
    line(im, CX - 6, 31, CX + 10, 31, WHITE)
    return finish(im, 12)


def pillow():  # C24.07: the sleepy night
    im = canvas()
    poly(im, [(6, H - 8), (38, H - 8), (41, H - 20), (3, H - 20)], WHITE)
    poly(im, [(6, H - 8), (38, H - 8), (41, H - 20), (3, H - 20)], WHITE)
    rect(im, 3, H - 20, 41, H - 18, GREY[3])
    rect(im, 6, H - 10, 38, H - 8, GREY[2])
    for x in (3, 41):
        line(im, x, H - 20, x - 2 if x < 20 else x + 2, H - 8, GREY[2])
    line(im, 8, H - 14, 36, H - 14, BLUE[3])
    text(im, "2", 20, H - 38, BLUE[1])
    text(im, "2", 28, H - 46, BLUE[2])
    return finish(im, 18)


# ---------------------------------------------------------------- year 4 -----
def heart():  # last K22 trip
    im = canvas()
    post(im, top=28)
    for cx in (CX - 7, CX + 7):
        ellipse(im, cx, 14, 8, 8, RED[1])
    poly(im, [(CX - 15, 18), (CX + 15, 18), (CX, 34)], RED[1])
    ellipse(im, CX - 9, 11, 2, 2, RED[3])
    text(im, "K22", CX - 6, 17, WHITE)
    return finish(im, 12)


def gift():  # welcome party
    im = canvas()
    rect(im, 8, 36, 32, H - 4, RED[1])
    rect(im, 8, 36, 10, H - 4, RED[2])
    rect(im, 6, 32, 34, 37, RED[2])
    rect(im, 18, 32, 22, H - 4, YEL[2])
    poly(im, [(20, 32), (12, 24), (16, 22), (20, 30)], YEL[2])
    poly(im, [(20, 32), (28, 24), (24, 22), (20, 30)], YEL[2])
    for (x, y, c) in ((34, 16, BLUE), (40, 22, GREEN), (28, 10, YEL)):
        ellipse(im, x, y, 4, 5, c[1])
        ellipse(im, x - 1, y - 2, 1, 1, c[3])
        line(im, x, y + 5, 28, 34, GREY[2])
    for x, y in ((6, 14), (12, 8), (4, 24), (38, 36)):
        px(im, x, y, YEL[2]), px(im, x + 1, y + 1, RED[2])
    return finish(im, 16)


def cairn():  # trekking: stacked stones + backpack
    im = canvas()
    for x, y, rx, ry, c in ((14, H - 8, 11, 6, GREY[1]), (14, H - 17, 8, 5, GREY[2]), (14, H - 24, 5, 4, GREY[1])):
        ellipse(im, x, y, rx, ry, c)
        ellipse(im, x - 2, y - 2, rx // 2, ry // 2, GREY[3])
    rect(im, 26, H - 24, 40, H - 5, C("#e8782a"))
    rect(im, 26, H - 24, 28, H - 5, C("#f5a05a"))
    rect(im, 28, H - 16, 38, H - 11, C("#b85a1c"))
    ellipse(im, 33, H - 25, 6, 3, C("#e8782a"))
    line(im, 14, H - 28, 14, H - 36, GREY[0])  # trail flag
    poly(im, [(14, H - 36), (22, H - 33), (14, H - 30)], RED[1])
    return finish(im, 16)


def suitcase():  # travel with colleagues
    im = canvas()
    rect(im, 8, 24, 36, H - 6, C("#2bb5b0"))
    rect(im, 8, 24, 11, H - 6, C("#5fd9d4"))
    rect(im, 33, 24, 36, H - 6, C("#1c8581"))
    rect(im, 16, 18, 28, 24, GREY[1])
    rect(im, 18, 20, 26, 24, C("#2bb5b0"))
    for x in (14, 30):
        rect(im, x, 24, x + 1, H - 6, C("#1c8581"))
    poly(im, [(18, 34), (26, 40), (18, 44)], WHITE)  # plane sticker
    rect(im, 26, 44, 32, 48, RED[1])
    rect(im, 11, H - 6, 14, H - 3, INK), rect(im, 30, H - 6, 33, H - 3, INK)
    rect(im, 36, 26, 38, 36, YEL[2])  # tag
    return finish(im, 16)


def cake():  # moments with colleagues
    im = canvas()
    ellipse(im, CX, H - 6, 17, 3, GREY[3])
    rect(im, 8, 34, 36, H - 6, C("#f6b8c8"))
    rect(im, 8, 34, 11, H - 6, C("#ffd9e2"))
    rect(im, 12, 22, 32, 34, C("#fff3e0"))
    rect(im, 12, 22, 14, 34, WHITE)
    for x in range(8, 37, 4):  # drip frosting
        rect(im, x, 34, x + 1, 38 + (x % 3), WHITE)
    for x in (16, 22, 28):
        rect(im, x, 14, x + 1, 22, BLUE[2] if x == 22 else RED[1])
        px(im, x, 12, YEL[3]), px(im, x, 11, YEL[2]), px(im, x + 1, 12, YEL[1])
    for x, y in ((14, 43), (24, 46), (31, 42)):
        px(im, x, y, RED[1])
    return finish(im, 17)


def lotus():  # visiting Nhut's home in Dong Thap: a Mekong house under a coconut palm
    im = canvas()
    rect(im, 4, 32, 30, H - 4, C("#f4e3c0"))  # walls
    rect(im, 4, 32, 6, H - 4, C("#fff6e0"))
    rect(im, 28, 32, 30, H - 4, C("#d9c397"))
    poly(im, [(1, 33), (17, 16), (33, 33)], C("#c85a3a"))  # tiled roof
    poly(im, [(17, 16), (33, 33), (27, 33), (17, 22)], C("#9d3f26"))
    for y in (22, 27):
        line(im, 17 - (y - 16), y, 17 + (y - 16), y, C("#e07a52"))
    rect(im, 13, 40, 21, H - 4, WOOD[1])  # door
    rect(im, 13, 40, 14, H - 4, WOOD[2])
    px(im, 19, 48, YEL[2])
    rect(im, 6, 38, 10, 43, BLUE[2])  # window
    rect(im, 24, 38, 28, 43, BLUE[2])
    rect(im, 38, 22, 40, H - 4, WOOD[0])  # coconut palm trunk
    line(im, 39, 22, 30, 18, GREEN[1])
    line(im, 39, 22, 43, 15, GREEN[1])
    line(im, 39, 22, 33, 26, GREEN[0])
    line(im, 39, 22, 43, 26, GREEN[0])
    line(im, 39, 22, 36, 14, GREEN[2])
    ellipse(im, 38, 24, 2, 2, WOOD[0])
    return finish(im, 18)


def cap():  # FTU graduation: mortarboard on a post
    im = canvas()
    post(im, top=24)
    poly(im, [(CX - 17, 14), (CX, 6), (CX + 17, 14), (CX, 22)], INK)
    poly(im, [(CX - 17, 14), (CX, 22), (CX, 25), (CX - 17, 17)], GREY[0])
    poly(im, [(CX - 17, 14), (CX, 6), (CX, 9), (CX - 14, 14)], GREY[1])
    rect(im, CX - 7, 22, CX + 7, 28, INK)
    line(im, CX + 15, 14, CX + 15, 28, YEL[2])
    rect(im, CX + 13, 28, CX + 17, 32, YEL[1])
    px(im, CX, 14, YEL[2])
    return finish(im, 12)


def door():  # D1107
    im = canvas()
    rect(im, 8, 8, 36, H - 4, WOOD[0])
    rect(im, 10, 10, 34, H - 4, WOOD[1])
    rect(im, 10, 10, 11, H - 4, WOOD[2])
    for (x0, y0, x1, y1) in ((13, 13, 21, 25), (23, 13, 31, 25), (13, 29, 21, 46), (23, 29, 31, 46)):
        rect(im, x0, y0, x1, y1, WOOD[2])
        rect(im, x0 + 1, y0 + 1, x1 - 1, y1 - 1, WOOD[1])
    rect(im, 14, 2, 30, 8, YEL[1])  # number plate above the door
    rect(im, 14, 2, 30, 3, YEL[2])
    text(im, "1107", 14, 3, INK)
    px(im, 29, 5, INK)
    ellipse(im, 32, 36, 1, 1, YEL[2])  # knob
    return finish(im, 18)


MARKERS = {
    "f1": plane, "f3": balloons, "f7": friends, "f5": lighthouse, "f4": helmet, "f6": tent,
    "f8": bike, "f10": blossom, "f9": pine, "f23": camera,
    "f12": lamp_off, "f13": board, "f14": signposts, "f15": pillow, "f24": heart, "f25": gift,
    "f19": cairn, "f27": lotus, "f21": suitcase, "f20": cake, "f17": cap, "f26": door,
}

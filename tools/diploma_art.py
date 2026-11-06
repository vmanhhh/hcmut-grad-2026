"""The graduation diploma folder (hard cover, seen at a slight 3/4 angle) and the small copy the host holds.

Drawn like the real folder: red cover, a darker spine and edge thickness on the left/bottom, page block on the right,
a gold embossed emblem circle, a small gold line of text at the top and 'BẰNG CỬ NHÂN' near the bottom. The gold
lettering is baked with a tiny hand-made pixel font (with Vietnamese marks) so it stays sharp at every zoom.

Same conventions as pixart.py: 1x, RGBA, no anti-aliasing, light from the top-left, 1px darker-hue outline.
"""
import math

from pixart import C, ellipse, line, mix, new, outline, pad, poly, px, rect, shade

RED = [C("#7d1d14"), C("#a02a1f"), C("#c0392b"), C("#d9564a"), C("#ec7b6e")]
GOLD = [C("#8a5a12"), C("#c8901f"), C("#f0c040"), C("#ffe38a")]
PAGE = [C("#d9cdb0"), C("#f4ecd6"), C("#fffaf0")]

# 4x5 caps (3x5 for the small line); the marks are drawn above the letter by _mark()
F4 = {
    "A": ["0110", "1001", "1111", "1001", "1001"],
    "B": ["1110", "1001", "1110", "1001", "1110"],
    "C": ["0111", "1000", "1000", "1000", "0111"],
    "G": ["0111", "1000", "1011", "1001", "0111"],
    "H": ["1001", "1001", "1111", "1001", "1001"],
    "N": ["1001", "1101", "1011", "1001", "1001"],
    "U": ["1001", "1001", "1001", "1001", "0110"],
}
F3 = {
    "A": ["010", "101", "111", "101", "101"],
    "B": ["110", "101", "110", "101", "110"],
    "C": ["011", "100", "100", "100", "011"],
    "H": ["101", "101", "111", "101", "101"],
    "K": ["101", "110", "100", "110", "101"],
    "O": ["010", "101", "101", "101", "010"],
}
# accented char -> (base, marks)
ACC = {"Ằ": ("A", ["breve", "grave"]), "Ử": ("U", ["horn", "hook"]), "Â": ("A", ["circ"]), "Á": ("A", ["acute"])}


def _glyph(im, font, ch, x, y, col):
    base, marks = ACC.get(ch, (ch, []))
    rows = font[base]
    w = len(rows[0])
    for r, row in enumerate(rows):
        for c, bit in enumerate(row):
            if bit == "1":
                px(im, x + c, y + r, col)
    lvl = 1  # rows above the letter used so far
    horn = False
    for m in marks:
        if m == "circ":
            for dx, dy in ((0, -1), (w - 1, -1), (1, -2), (w - 2, -2)) if w > 3 else ((0, -1), (2, -1), (1, -2)):
                px(im, x + dx, y + dy, col)
            lvl = 3
        elif m == "breve":
            for dx, dy in ((0, -2), (w - 1, -2), (1, -1), (w - 2, -1)):
                px(im, x + dx, y + dy, col)
            lvl = 3
        elif m == "horn":
            px(im, x + w, y, col)
            horn = True
        elif m == "acute":
            px(im, x + w - 1, y - 1, col); px(im, x + w - 2, y - 2, col)
        elif m == "grave":
            px(im, x, y - lvl - 1, col)
        elif m == "hook":
            px(im, x + 1, y - 2, col); px(im, x + 2, y - 2, col); px(im, x + 2, y - 1, col)
    return w + (1 if horn else 0)


def _text(im, font, text, cx, y, col, shadow=None, gap=1, space=3):
    """Centered baked text; a 1px shadow (lower-right) makes it read as embossed."""
    ws = []
    for ch in text:
        if ch == " ":
            ws.append(space)
        else:
            base = ACC.get(ch, (ch, []))[0]
            ws.append(len(font[base][0]) + (1 if "horn" in ACC.get(ch, ("", []))[1] else 0))
    total = sum(w + gap for w in ws) - gap
    for pass_col, off in ((shadow, 1), (col, 0)):
        if pass_col is None:
            continue
        x = cx - total // 2
        for ch, w in zip(text, ws):
            if ch != " ":
                _glyph(im, font, ch, x + off, y + off, pass_col)
            x += w + gap


def _emblem(im, cx, cy, r):
    """Gold embossed round emblem: ring, inner disc, star and a little cog."""
    ellipse(im, cx + 1, cy + 1, r, r, RED[0])
    ellipse(im, cx, cy, r, r, GOLD[1])
    ellipse(im, cx, cy, r - 1, r - 1, GOLD[2])
    ellipse(im, cx, cy, r - 3, r - 3, RED[2])
    ellipse(im, cx, cy, r - 4, r - 4, RED[1])
    for a in range(0, 360, 30):  # beads on the rim
        px(im, cx + round(math.cos(math.radians(a)) * (r - 2)), cy + round(math.sin(math.radians(a)) * (r - 2)), GOLD[3])
    # star
    pts = []
    for i in range(10):
        rr = (r - 5) if i % 2 == 0 else (r - 5) * 0.45
        a = math.radians(-90 + i * 36)
        pts.append((cx + math.cos(a) * rr, cy + math.sin(a) * rr + 0.5))
    poly(im, pts, GOLD[2])
    px(im, cx - 1, cy - 1, GOLD[3])


def diploma_folder():
    """Standing hard-cover folder, slight 3/4 view. 80 x 96."""
    W, H = 80, 96
    im = new(W, H)
    # cover face: slightly skewed (right edge a little higher = turned a few degrees)
    A, B, Cc, D = (11, 8), (69, 3), (69, 84), (11, 90)
    # page block + bottom thickness (behind the cover)
    poly(im, [B, (73, 6), (73, 87), Cc], PAGE[1])
    for k in range(0, 80, 3):
        px(im, 70 + (k % 2), 5 + k, PAGE[0]); px(im, 71 + (k % 2), 6 + k, PAGE[0]) if k % 3 == 0 else None
    poly(im, [Cc, (73, 87), (73, 89), (13, 95), D], RED[0])
    poly(im, [D, Cc, (73, 87), (14, 93)], RED[1])
    # spine (left, darker, with a rounded highlight)
    poly(im, [(2, 12), A, D, (2, 95)], RED[1])
    poly(im, [(2, 12), (5, 11), (5, 94), (2, 95)], RED[0])
    for y in range(12, 92):
        px(im, 7, y + (90 - y) // 30, RED[2])
    # cover: gradient (lighter top-left) with a soft sheen
    for x in range(11, 70):
        t = (x - 11) / 58
        top = round(A[1] + (B[1] - A[1]) * t)
        bot = round(D[1] + (Cc[1] - D[1]) * t)
        for y in range(top, bot + 1):
            u = (y - top) / max(1, bot - top)
            col = mix(RED[3], RED[2], min(1.0, (t + u) * 1.1)) if t + u < 0.9 else mix(RED[2], RED[1], min(1.0, (t + u - 0.9) * 1.1))
            px(im, x, y, col)
    line(im, A[0], A[1], B[0], B[1], RED[4])
    line(im, A[0] + 1, A[1], A[0] + 1, D[1], RED[3])
    line(im, B[0], B[1], Cc[0], Cc[1], RED[0])
    line(im, D[0], D[1], Cc[0], Cc[1], RED[0])
    # embossed gold frame (thin inset) and content
    def inset(p0, p1, col):
        line(im, p0[0], p0[1], p1[0], p1[1], col)
    fa, fb, fc, fd = (16, 13), (64, 9), (64, 79), (16, 85)
    inset(fa, fb, GOLD[1]); inset(fb, fc, GOLD[0]); inset(fc, fd, GOLD[0]); inset(fd, fa, GOLD[1])
    cx = 40
    _text(im, F3, "BÁCH KHOA", cx, 20, GOLD[3], GOLD[0], space=2)
    _emblem(im, cx, 44, 12)
    _text(im, F4, "BẰNG CỬ NHÂN", cx, 66, GOLD[3], GOLD[0], space=2)
    line(im, 25, 76, 56, 74, GOLD[1])
    return outline(pad(im, 1, 1, 1, 1))


def diploma_mini():
    """The folder as held in front of the chest: 18 x 22, same look at a tiny size."""
    W, H = 18, 22
    im = new(W, H)
    poly(im, [(5, 1), (16, 0), (16, 19), (5, 20)], RED[2])
    poly(im, [(1, 2), (5, 1), (5, 20), (1, 21)], RED[0])
    rect(im, 2, 3, 2, 19, RED[1])
    line(im, 5, 1, 16, 0, RED[4]); line(im, 6, 1, 6, 19, RED[3])
    poly(im, [(5, 20), (16, 19), (17, 20), (6, 21)], RED[0])
    rect(im, 17, 1, 17, 19, PAGE[1])
    line(im, 7, 3, 14, 2, GOLD[2])
    ellipse(im, 11, 10, 3, 3, GOLD[2]); ellipse(im, 11, 10, 1, 1, RED[2]); px(im, 10, 9, GOLD[3])
    line(im, 7, 16, 14, 15, GOLD[2])
    return outline(pad(im, 1, 1, 1, 1))

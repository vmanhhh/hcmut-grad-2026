"""Tiny pixel-art toolkit shared by the town art generators (no external assets, PIL only).

Conventions: RGBA tuples, 1x scale, no anti-aliasing, light from the top-left, a 1px darker-hue outline
on objects (same trick as gen-host-sprite.py) so they sit well next to the host sprites.
"""
import math
import random

from PIL import Image, ImageDraw


def C(h, a=255):
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)


def new(w, h, fill=(0, 0, 0, 0)):
    return Image.new("RGBA", (w, h), fill)


def shade(c, f):
    return (max(0, min(255, int(c[0] * f))), max(0, min(255, int(c[1] * f))), max(0, min(255, int(c[2] * f))), c[3])


def mix(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(4))


def tint(c, toward, t):
    return mix(c, toward + (c[3],) if len(toward) == 3 else toward, t)


def rect(im, x0, y0, x1, y1, c):
    ImageDraw.Draw(im).rectangle([x0, y0, x1, y1], fill=c)


def px(im, x, y, c):
    if 0 <= x < im.width and 0 <= y < im.height:
        im.putpixel((int(x), int(y)), c)


def line(im, x0, y0, x1, y1, c):
    ImageDraw.Draw(im).line([x0, y0, x1, y1], fill=c)


def ellipse(im, cx, cy, rx, ry, c):
    ImageDraw.Draw(im).ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=c)


def poly(im, pts, c):
    ImageDraw.Draw(im).polygon(pts, fill=c)


def paste(dst, src, x, y):
    dst.alpha_composite(src, (int(x), int(y)))


def outline(im, dark=0.34, only_outer=True):
    """1px darker-hue outline around opaque pixels. Grows the canvas by nothing: keep 1px of padding."""
    w, h = im.size
    src = im.copy()
    sp = src.load()
    dp = im.load()
    for y in range(h):
        for x in range(w):
            if sp[x, y][3] > 0:
                continue
            best = None
            for dx, dy in ((0, -1), (-1, 0), (1, 0), (0, 1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and sp[nx, ny][3] > 200:
                    o = sp[nx, ny]
                    d = (int(o[0] * dark), int(o[1] * dark), min(255, int(o[2] * (dark + 0.08)) + 16), 255)
                    if best is None or sum(d[:3]) < sum(best[:3]):
                        best = d
            if best:
                dp[x, y] = best
    return im


def pad(im, l=1, t=1, r=1, b=1):
    o = new(im.width + l + r, im.height + t + b)
    o.alpha_composite(im, (l, t))
    return o


def shadow(im, cx, cy, rx, ry, a=70):
    layer = new(im.width, im.height)
    ImageDraw.Draw(layer).ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=(20, 24, 50, a))
    # shadow goes UNDER the object
    out = layer
    out.alpha_composite(im)
    return out


def blob(im, cx, cy, rx, ry, cols, rnd, speck=0.18):
    """Shaded leafy ball: cols = (dark, mid, light, highlight). Light from top-left, leaf speckle."""
    w, h = im.size
    mask = new(w, h)
    ImageDraw.Draw(mask).ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=(255, 255, 255, 255))
    layer = new(w, h)
    d = ImageDraw.Draw(layer)
    d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=cols[0])
    d.ellipse([cx - rx - 1, cy - ry - 1, cx + rx - 3, cy + ry - 3], fill=cols[1])
    d.ellipse([cx - rx * 0.7 - 1, cy - ry * 0.75 - 1, cx + rx * 0.35, cy + ry * 0.3], fill=cols[2])
    d.ellipse([cx - rx * 0.55, cy - ry * 0.65, cx - rx * 0.05, cy - ry * 0.1], fill=cols[3])
    lp = layer.load()
    mp = mask.load()
    n = int(rx * ry * speck)
    for _ in range(n):
        x = int(cx + rnd.uniform(-rx, rx))
        y = int(cy + rnd.uniform(-ry, ry))
        if 0 <= x < w - 1 and 0 <= y < h - 1 and mp[x, y][3]:
            col = cols[0] if (x - cx) + (y - cy) > 0 and rnd.random() < 0.6 else cols[2]
            lp[x, y] = col
            if rnd.random() < 0.5 and mp[x + 1, y][3]:
                lp[x + 1, y] = col
    clip = new(w, h)
    clip.paste(layer, (0, 0), mask)
    im.alpha_composite(clip)


def noise_fill(im, box, base, rnd, vary=8, speck=None):
    x0, y0, x1, y1 = box
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            f = 1 + rnd.uniform(-vary, vary) / 100
            px(im, x, y, shade(base, f))


def sheet_grid(images, cols, cell, bg=(90, 150, 90, 255), scale=3, labels=None):
    rows = (len(images) + cols - 1) // cols
    cw, ch = cell
    out = Image.new("RGBA", (cols * (cw * scale + 6), rows * (ch * scale + 6)), bg)
    for i, im in enumerate(images):
        x = (i % cols) * (cw * scale + 6) + 3
        y = (i // cols) * (ch * scale + 6) + 3
        big = im.resize((im.width * scale, im.height * scale), Image.NEAREST)
        out.alpha_composite(big, (x, y))
    return out

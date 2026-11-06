#!/usr/bin/env python3
"""Builds the four year galleries from the host's photo folder.

Reads files named "<year 1-4> <event name>[ (n)].<ext>", groups them by (year, event), converts HEIC/JPG/PNG to
resized WebP (EXIF + GPS stripped, rotation applied), drops near-duplicate photos inside an event (the same
shot saved as HEIC and JPG), compresses videos, and writes content/galleries.json.

Usage: python tools/build-galleries.py [SRC_DIR]      (default: ~/Downloads)
Needs: pip install pillow pillow-heif imageio-ffmpeg
"""
import json, os, re, subprocess, sys, unicodedata
from collections import OrderedDict
from pathlib import Path

import imageio_ffmpeg
import pillow_heif
from PIL import Image, ImageOps

pillow_heif.register_heif_opener()
ROOT = Path(__file__).resolve().parent.parent
SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.home() / "Downloads"
OUT = ROOT / "public" / "memories"
MAXSIDE = 1280
FIX = {"cũng": "cùng", "tiene": "tiên", "Nhaauuuu": "Nhậu"}  # typos in the file names -> display titles
# Full-title overrides after FIX (host-preferred wording)
TITLES = {
    "Lần đầu ghé nhà bạn Nhựt Trần": "Nhà Trung Nhựt · Đồng Tháp",
    "Bạn cấp 2 3 mời tốt nghiệp": "Bạn học mời tốt nghiệp",
}

PLACES = {
    1: ("gate", "Năm nhất · Cổng trường", "Những ngày đầu tiên ở Bách khoa."),
    2: ("building", "Năm hai · Trước tòa nhà chính", "Hoạt động, đoàn hội, bạn bè mới."),
    3: ("hall", "Năm ba · Trong tòa nhà", "Năm của những chặng đường dài."),
    4: ("stage", "Năm tư · Trước hội trường", "Một chặng nữa là tới ngày nhận bằng."),
}
IMG = {".jpg", ".jpeg", ".png", ".heic"}
VID = {".mp4", ".mov"}


def parse(name):
    stem = Path(name).stem
    m = re.match(r"^([1-4])\s+(.*)$", stem)
    if not m:
        return None
    title = re.sub(r"\s*\(\d+\)\s*$", "", m.group(2)).strip()
    for a, b in FIX.items():
        title = title.replace(a, b)
    title = title[0].upper() + title[1:]
    title = TITLES.get(title, title)
    return int(m.group(1)), title


def slug(s):
    s = unicodedata.normalize("NFD", s.replace("đ", "d").replace("Đ", "D"))
    s = "".join(c for c in s if unicodedata.category(c) != "Mn").lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")[:40]


def load_upright(path):
    """Opens a photo with its rotation applied. pillow-heif leaves the EXIF orientation of iPhone HEICs
    (selfies are often 4/5/6) unapplied, so read it from the raw HEIF metadata and apply it ourselves."""
    if path.suffix.lower() == ".heic":
        raw = pillow_heif.open_heif(str(path), apply_transformations=False).info.get("exif") or b""
        ex = Image.Exif()
        try:
            ex.load(raw if raw[:4] == b"Exif" else raw[4 + int.from_bytes(raw[:4], "big"):])
        except Exception:
            ex = Image.Exif()
        im = Image.open(path)
        o = im.info.get("original_orientation") or ex.get(0x0112)
        if o in (2, 4, 5, 7):  # libheif already applies the irot rotations (3, 6, 8); only the mirrored ones stay
            ops = {2: Image.FLIP_LEFT_RIGHT, 3: Image.ROTATE_180, 4: Image.FLIP_TOP_BOTTOM, 5: Image.TRANSPOSE, 6: Image.ROTATE_270, 7: Image.TRANSVERSE, 8: Image.ROTATE_90}
            im = im.transpose(ops[o])
        return im.convert("RGB")
    return ImageOps.exif_transpose(Image.open(path)).convert("RGB")


def ahash(im):
    g = im.convert("L").resize((16, 16), Image.BILINEAR)
    px = list(g.getdata())
    avg = sum(px) / len(px)
    return sum((1 << i) for i, p in enumerate(px) if p > avg)


def taken(path):
    try:
        ex = Image.open(path).getexif()
        d = ex.get_ifd(0x8769).get(0x9003) or ex.get(0x0132)
        return str(d) if d else None
    except Exception:
        return None


files = sorted(p for p in SRC.iterdir() if p.is_file() and p.suffix.lower() in IMG | VID and parse(p.name))
events = OrderedDict()
for i, p in enumerate(files):
    y, t = parse(p.name)
    events.setdefault((y, t), []).append(p)
for k in events:
    events[k].sort(key=lambda p: p.name)

OUT.mkdir(parents=True, exist_ok=True)
for old in OUT.glob("y*/*"):
    old.unlink()
ff = imageio_ffmpeg.get_ffmpeg_exe()
galleries = {y: {"year": y, "place": PLACES[y][0], "title": PLACES[y][1], "subtitle": PLACES[y][2], "events": []} for y in PLACES}
skipped = []
for (y, t), paths in events.items():
    d = OUT / f"y{y}"
    d.mkdir(exist_ok=True)
    items, hashes, dates = [], [], []
    for p in paths:
        base = f"{slug(t)}-{len(items) + 1}"
        if p.suffix.lower() in VID:
            mp4, poster = d / f"{base}.mp4", d / f"{base}.webp"
            subprocess.run([ff, "-y", "-loglevel", "error", "-i", str(p), "-t", "20", "-an", "-vf", "scale='min(540,iw)':-2", "-c:v", "libx264", "-crf", "30", "-preset", "slow", "-movflags", "+faststart", str(mp4)], check=True)
            subprocess.run([ff, "-y", "-loglevel", "error", "-i", str(mp4), "-vframes", "1", "-ss", "0.5", str(d / f"{base}.png")], check=True)
            im = Image.open(d / f"{base}.png").convert("RGB")
            im.save(poster, "WEBP", quality=74, method=6)
            (d / f"{base}.png").unlink()
            items.append({"kind": "video", "src": f"/memories/y{y}/{base}.mp4", "poster": f"/memories/y{y}/{base}.webp", "w": im.width, "h": im.height})
            continue
        dt = taken(p)
        im = load_upright(p)
        h = ahash(im)
        if any(bin(h ^ o).count("1") <= 14 for o in hashes):
            skipped.append(p.name)
            continue
        hashes.append(h)
        if dt:
            dates.append(dt)
        im.thumbnail((MAXSIDE, MAXSIDE), Image.LANCZOS)
        fn = d / f"{base}.webp"
        im.save(fn, "WEBP", quality=76, method=6)  # no exif argument: metadata is dropped
        items.append({"kind": "image", "src": f"/memories/y{y}/{base}.webp", "w": im.width, "h": im.height})
    galleries[y]["events"].append({"id": f"y{y}-{slug(t)}", "title": t, "date": min(dates) if dates else "", "items": items})

for g in galleries.values():
    g["events"].sort(key=lambda e: e["date"] or "9999")  # stable: undated events keep the filename order at the end
    for e in g["events"]:
        e.pop("date")
(ROOT / "content" / "galleries.json").write_text(json.dumps(list(galleries.values()), ensure_ascii=False, indent=2), encoding="utf-8")
tot = sum(sum(len(e["items"]) for e in g["events"]) for g in galleries.values())
size = sum(f.stat().st_size for f in OUT.glob("y*/*")) / 1e6
print(f"{tot} items in {sum(len(g['events']) for g in galleries.values())} events, {size:.1f} MB; duplicates dropped: {skipped}")

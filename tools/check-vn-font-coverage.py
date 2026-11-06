#!/usr/bin/env python3
"""
Objective check that every font the app ships contains EVERY Vietnamese glyph, so the browser never falls back to a
different-looking font for a single letter (e.g. Ư).

next/font splits each Google font into unicode-range subsets (latin, latin-ext, vietnamese), so the glyphs of one family are
the UNION of its woff2 files in .next/static/media (run `pnpm build` or `pnpm dev` first). Usage:
    python tools/check-vn-font-coverage.py [dir-with-font-files]
Exit code 1 when any family is missing a glyph. Needs: pip install fonttools brotli
"""
import glob
import os
import sys
from collections import defaultdict

from fontTools.ttLib import TTFont

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, ".next", "static", "media")

# precomposed Vietnamese letters: Latin-1/Latin Extended-A/B pieces used by Vietnamese + the whole U+1EA0..U+1EF9 block
NEED = set()
for cp in (0x00C0, 0x00C1, 0x00C2, 0x00C3, 0x00C8, 0x00C9, 0x00CA, 0x00CC, 0x00CD, 0x00D2, 0x00D3, 0x00D4, 0x00D5, 0x00D9, 0x00DA, 0x00DD,
           0x00E0, 0x00E1, 0x00E2, 0x00E3, 0x00E8, 0x00E9, 0x00EA, 0x00EC, 0x00ED, 0x00F2, 0x00F3, 0x00F4, 0x00F5, 0x00F9, 0x00FA, 0x00FD,
           0x0102, 0x0103, 0x0110, 0x0111, 0x0128, 0x0129, 0x0168, 0x0169, 0x01A0, 0x01A1, 0x01AF, 0x01B0):
    NEED.add(cp)
NEED |= set(range(0x1EA0, 0x1EFA))
COMBINING = {0x0300, 0x0301, 0x0303, 0x0309, 0x0323}  # grave, acute, tilde, hook above, dot below
EXTRA = {ord(c) for c in "—·…“”‘’!?.,:;-"}


def family(f):
    name = f["name"].getDebugName(16) or f["name"].getDebugName(1) or "?"
    return name.replace(" Light", "").replace(" Regular", "")


def main():
    fams = defaultdict(set)
    for path in glob.glob(os.path.join(SRC, "*.woff2")) + glob.glob(os.path.join(SRC, "*.ttf")):
        try:
            f = TTFont(path)
        except Exception as e:  # noqa: BLE001
            print("skip", path, e)
            continue
        fams[family(f)] |= set(f.getBestCmap())
    bad = False
    for fam, cm in sorted(fams.items()):
        miss = sorted(NEED - cm)
        miss_comb = sorted(COMBINING - cm)
        miss_extra = sorted(EXTRA - cm)
        ok = not miss and not miss_extra
        print(f"{fam:20s} {'OK ' if ok else 'FAIL'} precomposed missing: {len(miss)}/{len(NEED)}  combining missing: {[hex(c) for c in miss_comb]}  punctuation missing: {''.join(map(chr, miss_extra))}")
        if miss:
            print("    missing:", "".join(chr(c) for c in miss[:60]))
        bad |= not ok
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()

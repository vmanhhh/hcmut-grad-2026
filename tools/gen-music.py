#!/usr/bin/env python3
"""Generates the two extra chiptune loops (placeholders like loop.wav): hall.wav (calm, inside the building)
and grad.wav (bright, graduation hall + letter). Usage: python tools/gen-music.py"""
import math, os, random, struct, wave

SR = 11025
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "game", "audio")
NOTE = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def hz(n, octave):
    semis = NOTE[n[0]] + (1 if n.endswith("#") else 0) - (1 if n.endswith("b") else 0) + 12 * (octave - 4) - 9
    return 440.0 * 2 ** (semis / 12)


def osc(kind, f, t):
    ph = (f * t) % 1.0
    if kind == "saw":
        return 2 * ph - 1
    if kind == "noise":
        return random.uniform(-1, 1)
    if kind == "tri":
        return 4 * abs(ph - 0.5) - 1
    if kind == "sq":
        return 1.0 if ph < 0.5 else -1.0
    if kind == "pulse":
        return 1.0 if ph < 0.25 else -1.0
    return math.sin(2 * math.pi * ph)


def render(tracks, bpm, bars, path):
    beat = 60.0 / bpm
    total = int(SR * beat * 4 * bars)
    buf = [0.0] * total
    for kind, vol, events in tracks:  # events: (start_beat, dur_beats, freq)
        for sb, db, f in events:
            s0, n = int(sb * beat * SR), int(db * beat * SR)
            for i in range(n):
                if s0 + i >= total:
                    break
                t = i / SR
                env = min(1.0, i / (SR * 0.008)) * max(0.0, 1.0 - i / n) ** 0.6
                buf[s0 + i] += osc(kind, f, t) * vol * env
    peak = max(1e-9, max(abs(x) for x in buf))
    with wave.open(path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(1); w.setframerate(SR)
        w.writeframes(b"".join(struct.pack("B", int(128 + max(-1, min(1, x / peak * 0.8)) * 120)) for x in buf))


def prog(chords, arp, bass_oct, lead, lead_kind, bpm, bars, path, arp_kind="tri", lead_vol=0.28):
    """chords: list of (root, [triad notes]) one per bar; arp: pattern of chord-tone indices per beat-half."""
    arps, basses, leads = [], [], []
    for bar in range(bars):
        root, tones = chords[bar % len(chords)]
        b0 = bar * 4
        for k in range(8):
            n = tones[arp[k % len(arp)] % len(tones)]
            arps.append((b0 + k * 0.5, 0.5, hz(n, 4 + (arp[k % len(arp)] // len(tones)))))
        basses.append((b0, 2, hz(root, bass_oct)))
        basses.append((b0 + 2, 2, hz(root, bass_oct)))
    for bar in range(bars):
        row = lead[bar % len(lead)]
        for sb, db, n, o in row:
            if n:
                leads.append((bar * 4 + sb, db, hz(n, o)))
    render([(arp_kind, 0.22, arps), ("tri", 0.34, basses), (lead_kind, lead_vol, leads)], bpm, bars, path)


os.makedirs(OUT, exist_ok=True)

# hall: slow, soft, A minor -> F -> C -> G, gentle triangle melody
hall_chords = [("A", ["A", "C", "E"]), ("F", ["F", "A", "C"]), ("C", ["C", "E", "G"]), ("G", ["G", "B", "D"])]
hall_lead = [
    [(0, 1.5, "E", 5), (1.5, 0.5, "D", 5), (2, 2, "C", 5)],
    [(0, 1.5, "C", 5), (1.5, 0.5, "A", 4), (2, 2, "F", 5)],
    [(0, 1, "E", 5), (1, 1, "G", 5), (2, 2, "E", 5)],
    [(0, 1.5, "D", 5), (1.5, 0.5, "B", 4), (2, 2, "G", 4)],
]
prog(hall_chords, [0, 1, 2, 1], 2, hall_lead, "tri", 78, 8, os.path.join(OUT, "hall.wav"), lead_vol=0.26)

# grad: epic march in D minor -> major lift: sustained saw pads, timpani + snare, brassy square fanfare
random.seed(7)
EP = [("D", ["D", "F", "A"]), ("Bb", ["Bb", "D", "F"]), ("F", ["F", "A", "C"]), ("C", ["C", "E", "G"]),
      ("D", ["D", "F", "A"]), ("Bb", ["Bb", "D", "F"]), ("C", ["C", "E", "G"]), ("A", ["A", "C#", "E"])]
# lead: (start_beat, dur_beats, note, octave) per bar; rising heroic motif, then the same a step higher
EP_LEAD = [
    [(0, 1.5, "D", 5), (1.5, 0.5, "F", 5), (2, 2, "A", 5)],
    [(0, 1.5, "Bb", 5), (1.5, 0.5, "A", 5), (2, 2, "F", 5)],
    [(0, 1, "F", 5), (1, 1, "A", 5), (2, 2, "C", 6)],
    [(0, 2, "E", 6), (2, 1, "D", 6), (3, 1, "C", 6)],
    [(0, 1.5, "D", 6), (1.5, 0.5, "A", 5), (2, 2, "F", 6)],
    [(0, 1.5, "D", 6), (1.5, 0.5, "F", 6), (2, 2, "D", 6)],
    [(0, 1, "G", 5), (1, 1, "C", 6), (2, 2, "E", 6)],
    [(0, 2, "A", 5), (2, 2, "C#", 6)],
]
bpm, bars = 92, 16
beat = 60.0 / bpm
pad, bass, arp, lead, kick, snare = [], [], [], [], [], []
for bar in range(bars):
    root, tones = EP[bar % 8]
    b0 = bar * 4
    for n in tones:
        pad.append((b0, 4, hz(n, 3)))
    for k in range(8):
        bass.append((b0 + k * 0.5, 0.45, hz(root, 2 if k % 2 == 0 else 3)))
        arp.append((b0 + k * 0.5, 0.4, hz(tones[(0, 1, 2, 1)[k % 4]], 4)))
    for sb, db, n, o in EP_LEAD[bar % 8]:
        lead.append((b0 + sb, db, hz(n, o + (1 if bar >= 8 and o < 6 and False else 0))))
    for sb in (0, 2):
        kick.append((b0 + sb, 0.6, 52.0))
    kick.append((b0 + 3.5, 0.3, 52.0))
    for sb in (1, 3):
        snare.append((b0 + sb, 0.22, 1.0))
    if bar >= 8:  # second half: add a high octave doubling for a bigger sound
        for sb, db, n, o in EP_LEAD[bar % 8]:
            lead.append((b0 + sb, db, hz(n, o - 1)))
render(
    [("saw", 0.10, pad), ("tri", 0.30, bass), ("pulse", 0.10, arp), ("sq", 0.20, lead), ("sine", 0.7, kick), ("noise", 0.22, snare)],
    bpm, bars, os.path.join(OUT, "grad.wav"),
)

# applause: ~5 s of overlapping hand-claps (short noise pops) that swell, hold and fade
random.seed(11)
dur = 5.0
n = int(SR * dur)
buf = [0.0] * n
for _ in range(int(dur * 70)):
    t0 = random.random() * dur
    swell = min(1.0, t0 / 0.8) * (1.0 if t0 < dur - 1.5 else max(0.0, (dur - t0) / 1.5))
    amp = random.uniform(0.3, 1.0) * swell
    s0 = int(t0 * SR)
    length = int(SR * random.uniform(0.012, 0.03))
    for i in range(length):
        if s0 + i < n:
            buf[s0 + i] += random.uniform(-1, 1) * amp * (1 - i / length) ** 2
peak = max(1e-9, max(abs(x) for x in buf))
with wave.open(os.path.join(OUT, "applause.wav"), "wb") as w:
    w.setnchannels(1); w.setsampwidth(1); w.setframerate(SR)
    w.writeframes(b"".join(struct.pack("B", int(128 + max(-1, min(1, x / peak)) * 120)) for x in buf))
print("hall.wav, grad.wav, applause.wav written")

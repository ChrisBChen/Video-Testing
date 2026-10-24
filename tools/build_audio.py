#!/usr/bin/env python3
"""
Builds the complete soundtrack for the episode, fully reproducibly:
  * narration  - Piper neural TTS (voice configurable), placed per src/data/script.json
  * captions   - word timings written to src/data/captions.json (frames)
  * sfx        - synthesised procedurally (numpy), cues listed in script.json
  * music      - original chiptune score synthesised procedurally, ducked under the voice
Output: public/audio/mix.wav (44.1 kHz stereo, loudness-normalised with ffmpeg).

Env: PIPER_PY (python with piper-tts), PIPER_MODEL (path to .onnx voice).
"""
import json, os, subprocess, sys, wave, re, tempfile
import numpy as np

SR = 44100
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
script = json.load(open(f"{ROOT}/src/data/script.json"))
timeline = json.load(open(f"{ROOT}/src/data/timeline.json"))
FPS = timeline["fps"]
TOTAL = timeline["totalFrames"] / FPS
N = int(TOTAL * SR)
CACHE = f"{ROOT}/audio_cache"
os.makedirs(CACHE, exist_ok=True)
rng = np.random.default_rng(1234)

# ----------------------------------------------------------------------------- helpers
def t_arr(d): return np.arange(int(d * SR)) / SR
def env_exp(n, tau): return np.exp(-np.arange(n) / (tau * SR))
def fade(x, a=0.003, b=0.01):
    x = x.copy(); na, nb = int(a * SR), int(b * SR)
    if na: x[:na] *= np.linspace(0, 1, na)
    if nb: x[-nb:] *= np.linspace(1, 0, nb)
    return x
def noise(d): return rng.uniform(-1, 1, int(d * SR))
def fft_filter(x, lo=None, hi=None):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    g = np.ones_like(f)
    if lo: g *= 1 / (1 + (lo / np.maximum(f, 1)) ** 4)
    if hi: g *= 1 / (1 + (f / hi) ** 4)
    return np.fft.irfft(X * g, len(x))
def sweep_noise(d, f0, f1, q=2.0):
    """Band-limited noise whose centre frequency glides f0->f1 (done in blocks)."""
    n = int(d * SR); out = np.zeros(n); blocks = 24; bl = n // blocks
    for i in range(blocks):
        fc = f0 * (f1 / f0) ** (i / max(1, blocks - 1))
        seg = noise(bl / SR + 0.002)[: bl]
        seg = fft_filter(seg, lo=fc / q, hi=fc * q)
        out[i * bl:(i + 1) * bl] = seg
    return out
def osc(freq, kind="sine", duty=0.5):
    ph = np.cumsum(freq) / SR if np.ndim(freq) else None
    if ph is None: raise ValueError
    if kind == "sine": return np.sin(2 * np.pi * ph)
    if kind == "square": return np.where((ph % 1) < duty, 1.0, -1.0)
    if kind == "saw": return 2 * (ph % 1) - 1
    if kind == "tri": return 2 * np.abs(2 * (ph % 1) - 1) - 1
def glide(f0, f1, d, curve=1.0):
    u = np.linspace(0, 1, int(d * SR)) ** curve
    return f0 * (f1 / f0) ** u

# ----------------------------------------------------------------------------- sfx
def sfx(kind):
    if kind == "slam":
        n = int(0.4 * SR); kick = np.sin(2 * np.pi * np.cumsum(glide(160, 38, 0.4)) / SR) * env_exp(n, 0.12)
        click = fft_filter(noise(0.4), lo=1500) * env_exp(n, 0.012)
        return 0.9 * kick + 0.5 * click
    if kind == "zap":
        d = 0.28; f = glide(2400, 180, d, 0.6); return 0.35 * osc(f, "saw") * env_exp(len(f), 0.12)
    if kind == "whoosh":
        d = 0.7; x = sweep_noise(d, 500, 2600); e = np.sin(np.linspace(0, np.pi, len(x))) ** 2; return 0.9 * x * e
    if kind == "swoosh":
        d = 0.32; x = sweep_noise(d, 3000, 600); e = np.sin(np.linspace(0, np.pi, len(x))) ** 1.5; return 0.9 * x * e
    if kind == "boing":
        d = 0.45; tt = t_arr(d); f = 330 * np.exp(-tt * 2.2) + 140 + 40 * np.sin(2 * np.pi * 14 * tt) * np.exp(-tt * 5)
        return 0.6 * np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(len(tt), 0.18)
    if kind == "crash":
        d = 0.9; n = int(d * SR); x = fft_filter(noise(d), lo=1800) * env_exp(n, 0.16)
        for _ in range(9):
            a = int(rng.uniform(0, 0.25) * SR); L = int(0.06 * SR)
            x[a:a + L] += fft_filter(noise(0.06), lo=3000)[:L] * rng.uniform(0.4, 1) * env_exp(L, 0.015)
        return 0.9 * x
    if kind == "grind":
        d = 0.9; n = int(d * SR); x = fft_filter(noise(d), hi=1200, lo=150); m = 0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 26 * t_arr(d)))
        e = np.sin(np.linspace(0, np.pi, n)); return 0.8 * x * m * e
    if kind == "ding":
        d = 0.5; tt = t_arr(d); return 0.45 * (np.sin(2 * np.pi * 1319 * tt) + 0.5 * np.sin(2 * np.pi * 1976 * tt)) * np.exp(-tt * 9)
    if kind == "click":
        d = 0.25; tt = t_arr(d); return 0.7 * (np.sin(2 * np.pi * 1100 * tt) * np.exp(-tt * 90) + fft_filter(noise(d), lo=2500) * np.exp(-tt * 120))
    if kind == "slide":
        d = 1.1; x = sweep_noise(d, 350, 2200, 1.6); e = np.sin(np.linspace(0, np.pi, len(x))) ** 1.2
        trem = 0.8 + 0.2 * np.sin(2 * np.pi * 7 * t_arr(d)); return 0.8 * x * e * trem
    if kind == "spin":
        d = 1.2; f = glide(180, 1100, d, 1.6); w = osc(f, "saw"); vib = 0.75 + 0.25 * np.sin(2 * np.pi * 22 * t_arr(d))
        e = np.sin(np.linspace(0, np.pi, len(f))) ** 0.8; return 0.28 * fft_filter(w, hi=3500) * vib * e
    if kind == "thud":
        d = 0.35; n = int(d * SR); return 0.9 * np.sin(2 * np.pi * np.cumsum(glide(120, 45, d)) / SR) * env_exp(n, 0.09) + 0.4 * fft_filter(noise(d), hi=500) * env_exp(n, 0.04)
    if kind == "pigeon":
        d = 1.2; n = int(d * SR); x = np.zeros(n)
        for k in range(14):
            a = int(k * 0.085 * SR); L = int(0.07 * SR)
            if a + L < n: x[a:a + L] += fft_filter(noise(0.07), lo=300, hi=2500)[:L] * np.hanning(L) * (0.5 + 0.5 * np.sin(k / 14 * np.pi))
        return 0.7 * x
    if kind == "horn":
        d = 0.5; f1 = np.full(int(d * SR), 349.0); f2 = np.full(int(d * SR), 440.0)
        w = osc(f1, "square", 0.45) + osc(f2, "square", 0.45); e = np.minimum(1, np.arange(len(w)) / (0.02 * SR)) * np.exp(-np.arange(len(w)) / (0.5 * SR))
        return 0.18 * fft_filter(w, hi=2500) * e
    if kind == "plop":
        d = 0.18; f = glide(620, 170, d); return 0.65 * np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(len(f), 0.05)
    if kind == "unscrew":
        d = 0.6; n = int(d * SR); tt = t_arr(d); f = glide(900, 2200, d)
        whine = 0.18 * np.sin(2 * np.pi * np.cumsum(f) / SR) * (0.6 + 0.4 * np.sin(2 * np.pi * 18 * tt))
        ratchet = np.zeros(n)
        for k in range(int(d * 22)):
            a = int(k / 22 * SR); L = int(0.01 * SR); ratchet[a:a + L] += fft_filter(noise(0.01), lo=2000)[:L] * 0.6
        return (whine + ratchet) * np.sin(np.linspace(0, np.pi, n)) ** 0.5
    if kind == "pop":
        d = 0.15; f = glide(900, 250, d); return 0.6 * np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(len(f), 0.03)
    if kind == "tick":
        d = 0.12; tt = t_arr(d); return 0.55 * np.sin(2 * np.pi * 1400 * tt) * np.exp(-tt * 55)
    if kind == "wham":
        d = 1.4; n = int(d * SR)
        boom = np.sin(2 * np.pi * np.cumsum(glide(140, 32, d, 0.5)) / SR) * env_exp(n, 0.35)
        burst = fft_filter(noise(d), hi=7000) * env_exp(n, 0.07)
        crash = fft_filter(noise(d), lo=1500) * env_exp(n, 0.3)
        return 1.0 * boom + 0.8 * burst + 0.5 * crash
    if kind == "oof":
        d = 0.35; f = glide(210, 95, d); return 0.5 * fft_filter(osc(f, "saw"), hi=900) * env_exp(len(f), 0.15)
    if kind == "gasp":
        d = 0.4; x = sweep_noise(d, 1200, 2600, 1.8); e = np.sin(np.linspace(0, np.pi, len(x))) ** 2; return 0.5 * x * e
    raise KeyError(kind)

# ----------------------------------------------------------------------------- narration
def synth_line(line):
    key = re.sub(r"\W+", "_", line["text"])[:40] + f"_{script['voice']}_{script['lengthScale']}"
    wav = f"{CACHE}/{key}.wav"
    if not os.path.exists(wav):
        py = os.environ.get("PIPER_PY", sys.executable)
        model = os.environ.get("PIPER_MODEL", f"{ROOT}/audio_cache/{script['voice']}.onnx")
        subprocess.run([py, "-m", "piper", "-m", model, "--length-scale", str(script["lengthScale"]), "-f", wav],
                       input=line["text"].encode(), check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", wav, "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, dtype=np.float32).astype(np.float64)
    nz = np.where(np.abs(x) > 0.02 * np.max(np.abs(x)))[0]
    return x[nz[0]: nz[-1] + 1]  # trim silence at both ends

voice = np.zeros(N)
cap_chunks = []
prev_end = 0
for line in script["lines"]:
    x = synth_line(line)
    x = x / np.max(np.abs(x)) * 0.85
    a = int(line["at"] * SR)
    voice[a:a + len(x)] += x[: N - a]
    dur = len(x) / SR
    if line["at"] < prev_end: print(f"WARNING: {line['id']} overlaps previous line by {prev_end - line['at']:.2f}s")
    prev_end = line["at"] + dur
    print(f"{line['id']}: {line['at']:.2f}s -> {prev_end:.2f}s ({dur:.2f}s)")
    # ---- caption timing. Words are weighted by length (+ a beat after punctuation); measured pauses in the
    # speech are matched to the punctuation breaks by a small DP, which pins phrase boundaries to the audio.
    words = line["text"].split()
    clean = lambda w: len(re.sub(r"\W", "", w))
    brk = [i for i, w in enumerate(words[:-1]) if re.search(r"[.,:?!]$", w)]
    wts = []
    for w in words:
        wt = clean(w) + 1.5
        if w.endswith("..."): wt += 4
        elif re.search(r"[.?!]$", w): wt += 3
        elif re.search(r"[,:]$", w): wt += 2
        wts.append(wt)
    cum = np.concatenate([[0], np.cumsum(wts)]); tot = cum[-1]
    est_break = [dur * (cum[i + 1] - (wts[i] - clean(words[i]) - 1.5) * 0.5) / tot for i in brk]   # est. time speech pauses
    env = np.convolve(np.abs(x), np.ones(int(0.015 * SR)) / int(0.015 * SR), mode="same")
    quiet = env < 0.03 * env.max()
    pz, i_, n_ = [], 0, len(quiet)
    while i_ < n_:
        if quiet[i_]:
            j_ = i_
            while j_ < n_ and quiet[j_]: j_ += 1
            if (j_ - i_) / SR >= 0.05 and i_ > 0 and j_ < n_ - 1: pz.append((i_ / SR, j_ / SR))
            i_ = j_
        else: i_ += 1
    # DP: match[j] = pause index for break j or None
    B, P_ = len(brk), len(pz)
    INF = 1e9
    best = [[INF] * (P_ + 1) for _ in range(B + 1)]; back = {}
    best[0][0] = 0.0
    for j in range(B + 1):
        for i in range(P_ + 1):
            if best[j][i] >= INF: continue
            if i < P_ and best[j][i] + 0.04 < best[j][i + 1]: best[j][i + 1] = best[j][i] + 0.04; back[(j, i + 1)] = (j, i, None)   # skip a pause
            if j < B and best[j][i] + 0.7 < best[j + 1][i]: best[j + 1][i] = best[j][i] + 0.7; back[(j + 1, i)] = (j, i, None)         # break w/o pause
            if j < B and i < P_:
                c_ = abs(est_break[j] - (pz[i][0] + pz[i][1]) / 2)
                if c_ < 0.9 and best[j][i] + c_ < best[j + 1][i + 1]: best[j + 1][i + 1] = best[j][i] + c_; back[(j + 1, i + 1)] = (j, i, i)
    match = [None] * B; node = (B, P_)
    while node != (0, 0):
        pj, pi, used = back[node]
        if used is not None: match[pj] = used
        node = (pj, pi)
    # weights with matched anchors: split into spans between anchors
    groups, st = [], 0
    for b_ in brk + [len(words) - 1]:
        groups.append(list(range(st, b_ + 1))); st = b_ + 1
    ends = [0.0]; starts = []                       # speech spans
    span_of_group = []
    cur_start = 0.0; cur_groups = []
    spans = []
    for gi, grp in enumerate(groups):
        cur_groups.append(grp)
        last = gi == len(groups) - 1
        if last: spans.append((cur_start, dur, cur_groups))
        elif match[gi] is not None:
            spans.append((cur_start, pz[match[gi]][0], cur_groups)); cur_start = pz[match[gi]][1]; cur_groups = []
    ws = []
    for s0, s1, grps in spans:
        idx = [i for g_ in grps for i in g_]
        w_ = [clean(words[i]) + 1.5 + (2 if re.search(r"[,:]$", words[i]) and i != idx[-1] else 0) + (3 if re.search(r"[.?!]$", words[i]) and i != idx[-1] else 0) for i in idx]
        cs = np.concatenate([[0], np.cumsum(w_)])
        for k_, i in enumerate(idx):
            ws.append((line["at"] + s0 + (s1 - s0) * cs[k_] / cs[-1], line["at"] + s0 + (s1 - s0) * (cs[k_ + 1] - (0.4 if k_ < len(idx) - 1 and re.search(r"[.,:?!]$", words[i]) else 0)) / cs[-1], words[i]))
    print(f"   {line['id']}: {sum(m is not None for m in match)}/{B} phrase breaks pinned to measured pauses")
    # chunk each phrase into balanced pieces of <= 3 words / ~22 chars
    merged = []
    phr = []
    for w in ws:
        phr.append(w)
        if re.search(r"[.?!,:]$", w[2]) or w is ws[-1]:
            n = len(phr); k = max(1, -(-n // 3))
            while k < n and any(sum(len(z[2]) for z in phr[q * n // k:(q + 1) * n // k]) + 3 > 24 for q in range(k)): k += 1
            for q in range(k): merged.append(phr[q * n // k:(q + 1) * n // k])
            phr = []
    for ci, c in enumerate(merged):
        end = merged[ci + 1][0][0] if ci + 1 < len(merged) else c[-1][1] + 0.25
        cap_chunks.append({"s": round(c[0][0] * FPS), "e": round(end * FPS),
                           "words": [{"w": w[2], "s": round(w[0] * FPS), "e": round(w[1] * FPS)} for w in c]})
# ensure chunks don't overlap
for i in range(len(cap_chunks) - 1):
    cap_chunks[i]["e"] = min(cap_chunks[i]["e"], cap_chunks[i + 1]["s"])
for c in cap_chunks:
    c["words"][-1]["e"] = max(c["words"][-1]["e"], c["e"] - 1)
json.dump(cap_chunks, open(f"{ROOT}/src/data/captions.json", "w"), indent=1)

# ----------------------------------------------------------------------------- sfx track
sfx_track = np.zeros(N)
cache = {}
for c in script["sfx"]:
    s = cache.setdefault(c["kind"], sfx(c["kind"]))
    a = int(c["t"] * SR)
    if a >= N: continue
    seg = fade(s) * c["vol"]
    sfx_track[a:a + len(seg)] += seg[: N - a]

# ----------------------------------------------------------------------------- music
BPM = script["music"]["bpm"]; BEAT = 60 / BPM; E8 = BEAT / 2; S16 = BEAT / 4
mid = lambda m: 440.0 * 2 ** ((m - 69) / 12)
prog = [(57, [57, 60, 64]), (53, [53, 57, 60]), (48, [48, 52, 55]), (55, [55, 59, 62])]  # Am F C G
def note(freq_hz, d, kind, vol, tau=None, duty=0.5, glide_from=None):
    n = int(d * SR)
    f = np.full(n, float(freq_hz)) if glide_from is None else glide(glide_from, freq_hz, min(0.09, d), 1)
    if glide_from is not None: f = np.concatenate([f, np.full(max(0, n - len(f)), float(freq_hz))])[:n]
    w = osc(f, kind, duty)
    e = env_exp(n, tau) if tau else np.ones(n)
    e = e * np.minimum(1, np.arange(n) / (0.004 * SR)) * np.minimum(1, (n - np.arange(n)) / (0.01 * SR))
    return w * e * vol
bass = np.zeros(N); arp = np.zeros(N); drums = np.zeros(N); lead = np.zeros(N)
def put(track, t, seg):
    a = int(t * SR)
    if a < N: track[a:a + len(seg)] += seg[: N - a]
bars = int(TOTAL / (BEAT * 4)) + 1
kick = np.sin(2 * np.pi * np.cumsum(glide(150, 45, 0.18)) / SR) * env_exp(int(0.18 * SR), 0.06)
hat = fft_filter(noise(0.05), lo=6000) * env_exp(int(0.05 * SR), 0.012)
snare = (fft_filter(noise(0.16), lo=1200) * env_exp(int(0.16 * SR), 0.05) + 0.3 * np.sin(2 * np.pi * 190 * t_arr(0.16)) * env_exp(int(0.16 * SR), 0.04))
melody = [76, None, 79, 76, None, 72, 74, None]   # slippery lead (glides between notes)
for b in range(bars):
    root, chord = prog[b % 4]; t0 = b * BEAT * 4
    for i in range(8):
        tt = t0 + i * E8
        pat = [0, None, 12, None, 0, 7, 12, None][i]
        if pat is not None: put(bass, tt, note(mid(root - 12 + pat), E8 * 0.9, "tri", 0.55, 0.25))
    for i in range(16):
        tt = t0 + i * S16; m = chord[[0, 1, 2, 1][i % 4]] + 12 + (12 if (i // 4) % 2 else 0)
        put(arp, tt, note(mid(m), S16 * 0.9, "square", 0.16, 0.07, 0.25))
    for beat in range(4):
        if beat in (0, 2): put(drums, t0 + beat * BEAT, kick * 0.8)
        if beat in (1, 3): put(drums, t0 + beat * BEAT, snare * 0.35)
    for i in range(8): put(drums, t0 + i * E8 + E8 / 2 * 0, hat * (0.25 if i % 2 == 0 else 0.15))
    for i, m in enumerate(melody):
        if m is None: continue
        m2 = m + [0, 0, -5, -3][b % 4]
        put(lead, t0 + i * E8, note(mid(m2), E8 * 1.8, "saw", 0.12, 0.35, glide_from=mid(m2 - 7)))
# automation: gain curves per layer through the story
def curve(points):
    ts = np.arange(N) / SR; xs = [p[0] for p in points]; ys = [p[1] for p in points]
    return np.interp(ts, xs, ys)
sil0, sil1 = script["music"]["silenceFrom"], script["music"]["silenceTo"]
g_bass = curve([(0, 1), (3.3, 1), (3.5, 0.7), (12.8, 0.7), (13, 1), (29.8, 1), (30.9, 1), (30.92, 0), (33.4, 0), (33.5, 0.55), (38.8, 0.55), (39, 0.9), (41.4, 0.9), (41.6, 0)])
g_arp = curve([(0, 0.8), (3.3, 0.8), (3.5, 0.45), (12.8, 0.45), (13, 0.6), (24.4, 0.6), (24.6, 0.8), (30.9, 1.0), (30.92, 0), (33.4, 0), (33.5, 0.5), (38.8, 0.5), (39, 0.7), (41.5, 0.7), (41.6, 0)])
g_dr = curve([(0, 1), (3.3, 1), (3.5, 0.0), (12.8, 0.0), (13, 0.55), (24.4, 0.6), (24.6, 0.9), (30.9, 1), (30.92, 0), (33.5, 0), (33.6, 0.25), (38.8, 0.25), (39, 0.6), (41.5, 0.6), (41.6, 0)])
g_ld = curve([(0, 0.8), (3.3, 0.8), (3.5, 0.5), (24.4, 0.5), (24.6, 0.0), (33.5, 0), (33.6, 0.6), (38.8, 0.6), (39, 0.8), (41.5, 0.8), (41.6, 0)])
music = bass * g_bass + arp * g_arp + drums * g_dr + lead * g_ld
# quarter-tone pad on the final "slam" bar for the loop: the cut to silence at 0:30 is the joke.

# duck music under the voice
vb = np.abs(voice); k = int(0.06 * SR)
venv = np.convolve(vb, np.ones(k) / k, mode="same")
duck = 1 - (1 - 10 ** (script["music"]["duckDb"] / 20)) * np.clip(venv / 0.08, 0, 1)
duck = np.convolve(duck, np.ones(int(0.12 * SR)) / int(0.12 * SR), mode="same")
music = music * duck * 0.42

# ----------------------------------------------------------------------------- mix + normalise
mix = voice * 1.0 + sfx_track * 0.55 + music
mix = np.tanh(mix * 1.1) / np.tanh(1.1)
mix = mix / max(1e-9, np.max(np.abs(mix))) * 0.9
stereo = np.stack([mix, mix], axis=1)
# gentle haas width on the music only is skipped on purpose: mono-safe for phone speakers
tmp = tempfile.mktemp(suffix=".wav")
with wave.open(tmp, "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((stereo * 32767).astype("<i2").tobytes())
out = f"{ROOT}/public/audio/mix.wav"
subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", tmp, "-af", "loudnorm=I=-14:TP=-1.5:LRA=9", "-ar", str(SR), "-ac", "2", "-c:a", "pcm_s16le", out], check=True)
os.remove(tmp)
print("wrote", out, "captions:", len(cap_chunks))

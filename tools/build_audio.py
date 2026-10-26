#!/usr/bin/env python3
"""
Builds the whole soundtrack for the episode, reproducibly:
  * narration - Kokoro-82M neural TTS (ONNX), lightly mastered with ffmpeg; placed per src/data/timeline.json
  * captions  - word timings (frames) pinned to the real pauses in the speech -> src/data/captions.json
  * sfx       - procedurally synthesised; several are driven by the actual physics (speed-following hum, ring passes)
  * music     - original score synthesised procedurally, ducked under the voice
Output: public/audio/mix.wav (44.1 kHz stereo, -14 LUFS).
Needs: numpy, soundfile, ffmpeg. Engine "chatterbox" (default): run tools/tts_chatterbox.py then tools/pick_takes.py first (Python 3.11 env).
Engine "kokoro": pip install kokoro-onnx; model files in audio_cache/ (tools/fetch_voice.sh).
Env: VOICE overrides the voice in src/data/script.json (e.g. VOICE=am_michael).
"""
import json, os, re, subprocess, sys, tempfile, wave
import numpy as np

SR = 44100
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
script = json.load(open(f"{ROOT}/src/data/script.json"))
tl = json.load(open(f"{ROOT}/src/data/timeline.json"))
FPS = tl["fps"]; TOTAL = tl["totalSeconds"]; N = int(TOTAL * SR)
EV = tl["events"]
CACHE = f"{ROOT}/audio_cache"
os.makedirs(CACHE, exist_ok=True)
rng = np.random.default_rng(2024)
VOICE = os.environ.get("VOICE", script["voice"])

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


# ----------------------------------------------------------------------------- physics (mirrors src/engine/physics.ts)
G0, RKM = tl["earth"]["g"], tl["earth"]["radiusKm"]
OMEGA = (G0 / (RKM * 1000)) ** 0.5
HALF = np.pi / OMEGA
def pchip(xs, ys):
    xs = np.array(xs, float); ys = np.array(ys, float); n = len(xs)
    h = np.diff(xs); dl = np.diff(ys) / h; d = np.zeros(n)
    for i in range(1, n - 1):
        if dl[i - 1] * dl[i] > 0:
            w1 = 2 * h[i] + h[i - 1]; w2 = h[i] + 2 * h[i - 1]
            d[i] = (w1 + w2) / (w1 / dl[i - 1] + w2 / dl[i])
    def end(h0, h1, d0, d1):
        m = ((2 * h0 + h1) * d0 - h0 * d1) / (h0 + h1)
        if np.sign(m) != np.sign(d0): m = 0
        elif np.sign(d0) != np.sign(d1) and abs(m) > 3 * abs(d0): m = 3 * d0
        return m
    d[0] = end(h[0], h[1], dl[0], dl[1]); d[-1] = end(h[-2], h[-3], dl[-1], dl[-2])
    def f(x):
        x = np.asarray(x, float); out = np.empty_like(x)
        for k, xv in np.ndenumerate(x):
            if xv <= xs[0]: out[k] = ys[0]; continue
            if xv >= xs[-1]: out[k] = ys[-1]; continue
            i = int(np.searchsorted(xs, xv) - 1); t = (xv - xs[i]) / h[i]; t2 = t * t; t3 = t2 * t
            out[k] = (2*t3-3*t2+1)*ys[i] + (t3-2*t2+t)*h[i]*d[i] + (-2*t3+3*t2)*ys[i+1] + (t3-t2)*h[i]*d[i+1]
        return out
    return f
fall_tau = pchip(tl["fallMap"]["s"], tl["fallMap"]["tau"])
def tau_at(s):
    s = np.asarray(s, float)
    return np.where(s <= EV["jump"], 0.0, np.where(s >= EV["arrival"], HALF, fall_tau(np.clip(s, EV["jump"], EV["arrival"]))))
def race_tau(s): return np.clip((np.asarray(s, float) - EV["raceStart"]) / (EV["raceEnd"] - EV["raceStart"]), 0, 1) * HALF


# ----------------------------------------------------------------------------- extra sound effects
def pluck(freq, d=0.6, bright=1.0):
    tt = t_arr(d); e = np.exp(-tt * 7)
    return 0.5 * (np.sin(2 * np.pi * freq * tt) + 0.35 * bright * np.sin(4 * np.pi * freq * tt) * np.exp(-tt * 10) + 0.15 * np.sin(6 * np.pi * freq * tt) * np.exp(-tt * 18)) * e
def bell(freq, d=1.4):
    tt = t_arr(d); return 0.4 * sum(a * np.sin(2 * np.pi * freq * r * tt) * np.exp(-tt * k) for r, a, k in [(1, 1, 2.6), (2.76, 0.5, 4.5), (5.4, 0.25, 7), (8.9, 0.12, 10)])
def sfx2(kind):
    if kind == "whoop":
        d = 0.45; f = glide(240, 1100, d, 0.8); return 0.4 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.linspace(0, np.pi, len(f))) ** 0.7
    if kind == "riser":
        d = 2.4; f = glide(180, 2400, d, 2.2); w = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.25 + fft_filter(noise(d), lo=800) * np.linspace(0, 0.6, len(f)) ** 2
        return w * np.linspace(0, 1, len(f)) ** 1.5
    if kind == "heart":
        d = 0.5; tt = t_arr(d); f = glide(95, 45, d, 0.5); a = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 12)
        b = np.zeros_like(a); k = int(0.19 * SR); b[k:] = a[: len(a) - k] * 0.7; return a + b
    if kind == "tap":
        d = 0.12; tt = t_arr(d); return 0.5 * np.sin(2 * np.pi * 220 * tt) * np.exp(-tt * 55) + 0.2 * fft_filter(noise(d), lo=1500) * np.exp(-tt * 90)
    if kind == "ringpass":
        d = 0.14; tt = t_arr(d); return 0.5 * fft_filter(noise(d), lo=2500, hi=9000) * np.exp(-tt * 40)
    if kind == "sparkle":
        d = 1.2; n = int(d * SR); x = np.zeros(n)
        for k in range(18):
            a = int(rng.uniform(0, 0.8) * SR); f0 = 1400 * 2 ** (rng.integers(0, 12) / 12); L = int(0.25 * SR)
            if a + L < n: x[a:a + L] += 0.3 * np.sin(2 * np.pi * f0 * np.arange(L) / SR) * np.exp(-np.arange(L) / (0.06 * SR))
        return x
    if kind == "chord":   # bright major chord of bells (the three-way finish)
        return sum(bell(f, 2.2) for f in (523.25, 659.25, 783.99, 1046.5))
    if kind == "shimmer":
        d = 3.2; n = int(d * SR); tt = t_arr(d); x = sum(np.sin(2 * np.pi * f * tt + k) for k, f in enumerate((293.7, 440, 587.3, 880, 1174.7)))
        return 0.1 * x * np.sin(np.linspace(0, np.pi, n)) ** 2
    if kind in ("pluckA", "pluckB", "pluckC"):
        return pluck({"pluckA": 523.25, "pluckB": 659.25, "pluckC": 783.99}[kind], 0.7)
    return None
_sfx_cache = {}
def get_sfx(kind):
    if kind not in _sfx_cache:
        s = sfx2(kind)
        _sfx_cache[kind] = s if s is not None else sfx(kind)
    return _sfx_cache[kind]

def reverb(x, rt=1.5, wet=0.25, predelay=0.018):
    """Room-style reverb: unit-energy impulse response, so `wet` is a true dry/wet balance."""
    n = int(rt * SR); ir = rng.standard_normal(n) * np.exp(-np.arange(n) / (rt * SR / 6.9))
    ir = fft_filter(ir, lo=180, hi=6500); ir[: int(predelay * SR)] = 0
    ir /= np.sqrt((ir ** 2).sum()) + 1e-12
    L = len(x) + n; F = 1 << (L - 1).bit_length()
    y = np.fft.irfft(np.fft.rfft(x, F) * np.fft.rfft(ir, F), F)[: len(x)]
    return x * (1 - wet) + y * wet

def rms_db(x, thresh=1e-4):
    a = x[np.abs(x) > thresh]
    return 20 * np.log10(np.sqrt(np.mean(a ** 2)) + 1e-12) if len(a) else -120.0
def peak_db(x): return 20 * np.log10(np.max(np.abs(x)) + 1e-12)
def db(v): return 10 ** (v / 20)

# ----------------------------------------------------------------------------- narration + captions
# engine "chatterbox": takes generated by tools/tts_chatterbox.py and QC'd/aligned by tools/pick_takes.py (Whisper);
# engine "kokoro": synthesised here with Kokoro-82M (fallback, needs no GPU/PyTorch).
import difflib
import soundfile as sf
ENGINE = os.environ.get("ENGINE", script.get("engine", "chatterbox"))
VCHAIN = "highpass=f=70,acompressor=threshold=-24dB:ratio=2:attack=15:release=160:makeup=1"
PICK = json.load(open(f"{CACHE}/chatterbox_pick.json")) if ENGINE == "chatterbox" else {}
if ENGINE == "kokoro":
    from kokoro_onnx import Kokoro
    kok = Kokoro(f"{CACHE}/kokoro-v1.0.onnx", f"{CACHE}/voices-v1.0.bin")
    lang = "en-gb" if VOICE.startswith("b") else "en-us"
def load_trim(path):
    rawb = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    x = np.frombuffer(rawb, dtype=np.float32).astype(np.float64)
    nz = np.where(np.abs(x) > 0.015 * np.abs(x).max())[0]
    i0 = max(0, nz[0] - int(0.02 * SR))
    return x[i0: nz[-1] + int(0.06 * SR)], i0 / SR
def synth_line(l, slot):
    """Returns (trimmed mono audio, seconds trimmed off the start, tempo factor applied to fit the slot)."""
    if ENGINE == "chatterbox": raw = f"{ROOT}/{PICK[l['id']]['wav']}"
    else:
        raw = f"{CACHE}/{l['id']}_{VOICE}_{script['speed']}.wav"
        if not os.path.exists(raw):
            a_, sr_ = kok.create(l["text"], voice=VOICE, speed=script["speed"], lang=lang); sf.write(raw, a_, sr_)
    mastered = raw.replace(".wav", "_m.wav")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", raw, "-af", VCHAIN, mastered], check=True)
    x, t0 = load_trim(mastered); tempo = 1.0
    if len(x) / SR > slot:                                  # too long for its slot: speed up (pitch-preserving), gently
        tempo = len(x) / SR / slot
        if tempo > 1.18: print(f"WARNING: {l['id']} needs a {tempo:.2f}x speed-up to fit; consider editing the line")
        fast = mastered.replace("_m.wav", "_t.wav")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", mastered, "-af", f"atempo={tempo:.4f}", fast], check=True)
        x, t0 = load_trim(fast)
    return x, t0, tempo
def asr_align(words, asr):
    """Match the script's words to Whisper's timestamped words (by token, so 'forty-two' vs 'forty two' is fine); interpolate any gaps."""
    tk = lambda t: re.findall(r"[a-z0-9']+", t.lower().replace("-", " "))
    st = [(t, i) for i, w in enumerate(words) for t in tk(w)]; at = [(t, j) for j, w in enumerate(asr) for t in tk(w["w"])]
    sm = difflib.SequenceMatcher(None, [t for t, _ in st], [t for t, _ in at], autojunk=False)
    hit = {}
    for a_, b_, n in sm.get_matching_blocks():
        for k in range(n): hit.setdefault(st[a_ + k][1], []).append(at[b_ + k][1])
    t = [None] * len(words)
    for i, js in hit.items(): t[i] = [min(asr[j]["s"] for j in js), max(asr[j]["e"] for j in js)]
    first = asr[0]["s"] if asr else 0.0; last = asr[-1]["e"] if asr else 1.0
    i = 0
    while i < len(words):
        if t[i] is None:
            j = i
            while j < len(words) and t[j] is None: j += 1
            lo = t[i - 1][1] if i > 0 else first; hi = t[j][0] if j < len(words) else last
            wts = [len(words[k]) + 1 for k in range(i, j)]; cum = np.concatenate([[0], np.cumsum(wts)])
            for k in range(i, j): t[k] = [lo + (hi - lo) * cum[k - i] / cum[-1], lo + (hi - lo) * cum[k - i + 1] / cum[-1]]
            i = j
        else: i += 1
    return t, len(hit) / max(1, len(words))

voice = np.zeros(N); cap_chunks = []; prev_end = 0; voice_spans = []
LSTART = dict(tl["lineStarts"]); ids = [l["id"] for l in script["lines"]]
if ENGINE == "chatterbox":
    # sync: start each anchored line so that its key word lands exactly on the frame where that thing happens on screen
    for l in script["lines"]:
        if l["id"] not in tl.get("anchors", {}): continue
        word, when = tl["anchors"][l["id"]]; words_ = l["text"].split()
        k = next(i for i, w in enumerate(words_) if re.sub(r"\W", "", w).lower() == word.lower())
        tt_, _ = asr_align(words_, PICK[l["id"]]["words"])
        _, t0_ = load_trim(f"{ROOT}/{PICK[l['id']]['wav']}")
        LSTART[l["id"]] = round(float(when - (tt_[k][0] - t0_)), 3)
    print("line starts:", LSTART)
for li, l in enumerate(script["lines"]):
    line = {"id": l["id"], "text": l["text"], "at": LSTART[l["id"]]}
    nxt = LSTART[ids[li + 1]] if li + 1 < len(ids) else TOTAL - 0.4
    x, t0, tempo = synth_line(l, nxt - line["at"] - 0.12)
    x = x * db(-20 - rms_db(x))     # every line at the same speech level (-20 dBFS RMS)
    a = int(line["at"] * SR); voice[a:a + len(x)] += x[: N - a]
    dur = len(x) / SR; voice_spans.append((line["at"], line["at"] + dur))
    if line["at"] < prev_end: print(f"WARNING: {line['id']} overlaps the previous line by {prev_end - line['at']:.2f}s")
    prev_end = line["at"] + dur
    print(f"{line['id']}: {line['at']:.2f}s -> {prev_end:.2f}s ({dur:.2f}s, tempo {tempo:.2f})")
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
    # sanity: drop any pinned break whose phrase would be implausibly short/long versus its weight
    for _ in range(3):
        bad = None
        pins = [j for j in range(B) if match[j] is not None]
        edges_s = [0.0] + [pz[match[j]][1] for j in pins]; edges_e = [pz[match[j]][0] for j in pins] + [dur]
        grp_w = []; st_ = 0; gi_of = {}
        gw_all = []
        for b_ in brk + [len(words) - 1]:
            gw_all.append(sum(clean(words[i]) + 1.5 for i in range(st_, b_ + 1))); st_ = b_ + 1
        # accumulate weight per span
        span_w = []; acc = 0.0
        for gi in range(len(gw_all)):
            acc += gw_all[gi]
            if gi == len(gw_all) - 1 or match[gi] is not None: span_w.append(acc); acc = 0.0
        for si, w_ in enumerate(span_w):
            actual = edges_e[si] - edges_s[si]
            if not (0.5 <= (actual / dur) / (w_ / sum(gw_all)) <= 1.9): bad = si; break
        if bad is None: break
        match[pins[min(bad, len(pins) - 1)]] = None
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
    if ENGINE == "chatterbox":
        tt, cov = asr_align(words, PICK[l["id"]]["words"])
        rel = lambda v: line["at"] + v / tempo - t0
        ws = []
        for k, w in enumerate(words):
            s_ = rel(tt[k][0]); e_ = rel(tt[k + 1][0]) if k + 1 < len(words) else rel(tt[k][1])
            ws.append((s_, max(e_, s_ + 0.08), w))
        print(f"   {line['id']}: {cov:.0%} of words timed directly from the speech recogniser")
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
for i in range(len(cap_chunks) - 1):
    cap_chunks[i]["e"] = min(cap_chunks[i]["e"], cap_chunks[i + 1]["s"])
for c in cap_chunks:
    c["words"][-1]["e"] = max(c["words"][-1]["e"], c["e"] - 1)
json.dump(cap_chunks, open(f"{ROOT}/src/data/captions.json", "w"), indent=1)
print("captions:", len(cap_chunks), "chunks")

# ----------------------------------------------------------------------------- sound effects track (cues + physics-driven layers)
sfx_track = np.zeros(N)
def place(t, kind, vol=1.0, sig=None):
    s = (sig if sig is not None else get_sfx(kind)); a = int(t * SR)
    if a < 0 or a >= N: return
    seg = fade(s) / (np.abs(s).max() + 1e-9) * db(-15) * vol     # every effect calibrated to a -15 dBFS peak, then scaled by its cue volume
    sfx_track[a:a + len(seg)] += seg[: N - a]
cues = [
 (0.15, "swoosh", .35), (3.0, "riser", .35), (3.35, "whoop", .9), (3.4, "swoosh", .6),
 (EV["center"] - 1.1, "ding", .5), (EV["center"] - 1.4, "shimmer", .9), (EV["center"], "heart", .9),
 (EV["center"] + 2.1, "ding", .45), (EV["arrival"] - 0.1, "chord", .55), (EV["arrival"], "sparkle", .5),
 (EV["stepOut"], "boing", .45), (EV["stepOut"] + 0.5, "tap", .5), (EV["stepOut"] + 0.72, "tap", .45), (EV["stepOut"] + 0.94, "tap", .5), (EV["stepOut"] + 1.16, "tap", .45),
 (EV["zoomOut"] - 0.1, "whoosh", .6), (EV["zoomOut"] + 2.6, "pop", .6), (EV["chordB"], "pluckB", .7), (EV["chordB"] + 0.05, "pop", .4), (EV["chordC"], "pluckC", .7), (EV["chordC"] + 0.05, "pop", .4),
 (EV["raceStart"] - 0.3, "riser", .5), (EV["raceStart"], "swoosh", .8),
 (EV["raceEnd"], "chord", .75), (EV["raceEnd"] + 0.02, "sparkle", .6), (EV["raceEnd"] + 0.05, "thud", .5),
 (EV["raceEnd"] + 0.1, "ding", .4), (EV["explain"] + 0.3, "pop", .6), (EV["explain"] + 0.8, "pop", .6), (EV["explain"] + 1.3, "pop", .6),
 (EV["explain"] + 1.0, "ding", .35), (EV["explain"] + 3.2, "ding", .5), (EV["outro"] - 0.2, "whoosh", .7), (TOTAL - 1.9, "riser", .55), (TOTAL - 0.45, "swoosh", .35),
]
for t, k, v in cues: place(t, k, v)
# the tube hums at a pitch that follows his real speed; soft ticks as he passes each light ring
ts = np.arange(N) / SR
tau = tau_at(ts); spd = np.abs(np.sin(OMEGA * tau)); on = ((ts >= EV["jump"]) & (ts <= EV["arrival"] + 0.2)).astype(float)
gain = np.convolve(on, np.ones(int(0.3 * SR)) / int(0.3 * SR), mode="same") * (0.05 + 0.95 * spd) * 0.035
f = 110 + 620 * spd ** 0.9
hum = (np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.4 * np.sin(4 * np.pi * np.cumsum(f) / SR)) * gain
sfx_track += hum
A = 12.0 + 0.93 * 0.8; nrings = int((2 * A) // 2.4); ringy = [A - (i + 0.5) * (2 * A / nrings) for i in range(nrings)]
yy = A * np.cos(OMEGA * tau)
for ry in ringy:
    idx = np.where((yy[:-1] - ry) * (yy[1:] - ry) < 0)[0]
    for i in idx:
        t = ts[i]
        if EV["jump"] < t < EV["arrival"]: place(t - 0.01, "ringpass", 0.35 * (0.2 + spd[i]))
# layer boundaries (crust / mantle / outer core / inner core): a short scan sweep each time he crosses one
for rb in (0.955 * 12, 0.546 * 12, 0.191 * 12):
    for sgn in (1, -1):
        idx = np.where((yy[:-1] - sgn * rb) * (yy[1:] - sgn * rb) < 0)[0]
        for i in idx:
            if EV["jump"] < ts[i] < EV["arrival"]: place(ts[i] - 0.02, "swoosh", 0.32)
# race: three tones, one per pod, pitch follows each pod's speed; a soft tick for every elapsed minute-of-clock
rt = race_tau(ts); ron = ((ts >= EV["raceStart"]) & (ts <= EV["raceEnd"] + 0.2)).astype(float); rs = np.abs(np.sin(OMEGA * rt))
for base, amp, span in ((220.0, 0.05, 520), (330.0, 0.04, 330), (495.0, 0.03, 160)):
    f2 = base + span * rs
    sfx_track += np.sin(2 * np.pi * np.cumsum(f2) / SR) * np.convolve(ron, np.ones(2000) / 2000, mode="same") * (0.3 + 0.7 * rs) * amp
for k in range(int((EV["raceEnd"] - EV["raceStart"]) / 0.5)): place(EV["raceStart"] + k * 0.5, "tick", 0.28)
# footsteps etc are in cues above

# ----------------------------------------------------------------------------- music (original score)
BPM = 96; BEAT = 60 / BPM; E8 = BEAT / 2
mid = lambda m: 440.0 * 2 ** ((m - 69) / 12)
prog = [(50, [57, 62, 65, 69]), (46, [58, 62, 65, 69]), (53, [60, 65, 69, 72]), (48, [55, 60, 64, 67])]   # Dm  Bb  F  C
def padnote(freq, d, vol):
    n = int(d * SR); tt = t_arr(d)
    w = sum(np.sin(2 * np.pi * freq * (1 + dt) * tt) + 0.25 * np.sin(4 * np.pi * freq * (1 + dt) * tt) for dt in (-0.004, 0, 0.004))
    e = np.minimum(1, np.arange(n) / (0.6 * SR)) * np.minimum(1, (n - np.arange(n)) / (0.7 * SR))
    return w * e * vol / 3
pad = np.zeros(N); bass = np.zeros(N); arp = np.zeros(N); kick_t = np.zeros(N); hats = np.zeros(N)
def put(track, t, seg):
    a = int(t * SR)
    if 0 <= a < N: track[a:a + len(seg)] += seg[: N - a]
kick = np.sin(2 * np.pi * np.cumsum(glide(120, 42, 0.22)) / SR) * env_exp(int(0.22 * SR), 0.07)
hat = fft_filter(noise(0.06), lo=7000) * env_exp(int(0.06 * SR), 0.015)
bars = int(TOTAL / (BEAT * 4)) + 1
for b in range(bars):
    root, chord = prog[b % 4]; t0 = b * BEAT * 4
    for m in chord: put(pad, t0, padnote(mid(m - 12), BEAT * 4 + 1.0, 0.5))
    put(bass, t0, np.sin(2 * np.pi * mid(root - 12) * t_arr(BEAT * 2)) * env_exp(int(BEAT * 2 * SR), 0.9) * 0.9)
    put(bass, t0 + BEAT * 2, np.sin(2 * np.pi * mid(root - 12) * t_arr(BEAT * 2)) * env_exp(int(BEAT * 2 * SR), 0.9) * 0.7)
    for i in range(8):
        m = chord[[0, 2, 1, 3, 2, 1, 3, 2][i]] + (12 if i % 4 == 3 else 0)
        put(arp, t0 + i * E8, pluck(mid(m), 0.5) * 0.7)
    put(kick_t, t0, kick); put(kick_t, t0 + BEAT * 2, kick * 0.9)
    for i in range(8): put(hats, t0 + i * E8 + E8 * 0.0, hat * (0.5 if i % 2 else 0.8))
def curve(points):
    return np.interp(ts, [p[0] for p in points], [p[1] for p in points])
J, C0, AR, ZO, RS, RE, EX, OU = EV["jump"], EV["center"], EV["arrival"], EV["zoomOut"], EV["raceStart"], EV["raceEnd"], EV["explain"], EV["outro"]
g_pad = curve([(0, .7), (J, .8), (C0 - 1.5, .8), (C0 - 0.5, 1.5), (C0 + 3, 1.5), (C0 + 4.5, .8), (AR, .8), (ZO, .6), (RS - .5, .6), (RE, .9), (OU, .6), (TOTAL, .8)])
g_bass = curve([(0, 0), (2.0, .3), (J, 1), (C0 - 1.5, 1), (C0 - .8, 0), (C0 + 3, 0), (C0 + 4.5, 1), (AR, 1), (AR + .2, .5), (ZO, .8), (RE, 1), (RE + 0.1, .5), (OU, .5), (TOTAL, 0.3)])
g_arp = curve([(0, .4), (J, .7), (C0 - 1.5, .7), (C0 - .8, .2), (C0 + 3, .2), (C0 + 4.5, .7), (AR, .8), (ZO, .8), (RS - .5, .8), (RE, 1.0), (EX, .6), (OU, .5), (TOTAL, .6)])
g_kick = curve([(0, 0), (J - .2, 0), (J, 1), (C0 - 1.5, 1), (C0 - 1.0, 0), (C0 + 4.5, 0), (C0 + 5, 1), (AR - .1, 1), (AR, 0), (RS - .3, 0), (RS, 1), (RE, 1), (RE + .05, 0), (OU, 0), (TOTAL, 0)])
g_hat = curve([(0, 0), (J, .6), (C0 - 1.5, .6), (C0 - 1, 0), (C0 + 4.5, 0), (C0 + 5, .6), (AR, 0), (ZO, 0.4), (RE, .8), (RE + .05, 0), (EX, .3), (OU, .2), (TOTAL, 0)])
music = pad * g_pad + bass * g_bass * 0.5 + arp * g_arp * 0.55 + kick_t * g_kick * 0.7 + hats * g_hat * 0.18
music = reverb(music, 1.6, 0.25)
music *= db(-28 - rms_db(music))                      # score sits at -28 dBFS RMS, then ducks ~8 dB under the narration
vb = np.abs(voice); k = int(0.08 * SR)
venv = np.convolve(vb, np.ones(k) / k, mode="same")
duck = 1 - (1 - db(-8)) * np.clip(venv / 0.04, 0, 1)
duck = np.convolve(duck, np.ones(int(0.15 * SR)) / int(0.15 * SR), mode="same")
music = music * duck

# ----------------------------------------------------------------------------- mix + master
sfx_mix = reverb(sfx_track, 0.9, 0.12)
mix = voice + sfx_mix + music
print(f"stems (dBFS): voice rms {rms_db(voice):.1f} peak {peak_db(voice):.1f} | sfx peak {peak_db(sfx_mix):.1f} | music rms {rms_db(music):.1f} | mix peak {peak_db(mix):.1f}")
import soundfile as sf
stereo = np.stack([mix, mix], axis=1).astype("float32")
tmp = tempfile.mktemp(suffix=".wav"); sf.write(tmp, stereo, SR, subtype="FLOAT")
# Headroom matters: AAC (what every platform re-encodes to) overshoots by 1-3 dB, which clips on decode if we master hot.
# 1) shave the rare speech/effect peaks with a fast, transparent limiter; 2) two-pass *linear* loudness master with -3 dBTP.
PRE = "alimiter=limit=0.55:attack=4:release=60:level=disabled"
TARGET = "I=-16:TP=-3:LRA=7"
p1 = subprocess.run(["ffmpeg", "-hide_banner", "-i", tmp, "-af", f"{PRE},loudnorm={TARGET}:print_format=json", "-f", "null", "-"], capture_output=True, text=True).stderr
m = json.loads(p1[p1.rindex("{"): p1.rindex("}") + 1])
af = (f"{PRE},loudnorm={TARGET}:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true,"
      "alimiter=limit=0.60:level=disabled")
out = f"{ROOT}/public/audio/mix.wav"
subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", tmp, "-af", af, "-ar", str(SR), "-ac", "2", "-c:a", "pcm_s16le", out], check=True)
os.remove(tmp)
print("wrote", out)

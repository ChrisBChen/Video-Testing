#!/usr/bin/env python3
"""
Quality-control the TTS takes with speech recognition (faster-whisper, run in the Python 3.11 env):
  * transcribe every take, score it against the script (word error rate) and check its pace,
  * pick the best take per line,
  * keep Whisper's word timestamps (used for frame-accurate captions).
Writes audio_cache/chatterbox_pick.json.
"""
import json, os, re, sys
import soundfile as sf
from faster_whisper import WhisperModel
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
script = json.load(open(f"{ROOT}/src/data/script.json"))
norm = lambda t: re.findall(r"[a-z0-9']+", t.lower().replace("-", " "))

def wer(ref, hyp):
    d = list(range(len(hyp) + 1))
    for i, r in enumerate(ref, 1):
        prev, d[0] = d[0], i
        for j, h in enumerate(hyp, 1):
            cur = min(d[j] + 1, d[j - 1] + 1, prev + (r != h)); prev, d[j] = d[j], cur
    return d[len(hyp)] / max(1, len(ref))

model = WhisperModel("small.en", device="cpu", compute_type="int8")
res = {}   # (line, take) -> dict
for l in script["lines"]:
    ref = norm(l["text"])
    for take in ("A", "B"):
        wav = f"{ROOT}/audio_cache/cb_{l['id']}_{take}.wav"
        if not os.path.exists(wav): continue
        segs, _ = model.transcribe(wav, word_timestamps=True, language="en", initial_prompt=l["text"], beam_size=5, condition_on_previous_text=False)
        words = [{"w": w.word.strip(), "s": round(w.start, 3), "e": round(w.end, 3)} for s_ in segs for w in s_.words]
        dur = sf.info(wav).duration
        e = wer(ref, norm(" ".join(w["w"] for w in words)))
        res[(l["id"], take)] = {"take": take, "wav": os.path.relpath(wav, ROOT), "words": words, "dur": dur, "wer": e, "pace": len(ref) / dur}
        print(f"{l['id']} take {take}: WER {e:.2f}  {dur:.2f}s  {len(ref)/dur:.2f} w/s | {' '.join(w['w'] for w in words)}")
# one consistent take for the whole narration (same delivery style throughout), unless a line's transcript is wrong
takes = sorted({t for _, t in res})
def total(t): return sum(res[(l["id"], t)]["wer"] * 10 + abs(res[(l["id"], t)]["pace"] - 3.4) * 0.3 for l in script["lines"] if (l["id"], t) in res)
best = min(takes, key=total)
pick = {}
for l in script["lines"]:
    cand = res[(l["id"], best)]
    if cand["wer"] > 0.06:
        alt = min((res[(l["id"], t)] for t in takes if (l["id"], t) in res), key=lambda r: r["wer"]); cand = alt if alt["wer"] < cand["wer"] else cand
    pick[l["id"]] = cand
json.dump(pick, open(f"{ROOT}/audio_cache/chatterbox_pick.json", "w"), indent=1)
print("consistent take:", best, "| picked:", {k: v["take"] for k, v in pick.items()}, "| mean WER", round(sum(v["wer"] for v in pick.values()) / len(pick), 3))

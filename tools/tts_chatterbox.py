#!/usr/bin/env python3
"""
Generate narration takes with Chatterbox (Resemble AI, MIT licence) on CPU. Run with a Python 3.11 env that has chatterbox-tts.
Writes audio_cache/cb_<line>_<take>.wav. Seeds are fixed, so takes are reproducible.
(Chatterbox embeds Resemble's imperceptible "Perth" watermark in its output; we leave it enabled.)
"""
import json, os, sys, time
import soundfile as sf, torch
from chatterbox.tts import ChatterboxTTS
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
script = json.load(open(f"{ROOT}/src/data/script.json"))
os.makedirs(f"{ROOT}/audio_cache", exist_ok=True)
TAKES = [("A", 11, 0.6, 0.5), ("B", 22, 0.5, 0.4)]   # (name, seed, exaggeration, cfg_weight)
m = ChatterboxTTS.from_pretrained(device="cpu")
for take, seed, ex, cfg in TAKES:
    for l in script["lines"]:
        out = f"{ROOT}/audio_cache/cb_{l['id']}_{take}.wav"
        if os.path.exists(out): continue
        torch.manual_seed(seed); t = time.time()
        a = m.generate(l["text"], exaggeration=ex, cfg_weight=cfg).squeeze().numpy()
        sf.write(out, a, m.sr); print(f"{l['id']} take {take}: {len(a)/m.sr:.2f}s audio, {time.time()-t:.0f}s", flush=True)
print("done")

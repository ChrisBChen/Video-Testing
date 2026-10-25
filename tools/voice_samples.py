#!/usr/bin/env python3
"""Render the opening lines in several Kokoro voices so you can pick one: python3 tools/voice_samples.py"""
import json, os, subprocess
import soundfile as sf
from kokoro_onnx import Kokoro
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
script = json.load(open(f"{ROOT}/src/data/script.json"))
k = Kokoro(f"{ROOT}/audio_cache/kokoro-v1.0.onnx", f"{ROOT}/audio_cache/voices-v1.0.bin")
text = script["lines"][0]["text"] + " " + script["lines"][2]["text"]
os.makedirs(f"{ROOT}/voice_samples", exist_ok=True)
for v in ["af_heart", "af_bella", "af_nicole", "am_michael", "am_adam", "bf_emma", "bm_george"]:
    a, sr = k.create(text, voice=v, speed=script["speed"], lang="en-gb" if v[0] == "b" else "en-us")
    wav = f"{ROOT}/voice_samples/{v}.wav"; sf.write(wav, a, sr)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", wav, "-b:a", "128k", wav.replace(".wav", ".mp3")], check=True); os.remove(wav)
    print("wrote", v)

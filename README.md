# What If? Episode 1: *What If You Jumped Through the Earth?*

A 44.5-second, 1080×1920, 30 fps **3D** science explainer for TikTok / Reels / Shorts, generated entirely from code: [Remotion](https://www.remotion.dev) + React + three.js (software WebGL, no GPU needed). Every frame is a pure function of time, and the physics on screen is the real equation of motion, so renders are deterministic.

The protagonist is **Pip**, a round faceless astronaut who expresses himself through a glowing visor face.

| File | What it is |
|---|---|
| `final_video.mp4` | The finished video (H.264 High, yuv420p, 1080×1920, 30 fps, AAC stereo) |
| `script.md` | Why this topic, three hook options, final narration and on-screen text, sound design |
| `storyboard.md` | Shot list, camera moves, the physics behind the animation |
| `science_notes.md` | The idealised model, every claim and its caveats, references |
| `voice_samples/` | Chatterbox takes of three lines, and the same opening in several Kokoro voices (the fallback engine) |

## Run it

```bash
npm install
npm run studio        # live preview and scrubbing (Remotion Studio)
npm run render        # -> final_video.mp4 (about 55 min on 4 CPU cores without a GPU; much faster with one)
npm run typecheck
```

`public/audio/mix.wav` and `src/data/captions.json` are committed, so rendering needs nothing else.
If Remotion cannot download its own browser, set `REMOTION_BROWSER=/path/to/chromium`.

### Rebuild the voice, captions, SFX and music

Narration uses **Chatterbox** (Resemble AI, MIT licence), a large expressive neural TTS model, run on CPU in a Python 3.11 environment. Each take is transcribed back with **Whisper** to check it was spoken correctly and to get word-exact timestamps for the captions.

```bash
uv venv --python 3.11 .venv-tts
uv pip install --python .venv-tts/bin/python --index-strategy unsafe-best-match \
    --extra-index-url https://download.pytorch.org/whl/cpu -r requirements-tts.txt
.venv-tts/bin/python tools/tts_chatterbox.py     # 2 takes per line (~15 min on 4 cores)
.venv-tts/bin/python tools/pick_takes.py         # Whisper QC: word-error-rate, pick one consistent take, word timestamps
python3 -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt
python3 tools/build_audio.py                     # voice + SFX + music + captions -> public/audio/mix.wav
```

`ENGINE=kokoro python3 tools/build_audio.py` uses the small Kokoro-82M model instead (no PyTorch needed; `npm run voice` downloads it).

`build_audio.py` aligns the narration to the picture: key words are anchored to the frames where they happen on screen (`anchors` in `src/data/timeline.json`: "center", "stop", "New York", "same time"). It levels the voice, calibrates the effects and music against it, ducks the music under speech, and finishes with a fast transparent peak limiter plus a **two-pass linear loudness master (about −16 LUFS, −4 dBFS peak)**. The headroom is deliberate: AAC (what every platform re-encodes to) overshoots by 1–3 dB, which clips on decode if the master is hot. There is no soft saturation anywhere in the chain.

## How it is built

```
src/
  index.ts, Root.tsx, Video.tsx   Remotion entry; one three.js canvas + HTML HUD/captions + audio
  story.ts                        THE DIRECTOR: Pip's state, the tunnels/pods, and the camera as functions of time
  World.tsx                       the 3D scene (lights, Earth, tubes, pods, arrows), driven by story.ts
  art/Earth.tsx, art/Props.tsx    hemisphere planet (procedural continents/clouds), glass tubes, pods, arrows, halos, stars
  engine/
    pip.tsx                       Pip: pose-driven 3D character (joints, expressions)
    physics.ts                    the gravity-tunnel equations (omega, half-trip, speeds, time-lapse map)
    math.ts                       easing, springs, monotone cubic keyframes, seeded RNG
    project.ts                    world-to-screen projection so HTML labels track 3D points
    env.ts                        studio reflection map shared by the glossy materials
  components/Hud.tsx, Captions.tsx
  data/timeline.json              event times, line start times, fall time-lapse map  <- retime here
  data/script.json                narration lines, voice, speed
  data/captions.json              generated word timings
tools/                            build_audio.py, tts_chatterbox.py, pick_takes.py, voice_samples.py, fetch_voice.sh, stills.sh, contact.py
```

* **Deterministic.** No wall-clock and no `Math.random` at render time. The physics is closed-form (`position = A·cos(ωt)`), so any frame renders independently.
* **Loops.** The last frame's camera and pose are the first frame's, so the video loops.
* **Reusing it for episode 2.** Keep `engine/`, `components/`, and the audio tool; write a new `story.ts` + `World.tsx` + art, update `timeline.json` / `script.json`, run `build_audio.py`, then `npm run render`.
* **Quick previews.** `tools/stills.sh name 3.4 12 22` renders stills at those seconds and a contact sheet.

## Verified properties of `final_video.mp4`

Checked with `ffprobe`/`ffmpeg`: 1080×1920, 30 fps, 44.5 s, H.264 + AAC 256 kbps; integrated loudness −15.9 LUFS; **decoded audio peaks at −1.4 dBFS with no clipped samples** (checked on the MP4 itself, after AAC encoding); no black or frozen sections; last frame matches the first. Narration: every take transcribed back by Whisper with 0 % word error; key words land within ~0.1 s of the on-screen events they describe.

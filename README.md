# What If? Episode 1: *What If You Jumped Through the Earth?*

A 44.5-second, 1080×1920, 30 fps **3D** science explainer for TikTok / Reels / Shorts, generated entirely from code: [Remotion](https://www.remotion.dev) + React + three.js (software WebGL, no GPU needed). Every frame is a pure function of time, and the physics on screen is the real equation of motion, so renders are deterministic.

The protagonist is **Pip**, a round faceless astronaut who expresses himself through a glowing visor face.

| File | What it is |
|---|---|
| `final_video.mp4` | The finished video (H.264 High, yuv420p, 1080×1920, 30 fps, AAC stereo) |
| `script.md` | Why this topic, three hook options, final narration and on-screen text, sound design |
| `storyboard.md` | Shot list, camera moves, the physics behind the animation |
| `science_notes.md` | The idealised model, every claim and its caveats, references |
| `voice_samples/` | The same two lines in 7 different Kokoro voices; swap the voice in `src/data/script.json` |

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

```bash
python3 -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt
npm run voice                       # downloads the Kokoro-82M model (~350 MB) into audio_cache/
python3 tools/build_audio.py        # or:  VOICE=am_michael python3 tools/build_audio.py
python3 tools/voice_samples.py      # re-render the voice comparison clips
```

`build_audio.py` synthesises narration (Kokoro-82M, lightly EQ'd and compressed), pins word timings to the real pauses in the speech to write `src/data/captions.json`, synthesises the sound effects (including a hum whose pitch follows the astronaut's real speed), generates and ducks the music, and masters to −14 LUFS.

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
tools/                            build_audio.py, voice_samples.py, fetch_voice.sh, stills.sh, contact.py
```

* **Deterministic.** No wall-clock and no `Math.random` at render time. The physics is closed-form (`position = A·cos(ωt)`), so any frame renders independently.
* **Loops.** The last frame's camera and pose are the first frame's, so the video loops.
* **Reusing it for episode 2.** Keep `engine/`, `components/`, and the audio tool; write a new `story.ts` + `World.tsx` + art, update `timeline.json` / `script.json`, run `build_audio.py`, then `npm run render`.
* **Quick previews.** `tools/stills.sh name 3.4 12 22` renders stills at those seconds and a contact sheet.

## Verified properties of `final_video.mp4`

Checked with `ffprobe`/`ffmpeg` (see the final report for the exact numbers): 1080×1920, 30 fps, 44.5 s, H.264 + AAC, loudness ≈ −14 LUFS, no black or frozen sections, and the last frame matches the first.

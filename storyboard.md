# Storyboard: Episode 1, *What If You Jumped Through the Earth?*

Look: a clean 3D explainer. The planet is a real hemisphere (procedural continents, clouds, an atmosphere glow) with the other half cut away to show the layers. Studio lighting with reflections, soft shadows, glossy glass tubes, a 3D starfield, glowing HUD, and a round faceless astronaut. The camera is a real 3D camera: it starts on a close-up of Pip, pulls back to show the planet, tracks the fall, orbits the center, and pulls out in one move to reveal the whole Earth.

World units: Earth radius 12; astronaut ≈ 1.7 tall (not to scale: stated on screen). Safe areas: HUD at y≈150–400 px; captions y 1290–1446 px; nothing essential in the bottom 22 %.

## Character

**Pip**: a round little astronaut: white suit, orange accents, antenna, dark glossy visor with a glowing face (eyes, brows, mouth). Faceless in the Kurzgesagt / WALL-E tradition, so expression stays readable when he is tiny, spinning, or upside down. The earlier human "scientist" was dropped.

## Shots

| Time | Shot | Action | Camera |
|---|---|---|---|
| 0:00–0:03.4 | **Hook** | Close-up on Pip (smug) standing on a little planet next to a hole (sign: DO NOT ENTER, cones, trees). Title card. The camera swings back to reveal the curved planet; he looks in (worried), then crouches (smug). | Close-up → pull-back → overhead tilt down the shaft |
| 0:03.4 | **Jump** | Hop into the glass tube; yell face. | Locks onto Pip |
| 0:04–0:09 | **Acceleration** | Flailing fall; light rings streak by; crust → mantle → outer core labels; speed climbs. | Follow-cam, 3/4 from the right, looking ahead of him |
| 0:09–0:17 | **The center** | Eight arrows converge and cancel, "g = 0". Pip floats sideways, arms out, happy face; speed 28,458 km/h vs space station 27,600. The core glows. | Swings left and closes in; slow drift |
| 0:17–0:22.5 | **Deceleration** | He slows, rotating head-down (feet toward the center), worried face, speed → 0. | Follow-cam, pulling out |
| 0:22.5 | **Arrival** | Stops exactly at the surface: "OTHER SIDE REACHED 42:12". Pulse ring. | Eye-level at the far hole |
| 0:24–0:25.3 | **Step out** | Hops onto the beach (upside down relative to the screen: that is "up" there), cheers. | Pulls back |
| 0:25.3–0:29 | **Zoom-out reveal** | The whole Earth appears; pod A materialises around Pip at the bottom. | One continuous pull-out |
| 0:29.3 / 0:32 | **More tunnels** | New York → LA tunnel (to scale), then an across-town tunnel (exaggerated). Colour-coded chips with live speeds. | Wide, slow orbit |
| 0:32.6–0:37.4 | **The race** | Three glowing pods leave together; speeds differ wildly (28,458 / 8,790 / 22 km/h); all stop at the far end together. | Wide orbit, with a one-second cut-in on the glowing core as the centre pod flies through it |
| 0:37.8–0:42.5 | **Why** | Gravity arrows at each tunnel's end: strong, medium, gentle pull ↔ long, medium, short trip. "BIGGER PULL, LONGER TRIP = SAME TIME". | Slow push-in |
| 0:42.5–0:44.5 | **Loop** | Fine print: real Earth ≈ 38 min. Camera flies back in to the close-up of Pip standing at the hole again, frame-matched to frame 0. | Smooth fly-in |

## Physics driving the animation

The motion is not hand-keyed. It uses the actual solution: along any straight frictionless tunnel through a uniform sphere, position = amplitude × cos(ωt) with ω = √(g/R) (period 84.4 min, one way 42.2 min). Video time maps to physical time through a smooth, variable-rate time-lapse (`fallMap` in `src/data/timeline.json`); every readout (clock, speed) and the speed-following sound come from the same function.

import { C } from "../engine/palette";
import { G, rect, text } from "../engine/px";
import { SceneFn } from "./types";
import { drawLab, drawBench, FEET_Y } from "../art/lab";
import { drawScientist, gait, idle } from "../engine/scientist";
import { drawMug } from "../art/props";
import { easeIn, easeOut, inv, lerp, track } from "../engine/ease";

/**
 * EPILOGUE (39.0s - 42.0s). Friction is back. Dr. Pip trips on his untied lace and slams the button again:
 * the last frame (white flash) is the first frame of the video, so it loops.
 */
export const epilogue: SceneFn = (g, t) => {
  drawLab(g, { clock: t + 60 });
  const FINAL = 80;
  const pressed = t >= FINAL;
  drawBench(g, 24, { pressed });
  // approach (walks in), sigh, notice mug, trip
  const walkEnd = 36;
  let x = t < walkEnd ? lerp(112, 68, easeOut(inv(0, walkEnd, t))) : t < 58 ? 68 : lerp(68, 60, easeIn(inv(58, FINAL, t)));
  const mugFace = t >= 56 ? "worried" : "calm";
  drawMug(g, 34, 89, { face: mugFace, steam: t });

  const pose: any = { x, y: FEET_Y, flip: true, plaster: true, soot: true };
  if (t < walkEnd) Object.assign(pose, gait(t * 0.5, { stride: 3, lift: 2, swing: 3 }), { eyes: "closed", mouth: "frown", lean: 1 });
  else if (t < 50) Object.assign(pose, idle(t / 30), { eyes: "closed", mouth: "o", sweat: t < 44, lean: 0 });   // big sigh
  else if (t < 58) Object.assign(pose, idle(t / 30), { eyes: "happy", mouth: "smile", handR: [9, -14] });         // reaches for the mug
  else if (t < FINAL) {
    // lace catches the other shoe: lurch forward, windmill, fist lands on the button
    const a = inv(58, FINAL, t);
    const sp = t * 0.8;
    Object.assign(pose, {
      lean: lerp(0, 4, easeIn(a)), eyes: "wide", mouth: "yell", brow: -1, lookX: 1,
      footL: [-2, 0], footR: [lerp(2, 5, a), -lerp(0, 2, a)],
      handR: [lerp(8, 9, a) + Math.cos(sp) * (1 - a) * 6, lerp(-14, -22, a) + Math.sin(sp) * (1 - a) * 6],
      handL: [-4 + Math.cos(sp + 3) * 6 * (1 - a), -16 + Math.sin(sp + 3) * 6 * (1 - a)],
    });
  } else Object.assign(pose, { lean: 3, handR: [9, -22], handL: [-2, -9], eyes: "wide", mouth: "yell", brow: -1, lookX: 1 });
  drawScientist(g, pose);
  // the untied lace (callback) trailing off the front foot
  if (t >= 30) { const lx = x - 5, ly = FEET_Y - 1; for (let i = 0; i < 6; i++) rect(g, lx - i * (t < 58 ? 1 : 1.5), ly + (i % 2), 1, 1, C.white); }
  if (t >= 62 && t < FINAL) text(g, "!", x - 4, FEET_Y - 44, C.yellow, { align: "center" });
  if (t >= FINAL - 2) { g.fillStyle = C.white; g.globalAlpha = Math.min(1, inv(FINAL - 2, 89, t)); g.fillRect(0, 0, 90, 160); g.globalAlpha = 1; }
};

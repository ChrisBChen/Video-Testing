import { C } from "../engine/palette";
import { G, rect, text, line } from "../engine/px";
import { SceneFn } from "./types";
import { drawTown } from "../art/town";
import { drawCart, drawPigeon } from "../art/vehicles";
import { drawScientist, gait, idle } from "../engine/scientist";
import { easeIn, easeOut, inv, lerp, spring, track } from "../engine/ease";

/**
 * WALK (12.8s - 18.6s). Walking = pushing the ground backward and being pushed forward by it.
 * With no friction the foot just slides: the legs spin, the body goes nowhere, then topples straight down.
 */
const HX = 17, FY = 104;
const arrow = (g: G, x: number, y: number, dir: 1 | -1, c: string, dashed = false) => {
  for (let i = 0; i < 7; i++) if (!dashed || i % 3 !== 2) rect(g, dir > 0 ? x + i : x - i, y, 1, 2, c);
  rect(g, dir > 0 ? x + 7 : x - 7, y - 1, 1, 4, c); rect(g, dir > 0 ? x + 8 : x - 8, y, 1, 2, c);
};

export const walk: SceneFn = (g, t) => {
  drawTown(g, 0, "sidewalk", { clouds: t });
  // coffee cart (the goal)
  drawCart(g, 62, 100);
  text(g, "COFFEE", 62, 62, C.yellow, { align: "center" });
  const steam = t * 0.15;
  for (let i = 0; i < 2; i++) rect(g, 54 + i * 4, 82 - ((steam + i * 3) % 7), 1, 2, C.white);

  // gait phase: gentle try, then frantic spin
  const w = track(t, [[28, 0], [34, 7], [78, 10], [135, 34]], easeIn);
  let ph = 0;
  for (let k = 28; k < t; k++) ph += track(k, [[28, 0], [34, 7], [78, 10], [135, 34]], easeIn) / 30;
  const spin = t >= 78;
  const falling = inv(135, 160, t);
  const lyingT = t - 160;

  const base: any = { x: HX, y: FY, ...gait(ph, { stride: 3 + w * 0.12, lift: 2 + w * 0.12, swing: 3 + w * 0.1, crouch: 0.5 }) };
  if (t < 28) Object.assign(base, idle(t / 30), { footL: [-2, 0], footR: [2, 0], handL: undefined, handR: undefined });
  const face = t < 28 ? { eyes: t > 8 ? "happy" : "normal", mouth: "smile", lookX: 1 }
    : t < 78 ? { eyes: "normal", mouth: "flat", brow: 1, lookX: 1 }
    : { eyes: "wide", mouth: "yell", brow: -1, sweat: true, lookX: 1 };
  Object.assign(base, face);
  if (t >= 28 && t < 135) base.lean = 1 + (spin ? Math.sin(t * 0.9) * 0.8 : 0);

  if (falling > 0) {
    // body falls straight down: feet cannot push it, so no forward travel at all
    const a = easeIn(falling);
    base.rot = a * (Math.PI / 2) * 0.98;
    const pivotY = lerp(FY - 14, FY - 5, a);
    base.y = pivotY + 14;
    base.lean = a * 3;
    base.mouth = "o"; base.eyes = "wide";
    if (falling >= 1) {
      // still "swimming" along the pavement: zero progress
      const c = lyingT / 5;
      Object.assign(base, gait(c, { stride: 5, lift: 4, swing: 5, crouch: 0 }), { mouth: "frown", eyes: lyingT > 8 ? "closed" : "wide", brow: 0, sweat: false });
      base.rot = (Math.PI / 2) * 0.98 + (lyingT < 4 ? Math.sin(lyingT) * 0.04 : 0);
    }
  }

  // motion-blur ghosts when the legs are a blur
  if (spin && falling <= 0) {
    for (const d of [-0.9, 0.9]) drawScientist(g, { ...base, ...gait(ph + d, { stride: 3 + w * 0.12, lift: 2 + w * 0.12, swing: 3 + w * 0.1 }), alpha: 0.35 });
  }
  drawScientist(g, base);
  if (t >= 28 && t < 135) {
    // little whoosh strokes at the feet: lots of effort, no travel
    for (let i = 0; i < 3; i++) rect(g, HX - 9 - ((t * 2 + i * 4) % 8), FY - 2 - i * 3, 5, 1, C.white);
  }

  // diagram: you push the ground back, it pushes you forward... except it can't
  if (t >= 34 && t < 118) {
    const a = t < 40 ? 0 : 1;
    rect(g, 3, 30, 84, 26, C.ink); rect(g, 4, 31, 82, 24, C.plum);
    const k1 = spring((t - 34) / 30, 14, 6);
    if (t >= 34) { arrow(g, 12, 38 - (1 - k1) * 3, -1, C.red); text(g, "YOU PUSH", 17, 35 - (1 - k1) * 3, C.white, { outline: null }); }
    if (t >= 58) {
      const k2 = spring((t - 58) / 30, 14, 6);
      arrow(g, 6, 49 + (1 - k2) * 3, 1, C.lime, true);
      text(g, "NO PUSH", 17, 46 + (1 - k2) * 3, C.mist, { outline: null });
      if (t > 62) { line(g, 6, 44, 14, 53, C.red, 2); line(g, 14, 44, 6, 53, C.red, 2); }
    }
    void a;
  }

  // pigeon: flying doesn't need friction
  if (t >= 118) {
    const px = lerp(-10, 100, inv(118, 174, t)) ;
    drawPigeon(g, px, 76 + Math.sin(t * 0.2) * 2, t * 0.9);
  }
};

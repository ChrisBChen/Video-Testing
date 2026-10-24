import { C } from "../engine/palette";
import { G, rect, text, line, ring, disc } from "../engine/px";
import { SceneFn } from "./types";
import { drawTown } from "../art/town";
import { drawBlueprint } from "../art/lab";
import { drawCar, drawCart, drawHotdog, drawCrate } from "../art/vehicles";
import { drawScientist, gait } from "../engine/scientist";
import { clamp, easeIn, easeInOut, easeOut, inv, lerp, spring } from "../engine/ease";
import { shake } from "../engine/physics";

/**
 * PAYOFF (29.4s - 39.0s). Friction returns at 0:30 (global frame 930 => local t = 48).
 * A: the whole street is gliding. B: hit-stop + slow-mo as every contact grips at once.
 * C: two clean demos: "base stops, whatever is on top keeps going" (sled + crate), then the trip.
 */
export const IMPACT = 48;
const CUT_C = 124;
const FEET = 104;
const EF = 97;   // explainer floor sits higher so nothing hides behind the captions

const warp = (t: number) => (t < IMPACT ? t : t < IMPACT + 3 ? IMPACT : t < IMPACT + 43 ? IMPACT + (t - IMPACT - 3) * 0.25 : IMPACT + 10 + (t - IMPACT - 43));

function street(g: G, t: number) {
  const tau = warp(t), s = tau / 30, k = Math.max(0, tau - IMPACT);
  const ks = k / 30;
  drawTown(g, 0, "road", { clouds: t });
  const sk = shake(Math.max(0, (t - IMPACT) / 30), 2, 5);
  g.save(); g.translate(sk.x, sk.y);

  // --- hot-dog cart (far lane): slides, then stops dead; its hot dogs keep going ---
  const cx = 6 + 16 * Math.min(s, IMPACT / 30);
  drawCart(g, cx, 95);
  if (k <= 0) { for (let i = 0; i < 3; i++) drawHotdog(g, cx - 5 + i * 5, 81); }
  else for (let i = 0; i < 3; i++) {
    const vx = 18 + i * 7, vy = -34 + i * 6;
    const x = cx - 5 + i * 5 + vx * ks, y = 81 + vy * ks + 0.5 * 330 * ks * ks;
    if (y < 103) drawHotdog(g, x, y, ks * (6 + i * 3));
  }

  // --- spinning car (mid lane): sliding sideways at an angle, then trips and flips ---
  const sCar = Math.min(s, IMPACT / 30);
  const carX0 = 100, carV = -26, w = 2.4;
  const carX = carX0 + carV * sCar - (k > 0 ? 8 * easeOut(clamp(k / 50)) : 0);
  const carRot = w * sCar - (k > 0 ? 2 * Math.PI * easeInOut(clamp(k / 42)) : 0);
  const hop = k > 0 ? 13 * Math.sin(Math.PI * clamp(k / 42)) : 0;
  drawCar(g, carX, 101 - hop, { color: C.red, dark: C.redD, rot: carRot, pivotY: -6, face: "panic", wheel: s * 3 });

  // --- Dr. Pip, gliding on his feet, glasses long gone ---
  const hx0 = 30, hv = 12;
  const hxImp = hx0 + hv * (IMPACT / 30);
  if (k <= 0) {
    const x = hx0 + hv * s;
    drawScientist(g, {
      x, y: FEET, noGlasses: true, eyes: "squint", mouth: "o", brow: -1, lookX: 1, lookY: -0.5, sweat: true,
      lean: 0, handL: [-8, -21], handR: [8, -21],
      footL: [-3, 0], footR: [3, 0],
    });
  } else {
    // feet grip, the rest keeps going: a forward pitch and tumble
    const c = clamp(k / 48);
    const rot = lerp(0, Math.PI * 2.5 * 0.98 + 0.0, easeInOut(c));
    const x = hxImp + 13 * ks * Math.min(1, 1.2 - c * 0.2) + 4 * easeOut(c);
    const arc = 11 * Math.sin(Math.PI * Math.min(1, c * 1.1));
    const pivotY = lerp(FEET - 14, FEET - 5, easeIn(c)) - arc;
    drawScientist(g, {
      x, y: pivotY + 14, rot, noGlasses: true,
      eyes: c > 0.9 ? "dizzy" : "wide", mouth: c > 0.9 ? "frown" : "yell", brow: -1,
      handL: [-8, -22], handR: [8, -22], footL: [-3, -3], footR: [3, -3],
    });
    if (c > 0.92) for (let i = 0; i < 3; i++) {
      const a = (t * 0.3) + i * 2.1;
      rect(g, x + 12 + Math.cos(a) * 8, FEET - 8 + Math.sin(a) * 2, 2, 2, C.yellow);
    }
  }
  g.restore();

  // --- impact FX ---
  if (k >= 0 && t >= IMPACT) {
    const u = t - IMPACT;
    if (u < 3) { g.fillStyle = C.white; g.globalAlpha = 1 - u / 3; g.fillRect(0, 0, 90, 160); g.globalAlpha = 1; }
    const r = Math.min(70, ks * 90);
    if (u < 24) { g.globalAlpha = 1 - u / 24; ring(g, 50, 100, Math.round(r), C.white, 2); g.globalAlpha = 1; }
    if (u < 60) {
      const p = spring(u / 30, 14, 6);
      text(g, "WHAM!", 45, 40 + 8 - p * 8 + (u > 30 ? (u - 30) * 0.4 : 0), C.yellow, { size: 16, align: "center", shadow: C.redD });
    }
  } else if (t > 30) {
    // the last seconds: everything is still gliding...
    if (t % 8 < 4) text(g, "!", 45, 44, C.red, { size: 16, align: "center" });
  }
}

function explain(g: G, t: number) {
  const u = t - CUT_C;
  drawBlueprint(g, EF + 1);
  // grip patch: "friction is back" strip
  const patchX = 44, patchW = 30;
  const show = inv(8, 18, u);
  if (show > 0) {
    for (let i = 0; i < patchW; i++) rect(g, patchX + i, EF, 1, 2, i % 2 ? C.green : C.lime);
  }
  rect(g, 0, EF, patchX, 1, C.skyL);

  if (u < 84) {
    // DEMO 1: sled + crate. Base stops at the grip patch, the crate keeps its velocity.
    const v = 36, front0 = 14, hitU = 25;
    const sf = u < hitU ? front0 + v * (u / 30) : front0 + v * (hitU / 30);
    const sq = u >= hitU ? spring((u - hitU) / 30, 18, 8) : 0;
    // sled
    rect(g, sf - 20, EF - 6, 22, 5, C.blue); rect(g, sf - 20, EF - 6, 22, 1, C.cyan);
    rect(g, sf - 21, EF - 2, 24, 2, C.blueD);
    // crate rides on the sled until the stop
    const crateX0 = sf - 11;
    let cxp = crateX0, cyp = EF - 10, rot = 0;
    if (u >= hitU) {
      const f = (u - hitU) / 30;
      cxp = crateX0 + v * f * 0.95; cyp = EF - 10 + Math.min(0, 0) + 0.5 * 300 * f * f - 4 * Math.sin(Math.min(1, f * 4) * Math.PI);
      if (cyp > EF - 5) cyp = EF - 5;
      rot = f * 5;
      if (cyp >= EF - 5) rot = Math.round(rot / (Math.PI / 2)) * (Math.PI / 2);
    }
    drawCrate(g, cxp, cyp, rot);
    if (u >= hitU && u < hitU + 6) text(g, "STOP", sf - 6, EF - 24, C.red, { align: "center" });
    if (u > 30) { rect(g, 6, 56, 78, 1, C.violet); }
    if (u >= 30) text(g, "BASE STOPS", 45, 46, C.red, { align: "center", outline: null });
    if (u >= 46) { text(g, "TOP KEEPS", 45, 58, C.yellow, { align: "center", outline: null }); text(g, "GOING", 45, 67, C.yellow, { align: "center", outline: null }); }
  } else {
    // DEMO 2: the trip. Same physics, Dr. Pip's feet are the base.
    const w = u - 84;
    const tripAt = 36;
    const speed = 36;
    const toeX = 52;
    const hx = w < tripAt ? -6 + speed * (w / 30) : -6 + speed * (tripAt / 30);
    // curb
    rect(g, toeX, EF - 3, 14, 3, C.mist); rect(g, toeX, EF - 3, 14, 1, C.white);
    if (w < tripAt) {
      drawScientist(g, { x: hx, y: EF, ...gait(w * 0.55, { stride: 4, lift: 3, swing: 4 }), eyes: "normal", mouth: "smile", lookX: 1 });
    } else {
      const f = w - tripAt;
      const c = clamp(f / 22);
      const th = easeIn(c) * (Math.PI / 2) * 0.98;
      const Fx = hx + 4, Fy = EF;                        // anchored toe
      const make = (a: number, alpha = 1) => drawScientist(g, {
        x: Fx + 14 * Math.sin(a) - 4, y: Fy - 14 * Math.cos(a) + 14, rot: a, alpha,
        eyes: c > 0.5 ? "wide" : "squint", mouth: c > 0.5 ? "yell" : "o", brow: -1,
        footL: [-3, 0], footR: [4, 0], handL: [-8, -22], handR: [9, -22],
      });
      if (c < 1) for (const d of [0.55, 0.3]) make(Math.max(0, th - d * (th)), 0.28);
      make(th);
      if (c >= 1) {
        // slides to a stop on the grippy floor
        const lt = f - 22;
        if (f >= 40) text(g, "OOF", Fx + 8, EF - 22 - Math.min(6, lt * 0.5), C.yellow, { align: "center" });
      }
      if (f < 40) {
        text(g, "FEET STOP", 45, 46, C.red, { align: "center", outline: null });
        if (f > 6) text(g, "BODY GOES", 45, 58, C.yellow, { align: "center", outline: null });
      }
    }
  }
}

export const payoff: SceneFn = (g, t) => {
  if (t < CUT_C) street(g, t); else explain(g, t);
  if (t >= CUT_C - 3 && t < CUT_C + 3) { g.fillStyle = C.white; g.globalAlpha = Math.abs(1 - (t - (CUT_C - 3)) / 3) ; g.fillRect(0, 0, 90, 160); g.globalAlpha = 1; }
};

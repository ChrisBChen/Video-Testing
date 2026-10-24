import { C } from "../engine/palette";
import { G, rect, text, line, disc, ring } from "../engine/px";
import { SceneFn } from "./types";
import { drawTown } from "../art/town";
import { drawCar } from "../art/vehicles";
import { drawScientist, idle } from "../engine/scientist";
import { chip } from "../engine/ui";
import { spring, inv, lerp } from "../engine/ease";
import { shake } from "../engine/physics";

/**
 * CARS (18.6s - 24.4s). Brakes, steering and the throttle all work through tyre-road friction.
 * Shot 1: three failed controls. Shot 2: parked cars (and Dr. Pip) slide down a hill, all at the same rate.
 */
const CUT = 96;
const THETA = Math.atan(0.44), COS = Math.cos(THETA), SIN = Math.sin(THETA);
const hillY = (x: number) => 60 + 0.44 * x;

const stopSign = (g: G, x: number, y: number) => {
  rect(g, x, y, 1, 14, C.gray);
  disc(g, x, y - 1, 4, C.white); disc(g, x, y - 1, 3, C.red);
  rect(g, x - 2, y - 2, 5, 1, C.white);
};

function shot1(g: G, t: number) {
  drawTown(g, 0, "road", { clouds: t });
  stopSign(g, 56, 80);
  // car B: floors it, goes nowhere (wheels spin freely; no friction, no thrust)
  const jit = t % 4 < 2 ? 0 : 1;
  const blue = { color: C.blue, dark: C.blueD };
  for (let i = 0; i < 3; i++) rect(g, 3 - ((t * 1.5 + i * 4) % 10), 98 - i * 2, 3, 2, C.mist);
  drawCar(g, 24, 104 + (t > 30 ? jit * 0 : 0), { ...blue, wheel: t * 0.95, flip: false, face: "grit" });
  // car A: cruises past the stop sign at constant speed, brake lights on
  const ax = -30 + 44 * (t / 30);
  drawCar(g, ax, 99, { color: C.yellow, dark: C.yellowD, wheel: t * 0.45, brake: t > 18, face: t > 18 ? "panic" : "calm" });
  if (t > 18 && t < 60) { text(g, "!", ax + 4, 78, C.yellow, { align: "center" }); }
  // chips: what no longer works
  const wheel = (g: G, cx: number, cy: number) => { ring(g, cx, cy, 3, C.white, 1); const a = t * 0.4; line(g, cx, cy, cx + Math.cos(a) * 3, cy + Math.sin(a) * 3, C.white); line(g, cx, cy, cx - Math.cos(a) * 3, cy - Math.sin(a) * 3, C.white); };
  const brake = (g: G, cx: number, cy: number) => { disc(g, cx, cy, 3, C.lav); rect(g, cx - 1, cy - 1, 3, 3, C.plum); };
  const gas = (g: G, cx: number, cy: number) => { rect(g, cx - 2, cy - 3, 5, 6, C.lime); rect(g, cx - 2, cy + 1, 5, 2, C.greenD); };
  if (t >= 20) chip(g, 3, 33, 26, 16, brake, true, spring((t - 20) / 30, 14, 6));
  if (t >= 40) chip(g, 32, 33, 26, 16, wheel, true, spring((t - 40) / 30, 14, 6));
  if (t >= 56) chip(g, 61, 33, 26, 16, gas, true, spring((t - 56) / 30, 14, 6));
}

function shot2(g: G, t: number) {
  const u = Math.max(0, (t - 110) / 30);
  const s = 0.5 * 62 * u * u;                       // distance slid along the slope (px)
  const follow = 0.97 * s;
  drawTown(g, follow * COS * 0.6, "hill");
  // hill face (screen-stationary line; camera rides along the slope), texture scrolls
  const sc = follow * COS;
  for (let x = 0; x < 90; x++) {
    const y = Math.round(hillY(x));
    rect(g, x, y, 1, 3, C.grayD); rect(g, x, y, 1, 1, C.gray);
    rect(g, x, y + 3, 1, 1, C.mist);
    rect(g, x, y + 4, 1, 200, C.greenD);
    if (((x + Math.floor(sc)) * 5) % 13 === 0) rect(g, x, y + 7 + ((x * 3) % 5), 1, 2, C.green);
  }
  for (let k = -2; k < 12; k++) {
    const x = k * 14 - (sc % 14);
    rect(g, x, Math.round(hillY(x)) + 1, 6, 1, C.yellow);
  }
  // parked cars (then rolling): same acceleration for all
  const colors = [[C.red, C.redD], [C.teal, C.greenD], [C.orange, C.yellowD]];
  const xs = [10, 36, 62];
  const drift = (s - follow) * COS;
  for (let i = 0; i < 3; i++) {
    const x = xs[i] + drift;
    drawCar(g, x, hillY(x), { color: colors[i][0], dark: colors[i][1], rot: THETA, wheel: i * 1.3, brake: u === 0, face: u === 0 ? "calm" : "panic" });
  }
  // Dr. Pip stands on the slope... and slides with them
  const hx = 76 + drift, hy = hillY(hx) + 1;
  const sk = u > 0 ? shake(u, 0, 1) : { x: 0, y: 0 };
  drawScientist(g, {
    x: hx + sk.x, y: hy, flip: false, ...idle(t / 30),
    lean: u > 0 ? -2 : 0, eyes: u > 0.1 ? "wide" : "normal", mouth: u > 0.1 ? "o" : "flat", brow: u > 0.1 ? -1 : 0,
    lookX: -1, sweat: u > 0.3,
    handL: u > 0.15 ? [-8, -22] : undefined, handR: u > 0.15 ? [8, -22] : undefined,
  });
  if (t >= 98 && u === 0) text(g, "!", xs[2] + 8, hillY(xs[2]) - 24, C.yellow);
}

export const cars: SceneFn = (g, t) => {
  if (t < CUT) shot1(g, t); else shot2(g, t);
  if (t >= CUT && t < CUT + 3) { g.fillStyle = C.white; g.globalAlpha = 1 - (t - CUT) / 3; g.fillRect(0, 0, 90, 160); g.globalAlpha = 1; }
};

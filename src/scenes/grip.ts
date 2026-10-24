import { C } from "../engine/palette";
import { G, rect, text, line, disc, panel } from "../engine/px";
import { SceneFn } from "./types";
import { drawLab, FEET_Y } from "../art/lab";
import { drawScientist, idle } from "../engine/scientist";
import { drawDonut } from "../art/props";
import { bounceY, burst, bitPos, shake } from "../engine/physics";
import { spring, inv, lerp, easeOut, easeIn } from "../engine/ease";

/**
 * GRIP (24.4s - 29.4s). Holding, screwing and knotting all rely on friction.
 * Beats: donut slips through a pinch, shelf screws back out, shoelace unties, glasses slide off.
 */
const HX = 24;
const G_ = 380;
const shards = burst(21, 14, 40, 0.9);

function shelf(g: G, t: number) {
  const out0 = 54, out1 = 60;                  // frames the screws start backing out
  const gone0 = out0 + 16, gone1 = out1 + 16;  // frames they drop
  const SX = 47, SYY = 74, SW = 38;
  const release = Math.max(gone0, gone1);
  const ft = Math.max(0, (t - release) / 30);
  const floor = FEET_Y - 1;
  const fall = bounceY(0, 0, G_, floor - SYY - 2, 0.25, ft);
  const dy = ft > 0 ? fall.y : 0;
  const tilt = ft > 0 ? -0.18 * Math.min(1, ft * 3) * (fall.vy === 0 ? 0 : 1) : 0;
  // bracket holes
  const hole = (x: number) => { rect(g, x, SYY + 1, 3, 3, C.plum); };
  const screw = (x: number, start: number, gone: number) => {
    if (t >= gone) { return; }
    const u = Math.max(0, inv(start, gone, t));
    const e = u * 6;                                  // how far it has backed out toward the camera
    rect(g, x + 1 + e * 0.3, SYY + 3 + e * 0.6, 3, 2, C.ink);        // shadow
    disc(g, x + 1, SYY + 2, 1 + Math.round(e * 0.4), C.gray);
    const a = u * 14;
    line(g, x + 1 - Math.cos(a) * 1, SYY + 2 - Math.sin(a) * 1, x + 1 + Math.cos(a) * 1, SYY + 2 + Math.sin(a) * 1, C.grayD, 1);
  };
  hole(SX + 2); hole(SX + SW - 5);
  // falling screws
  for (const [x, gone] of [[SX + 3, gone0], [SX + SW - 4, gone1]] as const) if (t >= gone) {
    const f = (t - gone) / 30;
    const y = SYY + 3 + 0.5 * G_ * f * f; if (y < FEET_Y) disc(g, x, y, 1, C.gray);
  }
  // shelf + stuff on it (no friction: everything free-falls together)
  g.save(); g.translate(0, dy);
  g.translate(SX + SW, SYY); g.rotate(tilt); g.translate(-(SX + SW), -SYY);
  rect(g, SX, SYY, SW, 3, C.brown); rect(g, SX, SYY, SW, 1, "#b07a52"); rect(g, SX, SYY + 3, SW, 1, C.brownD);
  // potted plant
  rect(g, SX + 6, SYY - 5, 7, 5, C.orange); rect(g, SX + 6, SYY - 5, 7, 1, C.yellowD);
  rect(g, SX + 8, SYY - 12, 3, 7, C.green); rect(g, SX + 5, SYY - 10, 3, 3, C.lime); rect(g, SX + 11, SYY - 11, 3, 3, C.lime);
  // books
  rect(g, SX + 20, SYY - 4, 12, 4, C.blue); rect(g, SX + 21, SYY - 8, 10, 4, C.red); rect(g, SX + 22, SYY - 11, 8, 3, C.yellow);
  rect(g, SX + 21, SYY - 3, 10, 1, C.cyan);
  g.restore();
  screw(SX + 2, out0, gone0); screw(SX + SW - 5, out1, gone1);
  const impact = release + Math.sqrt((2 * (floor - SYY - 2)) / G_) * 30;
  if (t >= impact && t < impact + 22) {
    const lt = (t - impact) / 30;
    for (const b of shards) {
      const p = bitPos({ ...b, x0: SX + 12, y0: floor - 4 }, lt, 260, floor);
      rect(g, p.x, p.y, 1, 1, b.color === 0 ? C.orange : b.color === 1 ? C.green : C.brown);
    }
    text(g, "CRASH", SX + SW / 2, floor - 24 - lt * 12, C.yellow, { align: "center" });
  }
}

function lace(g: G, t: number) {
  const S = 82, E = 112, X = 47, Y = 32, W = 38, H = 30;
  if (t < S || t > E + 4) return;
  const pop = spring((t - S) / 30, 14, 6);
  g.save(); g.globalAlpha = Math.min(1, pop * 2);
  panel(g, X, Y + (1 - Math.min(1, pop)) * 6, W, H, C.plum, C.white);
  g.beginPath(); g.rect(X, Y, W, H); g.clip();
  const u = inv(S + 8, E - 2, t);
  const oy = Y + 14;
  // sneaker close-up
  rect(g, X + 3, oy + 8, 33, 3, C.white); rect(g, X + 3, oy + 11, 33, 1, C.ink);
  rect(g, X + 3, oy + 1, 13, 7, C.red); rect(g, X + 14, oy + 4, 22, 4, C.red); rect(g, X + 30, oy + 3, 6, 2, C.redD);
  rect(g, X + 3, oy + 1, 13, 2, C.redD); rect(g, X + 16, oy - 1, 7, 6, C.white);
  for (let i = 0; i < 3; i++) { rect(g, X + 17, oy + i * 2, 1, 1, C.ink); rect(g, X + 21, oy + i * 2, 1, 1, C.ink); }
  // lace: bow loosens, knot slides, lace falls out
  const loop = Math.max(0, 1 - u * 1.4);
  const kx = X + 19, ky = oy - 3;
  if (u < 0.85) {
    const r = 3 + loop * 3;
    for (const sgn of [-1, 1]) {
      const ex = kx + sgn * (r + 1), ey = ky - r * 0.4 + u * 3;
      line(g, kx, ky, ex, ey - 2, C.white, 1); line(g, ex, ey - 2, ex + sgn * 1, ey + 1, C.white, 1); line(g, ex + sgn * 1, ey + 1, kx, ky + 1, C.white, 1);
    }
    rect(g, kx - 1, ky, 2 + Math.round(u * 3), 2, C.mist);
    const tail = 3 + u * 9;
    line(g, kx, ky + 1, kx - 2 - u * 2, ky + tail, C.white, 1); line(g, kx + 1, ky + 1, kx + 4 + u * 3, ky + tail - 1, C.white, 1);
  } else {
    const f = (u - 0.85) / 0.15;
    for (let i = 0; i < 12; i++) rect(g, kx - 6 + i + (f * 3), ky + 2 + Math.round(Math.sin(i * 0.9 + f * 5) * 1) + f * (4 + i * 0.7), 1, 1, C.white);
  }
  if (u > 0.5) text(g, "OOPS!", X + W / 2, Y + 3, C.yellow, { align: "center", outline: null });
  g.restore();
}

export const grip: SceneFn = (g, t) => {
  const sk = shake(Math.max(0, (t - 76) / 30), 1.2, 7);
  g.save(); g.translate(sk.x, sk.y);
  drawLab(g, { clock: t });
  shelf(g, t);

  // --- donut slips through a pinch: grip needs friction ---
  const hold = 10, hy = FEET_Y - 22;
  const d = Math.max(0, (t - hold) / 30);
  const dn = bounceY(hy, 0, G_, FEET_Y - 4, 0.38, d);
  const dx = HX + 9;
  // --- glasses slide off the nose, too ---
  const gT = (t - 118);
  const glassesOff = gT > 8;
  const pose: any = {
    x: HX, y: FEET_Y, ...idle(t / 30),
    handR: [9, -22], handL: [-4, -9], lookX: 1,
    eyes: "normal", mouth: "smile", brow: 0,
  };
  if (t >= hold) { pose.lookY = 1; pose.eyes = "wide"; pose.mouth = "o"; pose.brow = -1; pose.handR = [9, -22 + Math.min(2, d * 8)]; }
  if (t >= 36) { pose.eyes = "normal"; pose.mouth = "frown"; pose.lookY = 0; pose.lookX = 1; pose.brow = -1; pose.handR = [5, -12]; }
  if (t >= 56) { pose.eyes = "wide"; pose.mouth = "gasp"; pose.lookX = 1; pose.lookY = -1; pose.brow = -1; pose.handL = [-6, -20]; }
  if (t >= 100) { pose.mouth = "frown"; pose.eyes = "closed"; pose.handL = [-4, -9]; }
  if (t >= 112) { pose.eyes = "normal"; pose.lookX = 0; pose.lookY = 0.5; pose.mouth = "flat"; pose.brow = -1; }
  if (glassesOff) { pose.noGlasses = true; pose.eyes = "squint"; pose.mouth = "frown"; pose.handL = [-6 + Math.sin(t * 0.5) * 3, -14 + Math.cos(t * 0.4) * 2]; pose.handR = [7 + Math.cos(t * 0.5) * 3, -14]; }
  drawScientist(g, pose);
  if (d <= 0) { rect(g, dx - 1, hy - 3, 2, 1, C.skin); rect(g, dx - 1, hy + 3, 2, 1, C.skin); }
  {
    drawDonut(g, dx, dn.y);
    if (t >= hold && t < hold + 14) text(g, "SLIP!", HX + 14, FEET_Y - 34, C.yellow, { outline: C.ink });
  }

  // glasses drop (they slid down the nose: nothing holds them)
  if (gT > 0) {
    const gx = HX + 1;
    if (gT <= 8) {
      const sl = gT * 0.9;
      rect(g, gx - 6, FEET_Y - 25 + sl, 12, 1, C.orange); rect(g, gx - 6, FEET_Y - 23 + sl, 12, 1, C.orange);
    } else {
      const f = (gT - 8) / 30;
      const gy = bounceY(FEET_Y - 18, 0, G_, FEET_Y - 1, 0.3, f).y;
      const gxx = gx + Math.min(5, f * 14);
      rect(g, gxx - 6, gy - 3, 5, 4, C.orange); rect(g, gxx + 1, gy - 3, 5, 4, C.orange);
      rect(g, gxx - 5, gy - 2, 3, 2, C.cyan); rect(g, gxx + 2, gy - 2, 3, 2, C.cyan);
    }
  }
  g.restore();
  lace(g, t);
};

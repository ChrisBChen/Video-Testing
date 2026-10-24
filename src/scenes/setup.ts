import { C } from "../engine/palette";
import { G, rect, text, line, panel, disc } from "../engine/px";
import { SceneFn } from "./types";
import { drawBlueprint, drawBench, FEET_Y } from "../art/lab";
import { drawScientist, idle } from "../engine/scientist";
import { easeInOut, easeOut, inv, lerp, spring, track } from "../engine/ease";
import { rng } from "../engine/physics";

/**
 * SETUP (3.4s - 12.8s). What friction is: surfaces are bumpy, bumps catch.
 * Then the rule of this experiment: solid-on-solid friction is off, air drag stays.
 */
const PX = 4, PY = 32, PW = 82, PH = 36;     // zoom panel
const SY = PY + PH - 6;                      // surface baseline
const P = 8;                                 // bump period
const BX0 = PX + 12, BW = 46;                // block start x, width
const FLATTEN = 128;                         // frame the scientist flips the switch
const PUSH2 = 150;                           // frame of the second push
const RULES = 204;

const tri = (u: number) => 1 - Math.abs(2 * (u - Math.floor(u)) - 1);

export const setup: SceneFn = (g, t) => {
  drawBlueprint(g);
  const amp = 4 * (1 - easeInOut(inv(FLATTEN, FLATTEN + 18, t)));

  // ---- zoom panel -------------------------------------------------------------------
  panel(g, PX, PY, PW, PH, C.ink, C.white);
  g.save(); g.beginPath(); g.rect(PX, PY, PW, PH); g.clip();
  rect(g, PX, PY, PW, PH, "#20244a");
  // block displacement: stuck (stick-slip) in phase A, free glide in phase B
  let dx = 0, rise = 0, vel = 0;
  if (t < FLATTEN) {
    const push = track(t, [[26, 0], [46, 1], [100, 1], [108, 0]], easeOut);
    dx = 3 * push + (push > 0.9 ? Math.sin(t * 2.4) * 0.5 : 0);
    dx = Math.max(0, dx);
    rise = dx * (2 * amp / P);
  } else if (t >= PUSH2) {
    const s = (t - PUSH2) / 30, v = 48, k = 0.15;
    dx = (v / k) * (1 - Math.exp(-k * s)); vel = v * Math.exp(-k * s);
  }
  // surface
  const bottom = PY + PH;
  for (let x = PX; x < PX + PW; x++) {
    const y = Math.round(SY - amp * tri((x - PX) / P));
    rect(g, x, y, 1, bottom - y, C.brown);
    rect(g, x, y, 1, 1, "#b07a52");
    if ((x * 7 + 3) % 11 === 0) rect(g, x, y + 3, 1, 1, C.brownD);
  }
  // block (mating bottom profile, shifted by dx and lifted by `rise`)
  const bx = BX0 + dx;
  for (let x = Math.ceil(bx); x < bx + BW; x++) {
    if (x < PX || x >= PX + PW) continue;
    const yb = Math.round(SY - rise - amp * tri((x - dx - PX) / P)) ;
    const top = Math.round(SY - rise - 4 - 14);
    rect(g, x, top, 1, yb - top, C.blue);
    rect(g, x, top, 1, 1, C.cyan);
    if (x === Math.ceil(bx) || x >= bx + BW - 1) rect(g, x, top, 1, yb - top, C.blueD);
  }
  rect(g, Math.round(bx) + 4, Math.round(SY - rise - 14), 6, 1, C.cyan);
  if (t < 56 || (t > 108 && t < FLATTEN + 14)) text(g, "x1000", PX + 3, PY + 3, C.lav, { outline: null });
  // forces + heat while the bumps catch
  if (t > 30 && t < 108) {
    const r = rng(Math.floor(t / 3) + 1);
    for (let k = 0; k < 5; k++) {
      const ax = bx + 6 + k * P, ay = SY - 3 - rise;
      rect(g, ax, ay, 3, 1, C.red); rect(g, ax, ay - 1, 1, 3, C.red);
      if (t > 46 && r() > 0.5) rect(g, ax + 1 + Math.floor(r() * 3), ay - 2 - Math.floor(r() * 3), 1, 1, C.yellow);
    }
    // the pushing arrow
    const ax = bx - 12 + Math.sin(t * 0.5) * 1;
    rect(g, ax, PY + 21, 7, 2, C.lime); rect(g, ax + 5, PY + 19, 1, 6, C.lime); rect(g, ax + 6, PY + 20, 1, 4, C.lime); rect(g, ax + 7, PY + 21, 1, 2, C.lime);
    if (t > 56) text(g, "STUCK!", PX + PW - 3, PY + 3, C.yellow, { align: "right", outline: null });
  }
  if (t >= FLATTEN + 14 && t < RULES) {
    text(g, "SMOOTH", PX + PW - 3, PY + 3, C.lime, { align: "right", outline: null });
  }
  if (t >= PUSH2 - 4 && t < PUSH2 + 8) {
    rect(g, PX + 2, PY + 21, 7, 2, C.lime); rect(g, PX + 7, PY + 19, 1, 6, C.lime); rect(g, PX + 8, PY + 20, 1, 4, C.lime); rect(g, PX + 9, PY + 21, 1, 2, C.lime);
  }
  // rules card (replaces the zoom view)
  if (t >= RULES) {
    const k = Math.min(1, (t - RULES) / 6);
    rect(g, PX, PY, PW, PH, C.plum);
    const row = (y: number, ok: boolean, label: string, at: number) => {
      if (t < at) return;
      const pop = spring((t - at) / 30, 14, 6);
      const yy = y + (1 - pop) * 4;
      if (ok) { line(g, PX + 5, yy + 4, PX + 7, yy + 6, C.lime, 2); line(g, PX + 8, yy + 5, PX + 12, yy, C.lime, 2); }
      else { line(g, PX + 5, yy, PX + 11, yy + 6, C.red, 2); line(g, PX + 11, yy, PX + 5, yy + 6, C.red, 2); }
      text(g, label, PX + 16, yy, ok ? C.white : C.mist, { outline: null });
      if (!ok) rect(g, PX + 16, yy + 3, 64, 1, C.red);
    };
    row(PY + 5, false, "SNAGGING", RULES + 2);
    row(PY + 22, true, "AIR DRAG", RULES + 24);
    if (t > RULES + 26) for (let i = 0; i < 3; i++) rect(g, PX + 70 - ((t * 2 + i * 9) % 26), PY + 26 + i * 3, 6, 1, C.skyL);
    void k;
  }
  g.restore();

  // ---- the real block on the bench, with a zoom cone ---------------------------------
  drawBench(g, 46, { w: 40, console: false });
  const real = 54 + (t >= PUSH2 ? Math.min(40, ((t - PUSH2) / 30) * 13) : 0);
  const fall = real > 80 ? (real - 80) : 0;
  const ry = 89 - 4 + (fall > 0 ? Math.min(14, 0.5 * 380 * Math.pow(fall / 13, 2)) : 0);
  if (t < FLATTEN + 6) {
    for (let i = 0; i < 12; i++) if (i % 2 === 0) { rect(g, 58 + (PX + 20 - 58) * (i / 12), 85 + (PY + PH + 1 - 85) * (i / 12), 1, 1, C.lav); rect(g, 62 + (PX + 64 - 62) * (i / 12), 85 + (PY + PH + 1 - 85) * (i / 12), 1, 1, C.lav); }
  }
  rect(g, real, ry, 7, 4, C.blue); rect(g, real, ry, 7, 1, C.cyan); rect(g, real, ry + 3, 7, 1, C.blueD);
  // lever
  const lever = track(t, [[FLATTEN - 6, -1], [FLATTEN, 1]], easeOut);
  rect(g, 50, 87, 6, 2, C.grayD);
  line(g, 53, 87, 53 + lever * 3, 82, C.red, 2);
  if (t >= FLATTEN && t < FLATTEN + 18) text(g, "CLICK!", 66, 74 - (t - FLATTEN) * 0.3, C.yellow, { align: "center" });

  // ---- Dr. Pip -----------------------------------------------------------------------
  const switching = t >= FLATTEN - 8 && t < FLATTEN + 6;
  const talk = Math.floor(t / 6) % 2;
  drawScientist(g, {
    x: 34, y: FEET_Y, ...idle(t / 30),
    lean: switching ? 3 : 0,
    handR: switching ? [11, -12 + (t - FLATTEN) * 0.3] : [9, -26],
    handL: [-4, -9],
    eyes: t > FLATTEN + 8 && t < FLATTEN + 40 ? "happy" : "normal", lookX: 1, lookY: switching ? 0.5 : -1,
    mouth: switching ? "grin" : talk ? "smile" : "grin", brow: switching ? 1 : 0,
  });
  // pointer stick
  if (!switching) { line(g, 43, 78, 55 + Math.sin(t * 0.3), 70, C.yellowD, 1); rect(g, 55, 69, 2, 2, C.red); }
};

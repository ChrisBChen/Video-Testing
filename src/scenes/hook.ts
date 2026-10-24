import { C } from "../engine/palette";
import { G, rect, text, line, disc } from "../engine/px";
import { SceneFn } from "./types";
import { drawLab, drawBench, FEET_Y } from "../art/lab";
import { drawScientist, idle } from "../engine/scientist";
import { drawMug } from "../art/props";
import { easeOut, track, clamp, spring } from "../engine/ease";
import { burst, bitPos, shake } from "../engine/physics";

const PRESS = 3;                       // frame the fist lands
const TABLE_X0 = 24, TABLE_V = -24;    // bench slides left (world px/s)
const SCI_X0 = 60, SCI_V = 7;         // Dr. Pip recoils right: equal and opposite momentum
const MUG_X = 34, MUG_G = 380;
const TABLE_W = 30;
const shards = burst(7, 11, 36, 0.8);

export const hook: SceneFn = (g, t) => {
  const ts = Math.max(0, (t - PRESS) / 30);
  const sk = shake(ts, 1.4, 7);
  g.save(); g.translate(sk.x, sk.y);
  drawLab(g, { clock: t });

  const tableX = TABLE_X0 + TABLE_V * ts;
  const sciX = SCI_X0 + SCI_V * ts;
  const tableRight = tableX + TABLE_W;
  drawBench(g, tableX, { pressed: t < PRESS + 4 });

  // mug: stays put while the bench leaves (tablecloth-trick inertia), then falls straight down
  const clearT = (TABLE_X0 + TABLE_W - MUG_X) / -TABLE_V;
  const fallT = ts - clearT;
  const hitT = Math.sqrt((2 * (FEET_Y - 1 - 89)) / MUG_G);
  if (fallT < hitT) {
    const y = fallT > 0 ? 89 + 0.5 * MUG_G * fallT * fallT : 89;
    drawMug(g, MUG_X, y, { face: fallT > -0.15 ? "worried" : "calm", steam: fallT > 0 ? undefined : t, rot: fallT > 0 ? fallT * 4 : 0 });
  } else {
    const lt = fallT - hitT;
    const pw = Math.min(8, Math.round(lt * 22));
    rect(g, MUG_X - pw, FEET_Y - 1, pw * 2, 1, C.brownD);
    for (const b of shards) {
      const p = bitPos({ ...b, x0: MUG_X, y0: FEET_Y - 2 }, lt, 260, FEET_Y);
      rect(g, p.x, p.y, 1, 1, b.color === 0 ? C.white : b.color === 1 ? C.mist : C.brownD);
    }
    if (lt < 0.3) text(g, "CRASH", MUG_X - 20, FEET_Y - 22 - lt * 14, C.yellow, { outline: C.ink });
  }

  // Dr. Pip: fist on the button, then recoils, windmilling arms, feet frozen in place
  const spin = ts * 14;
  const pressing = t < PRESS + 6;
  drawScientist(g, {
    x: sciX, y: FEET_Y, flip: true, ...idle(0),
    lean: pressing ? 3 : track(ts, [[0.1, 3], [0.4, -4], [1.0, -2]], easeOut),
    handR: pressing ? [9, -22] : [6 + Math.cos(spin) * 7, -17 + Math.sin(spin) * 7],
    handL: pressing ? [-2, -9] : [-4 + Math.cos(spin + 3) * 7, -17 + Math.sin(spin + 3) * 7],
    eyes: ts < 0.08 ? "squint" : "wide", mouth: ts < 0.08 ? "grin" : "yell",
    brow: ts < 0.08 ? 1 : -1, sweat: ts > 0.25, lookX: -1,
  });
  // speed lines behind the sliding scientist (nothing rubs, so nothing slows him)
  if (ts > 0.15) for (let i = 0; i < 3; i++) rect(g, sciX - 12 - 6 - ((t * 2 + i * 5) % 5), 76 + i * 8, 6 + i * 2, 1, C.mist);
  g.restore();

  if (t < 3) { g.fillStyle = C.white; g.globalAlpha = 1 - t / 3; g.fillRect(0, 0, 90, 160); g.globalAlpha = 1; }
  if (t >= 2 && t < 72) {
    const k = spring((t - 2) / 30, 14, 6);
    g.globalAlpha = t > 58 ? 1 - (t - 58) / 14 : 1;
    text(g, "FRICTION", 45, 33 + 4 - k * 4, C.yellow, { align: "center", outline: C.ink, shadow: C.redD });
    text(g, "OFF!", 45, 45 + 4 - k * 4, C.red, { size: 16, align: "center", outline: C.ink, shadow: C.redD });
    g.globalAlpha = 1;
  }
  if (t >= 74) {
    // one-line tagline that swaps: it needs to stay clear of Dr. Pip sliding past
    const second = t >= 90;
    const k = spring((t - (second ? 90 : 74)) / 30, 14, 6);
    text(g, second ? "ZERO GRIP" : "30 SECONDS", 45, 61 + (1 - k) * 5, second ? C.white : C.yellow, { align: "center", shadow: second ? C.plum : C.redD });
  }
};

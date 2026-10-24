import { C } from "../engine/palette";
import { G, rect, disc, checker } from "../engine/px";
import { rng } from "../engine/physics";

export type TownMode = "sidewalk" | "road" | "hill";
export const ROAD_FEET = 104;

const skyline = (() => { const r = rng(5); return Array.from({ length: 30 }, () => ({ w: 6 + Math.floor(r() * 8), h: 14 + Math.floor(r() * 26) })); })();
const blocks = (() => { const r = rng(11); return Array.from({ length: 24 }, (_, i) => ({ w: 16 + Math.floor(r() * 10), h: 22 + Math.floor(r() * 16), c: [C.lav, C.violet, "#6a60a8"][i % 3], awn: r() > 0.5 })); })();

/** Parallax street. camX scrolls the world to the right (positive = camera moves right). */
export function drawTown(g: G, camX = 0, mode: TownMode = "road", o: { clouds?: number } = {}) {
  rect(g, 0, 0, 90, 72, C.sky); rect(g, 0, 30, 90, 22, "#97d4f8"); rect(g, 0, 52, 90, 30, C.skyL);
  disc(g, 70, 40, 7, C.yellow); disc(g, 70, 40, 5, "#fff2a8");
  // clouds (slow parallax + gentle drift)
  const cl = (o.clouds ?? 0) * 0.05 + camX * 0.08;
  for (const [cx, cy, w] of [[10, 36, 16], [44, 56, 20], [80, 30, 14], [112, 48, 18]]) {
    const x = ((cx - cl) % 140 + 140) % 140 - 25;
    rect(g, x, cy, w, 4, C.white); rect(g, x + 3, cy - 3, w - 8, 3, C.white);
  }
  // far skyline
  let x = -((camX * 0.2) % 400);
  for (let i = 0; x < 100; i++) { const b = skyline[i % skyline.length]; if (x + b.w > -10) { rect(g, x, 76 - b.h, b.w, b.h, "#a9b6e6"); rect(g, x, 76 - b.h, b.w, 1, "#c9d2f2"); } x += b.w; }
  // mid blocks (shop fronts)
  x = -((camX * 0.45) % 500);
  for (let i = 0; x < 100; i++) {
    const b = blocks[i % blocks.length];
    if (x + b.w > -4) {
      const top = 82 - b.h;
      rect(g, x, top, b.w, b.h, b.c); rect(g, x, top, b.w, 1, C.mist);
      for (let wy = top + 4; wy < 70; wy += 8) for (let wx = x + 3; wx < x + b.w - 3; wx += 6) { rect(g, wx, wy, 3, 4, C.cyan); rect(g, wx, wy + 3, 3, 1, C.sky); }
      rect(g, x + (b.w >> 1) - 2, 74, 4, 8, C.brownD);
      if (b.awn) for (let k = 0; k < b.w; k += 2) rect(g, x + k, 70, 2, 3, (k >> 1) % 2 ? C.red : C.white);
      rect(g, x + b.w - 1, top, 1, b.h, C.ink);
    }
    x += b.w;
  }
  if (mode === "hill") return;
  if (mode === "road") {
    rect(g, 0, 82, 90, 6, C.mist); rect(g, 0, 87, 90, 1, C.lav);               // sidewalk behind
    rect(g, 0, 88, 90, 17, C.grayD); rect(g, 0, 88, 90, 1, C.gray);              // road
    const off = ((camX * 1.0) % 20 + 20) % 20;
    for (let lx = -20 - off; lx < 100; lx += 20) rect(g, lx, 96, 10, 1, C.yellow);
    rect(g, 0, 105, 90, 3, C.mist); rect(g, 0, 105, 90, 1, C.white);             // curb
    rect(g, 0, 108, 90, 60, C.greenD);
    for (let gx = -((camX) % 8); gx < 90; gx += 8) rect(g, gx, 110 + ((gx * 7) & 7), 1, 2, C.green);
  } else {
    rect(g, 0, 82, 90, 4, C.mist);
    rect(g, 0, 86, 90, 8, C.grayD); rect(g, 0, 86, 90, 1, C.gray);              // distant road
    const off = ((camX * 1.0) % 20 + 20) % 20;
    for (let lx = -20 - off; lx < 100; lx += 20) rect(g, lx, 90, 8, 1, C.yellow);
    rect(g, 0, 94, 90, 3, C.mist); rect(g, 0, 97, 90, 15, C.cream);              // sidewalk (hero's stage)
    for (let sx = -((camX) % 14); sx < 100; sx += 14) rect(g, sx, 97, 1, 15, "#d9c9a6");
    rect(g, 0, 112, 90, 3, C.mist); rect(g, 0, 115, 90, 60, C.greenD);
    for (let gx = -((camX) % 8); gx < 90; gx += 8) rect(g, gx, 117 + ((gx * 7) & 7), 1, 2, C.green);
  }
}

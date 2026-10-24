import { C } from "../engine/palette";
import { G, rect, line, disc, text, panel } from "../engine/px";

export const LAB_FLOOR = 102;   // wall/floor seam
export const FEET_Y = 104;      // where standing characters' feet sit

/** The lab: home base of the series. Authored on the 90x160 world grid. */
export function drawLab(g: G, o: { clock?: number } = {}) {
  rect(g, -20, 0, 130, LAB_FLOOR, C.violet);
  rect(g, -20, 70, 130, 32, "#3d3170");
  rect(g, -20, 70, 130, 1, C.plum);
  // window onto the city
  panel(g, 5, 34, 22, 24, C.sky, C.ink);
  rect(g, 5, 50, 22, 8, C.skyL);
  for (const [x, h] of [[7, 10], [12, 15], [17, 9], [22, 13]]) rect(g, x, 58 - h, 4, h, C.blueD);
  rect(g, 6, 47, 1, 1, C.yellow); rect(g, 13, 45, 1, 1, C.yellow); rect(g, 23, 49, 1, 1, C.yellow);
  rect(g, 15, 34, 1, 24, C.ink); rect(g, 5, 45, 22, 1, C.ink);
  rect(g, 3, 58, 26, 2, C.mist);
  // chalkboard
  panel(g, 50, 34, 34, 22, "#1f3a3a", C.brownD);
  text(g, "F=?N", 53, 38, C.white, { outline: null });
  rect(g, 54, 48, 18, 1, C.white); rect(g, 54, 51, 12, 1, C.mist);
  rect(g, 74, 55, 6, 1, C.yellow);
  // wall clock
  disc(g, 38, 44, 4, C.ink); disc(g, 38, 44, 3, C.white);
  const a = (o.clock ?? 0) * 0.2;
  line(g, 38, 44, 38 + Math.round(Math.sin(a) * 2), 44 - Math.round(Math.cos(a) * 2), C.ink);
  rect(g, 39, 44, 2, 1, C.ink);
  // floor
  rect(g, -20, LAB_FLOOR, 130, 60, C.lav);
  rect(g, -20, LAB_FLOOR, 130, 1, C.mist);
  for (let y = LAB_FLOOR + 1, i = 0; y < 165; y += 5 + i * 2, i++) {
    rect(g, -20, y, 130, 1, C.violet);
    for (let x = -20 + ((i & 1) * 12); x < 110; x += 24) rect(g, x, y, 1, 5 + i * 2, C.violet);
  }
}

/** Lab bench with the big red button console (right end). `x` is the left edge. */
export function drawBench(g: G, x: number, o: { pressed?: boolean; w?: number; console?: boolean } = {}) {
  const w = o.w ?? 30, top = 89;
  rect(g, x, top, w, 2, C.brown); rect(g, x, top, w, 1, "#b07a52");
  rect(g, x + 1, top + 2, w - 2, 4, C.brownD);
  rect(g, x + 1, top + 6, 2, 7, C.brownD); rect(g, x + w - 3, top + 6, 2, 7, C.brownD);
  rect(g, x + 4, top + 3, 8, 2, C.brown); rect(g, x + 7, top + 4, 2, 1, C.yellow);
  rect(g, x + 14, top + 3, 8, 2, C.brown); rect(g, x + 17, top + 4, 2, 1, C.yellow);
  if (o.console === false) return;
  // console + big red button
  const cx = x + w - 11;
  rect(g, cx, top - 4, 9, 4, C.grayD); rect(g, cx, top - 4, 9, 1, C.gray);
  rect(g, cx + 1, top - 3, 1, 1, C.lime); rect(g, cx + 2, top - 3, 1, 1, C.yellow);
  const bt = o.pressed ? 1 : 0;
  rect(g, cx + 4, top - 6 + bt, 4, 2 - bt, C.red); rect(g, cx + 3, top - 5 + bt, 6, 1, C.redD);
  rect(g, cx + 4, top - 6 + bt, 1, 1, C.pink);
}

/** Explainer-mode backdrop: blueprint dots and a plain floor strip. */
export function drawBlueprint(g: G, floor = LAB_FLOOR) {
  rect(g, -20, 0, 130, 160, C.plum);
  for (let y = 4; y < floor; y += 6) for (let x = 2; x < 90; x += 6) rect(g, x, y, 1, 1, C.violet);
  rect(g, -20, floor, 130, 60, C.violet);
  rect(g, -20, floor, 130, 1, C.lav);
  for (let y = floor + 6; y < 165; y += 8) rect(g, -20, y, 130, 1, C.plum);
}

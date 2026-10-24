import { C } from "./palette";
import { G, rect, line, panel, ring, disc } from "./px";

/** Red "no" cross used across the series for things that stop working. */
export function xMark(g: G, cx: number, cy: number, r = 4, c: string = C.red) {
  line(g, cx - r, cy - r, cx + r, cy + r, c, 2);
  line(g, cx + r, cy - r, cx - r, cy + r, c, 2);
}

/** Small icon chip with a status mark. `bad` chips show a red cross over the icon. */
export function chip(g: G, x: number, y: number, w: number, h: number, icon: (g: G, cx: number, cy: number) => void, bad = true, pop = 1) {
  const oy = (1 - Math.min(1, pop)) * 6;
  g.save(); g.globalAlpha = Math.min(1, pop * 1.5);
  panel(g, x, y + oy, w, h, C.plum, C.white);
  icon(g, x + w / 2, y + oy + h / 2);
  if (bad) {
    const cx = x + w / 2, cy = y + oy + h / 2;
    ring(g, cx, cy, 6, C.red, 2);
    line(g, cx - 4, cy + 4, cx + 4, cy - 4, C.red, 2);
  }
  g.restore();
}

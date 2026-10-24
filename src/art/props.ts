import { C } from "../engine/palette";
import { G, rect, sprite, disc } from "../engine/px";

export type MugFace = "calm" | "worried" | "dead";

/** Coffee mug with a tiny face (the series' running gag: the mug always knows first). x,y = bottom centre. */
export function drawMug(g: G, x: number, y: number, o: { face?: MugFace; steam?: number; rot?: number } = {}) {
  sprite(g, "mug", 24, 24, 12, 18, (s) => {
    rect(s, -4, -8, 8, 8, C.white); rect(s, 2, -8, 2, 8, C.mist);
    rect(s, 4, -6, 3, 4, C.white); rect(s, 5, -5, 1, 2, C.violet);
    rect(s, -4, -8, 8, 1, C.brownD);
    const f = o.face ?? "calm";
    rect(s, -3, -6, 1, 1, C.ink); rect(s, 1, -6, 1, 1, C.ink);
    if (f === "worried") { rect(s, -1, -4, 2, 2, C.ink); rect(s, -3, -7, 1, 1, C.ink); rect(s, 1, -7, 1, 1, C.ink); }
    else if (f === "dead") { rect(s, -3, -4, 4, 1, C.ink); }
    else { rect(s, -2, -3, 3, 1, C.ink); }
  }, x, y, { rot: o.rot, pivotX: 0, pivotY: -4 });
  if (o.steam !== undefined) {
    const t = o.steam;
    for (let i = 0; i < 2; i++) rect(g, x - 2 + i * 3, y - 11 - ((t * 0.12 + i * 3) % 6), 1, 2, C.mist);
  }
}

export function drawDonut(g: G, x: number, y: number, rot = 0) {
  sprite(g, "donut", 24, 24, 12, 12, (s) => {
    disc(s, 0, 0, 5, C.brown); disc(s, 0, -1, 5, C.pink); disc(s, 0, 0, 1, C.violet);
    rect(s, -3, -3, 1, 1, C.yellow); rect(s, 2, -2, 1, 1, C.white); rect(s, -1, 2, 1, 1, C.lime); rect(s, 3, 1, 1, 1, C.yellow); rect(s, -4, 1, 1, 1, C.white);
  }, x, y, { rot });
}

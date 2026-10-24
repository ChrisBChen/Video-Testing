import { G, W, H, layer } from "./px";
import { SCENES, TRANSITIONS, sceneIndexAt } from "./timeline";
import { SCENE_FNS } from "../scenes";
import { drawHud } from "./hud";
import { rng } from "./physics";
import { C } from "./palette";

const CELL = 6;
const maskCache = new Map<string, number[]>();
/** Per-cell reveal threshold in [0,1) for a transition kind. */
function mask(kind: string): number[] {
  const cols = Math.ceil(W / CELL), rows = Math.ceil(H / CELL);
  let m = maskCache.get(kind);
  if (m) return m;
  const rn = rng(99);
  m = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const cx = i / cols - 0.5, cy = j / rows - 0.5;
    if (kind === "iris") m.push(Math.min(1, Math.hypot(cx * 1.0, cy * 0.56) / 0.62));
    else if (kind === "wipe") m.push(((i / cols) * 0.8 + ((j % 2) * 0.04) + rn() * 0.04));
    else m.push(rn());
  }
  maskCache.set(kind, m);
  return m;
}

function drawScene(g: G, idx: number, f: number) {
  const sc = SCENES[Math.min(idx, SCENES.length - 1)];
  const fn = SCENE_FNS[sc.id];
  g.save();
  g.imageSmoothingEnabled = false;
  g.scale(2, 2);
  if (fn) fn(g, f - sc.from, f);
  else { g.fillStyle = C.plum; g.fillRect(0, 0, W, H); }
  g.restore();
}

export function renderFrame(g: G, f: number) {
  g.imageSmoothingEnabled = false;
  const idx = sceneIndexAt(f);
  drawScene(g, idx, f);
  const tr = TRANSITIONS.find((t) => f >= t.at && f < t.at + t.dur);
  if (tr && idx > 0) {
    // outgoing scene keeps playing underneath the reveal
    const { c, g: lg } = layer("trans", W, H);
    drawScene(lg, idx - 1, f);
    const p = (f - tr.at + 1) / (tr.dur + 1);
    const m = mask(tr.kind);
    const cols = Math.ceil(W / CELL);
    for (let k = 0; k < m.length; k++) {
      if (m[k] > p) {
        const x = (k % cols) * CELL, y = Math.floor(k / cols) * CELL;
        g.drawImage(c, x, y, CELL, CELL, x, y, CELL, CELL);
      }
    }
  }
  drawHud(g, f);
}

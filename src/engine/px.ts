import { C } from "./palette";

/** Logical pixel grid. It renders at 6x to 1080x1920 with nearest-neighbour scaling. */
export const W = 180;
export const H = 320;
export const SCALE = 6;
/** Scene authors work on a coarser 90x160 world grid (each world pixel = 2x2 canvas px = 12 screen px). */
export const WW = 90;
export const WH = 160;
export type G = CanvasRenderingContext2D;

const r = Math.round;

export const rect = (g: G, x: number, y: number, w: number, h: number, c: string) => {
  g.fillStyle = c;
  g.fillRect(r(x), r(y), r(w), r(h));
};

/** Bresenham line with a square brush: the only way we draw diagonals, so edges stay crisp. */
export function line(g: G, x0: number, y0: number, x1: number, y1: number, c: string, t = 1) {
  x0 = r(x0); y0 = r(y0); x1 = r(x1); y1 = r(y1);
  g.fillStyle = c;
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (let i = 0; i < 2000; i++) {
    g.fillRect(x0, y0, t, t);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

export function disc(g: G, cx: number, cy: number, rad: number, c: string) {
  g.fillStyle = c;
  cx = r(cx); cy = r(cy);
  for (let y = -rad; y <= rad; y++) {
    const w = Math.floor(Math.sqrt(rad * rad + rad * 0.8 - y * y));
    g.fillRect(cx - w, cy + y, w * 2 + 1, 1);
  }
}

export function ring(g: G, cx: number, cy: number, rad: number, c: string, t = 1) {
  g.fillStyle = c;
  cx = r(cx); cy = r(cy);
  for (let y = -rad; y <= rad; y++) for (let x = -rad; x <= rad; x++) {
    const d = Math.sqrt(x * x + y * y);
    if (d <= rad + 0.4 && d > rad - t + 0.4) g.fillRect(cx + x, cy + y, 1, 1);
  }
}

/** Rectangle with the corner pixels clipped: the pixel-art "rounded rect". */
export function pill(g: G, x: number, y: number, w: number, h: number, c: string) {
  x = r(x); y = r(y); w = r(w); h = r(h);
  g.fillStyle = c;
  g.fillRect(x + 1, y, w - 2, h);
  g.fillRect(x, y + 1, w, h - 2);
}

/** 1px ink outline around a pill with fill. */
export function panel(g: G, x: number, y: number, w: number, h: number, fill: string, edge: string = C.ink) {
  pill(g, x - 1, y - 1, w + 2, h + 2, edge);
  pill(g, x, y, w, h, fill);
}

export function checker(g: G, x: number, y: number, w: number, h: number, c: string, phase = 0) {
  g.fillStyle = c;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (((i + j + phase) & 1) === 0) g.fillRect(x + i, y + j, 1, 1);
}

export const FONT = '"PressStart2P"';
export interface TextOpts { size?: number; align?: "left" | "center" | "right"; outline?: string | null; shadow?: string | null }
/** Bitmap text from the 8px grid font. Keep size at multiples of 8 for clean pixels. */
export function text(g: G, s: string, x: number, y: number, c: string, o: TextOpts = {}) {
  const size = o.size ?? 8;
  g.font = `${size}px ${FONT}`;
  g.textBaseline = "top";
  g.textAlign = o.align ?? "left";
  x = r(x); y = r(y);
  const outline = o.outline === undefined ? C.ink : o.outline;
  if (outline) {
    g.fillStyle = outline;
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]]) g.fillText(s, x + dx, y + dy);
  }
  if (o.shadow) { g.fillStyle = o.shadow; g.fillText(s, x, y + 1); }
  g.fillStyle = c;
  g.fillText(s, x, y);
}
export const textWidth = (g: G, s: string, size = 8) => { g.font = `${size}px ${FONT}`; return g.measureText(s).width; };

const layers = new Map<string, HTMLCanvasElement>();
/** Reusable offscreen canvas (nearest-neighbour, cleared on fetch). */
export function layer(key: string, w: number, h: number): { c: HTMLCanvasElement; g: G } {
  let c = layers.get(key);
  if (!c || c.width !== w || c.height !== h) {
    c = document.createElement("canvas"); c.width = w; c.height = h; layers.set(key, c);
  }
  const g = c.getContext("2d", { willReadFrequently: false })!;
  g.imageSmoothingEnabled = false;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, w, h);
  return { c, g };
}

/**
 * Draws a small sprite with a 1px ink outline, optional mirror and nearest-neighbour rotation
 * (so rotated sprites stay pixel-crisp). `draw` paints around the sprite's own origin (ox, oy).
 */
export function sprite(
  g: G, key: string, w: number, h: number, ox: number, oy: number,
  draw: (s: G) => void,
  x: number, y: number, opt: { rot?: number; flip?: boolean; pivotX?: number; pivotY?: number; outline?: boolean; alpha?: number; scale?: number } = {},
) {
  const { c: base, g: s } = layer(key + ":base", w, h);
  s.translate(ox, oy);
  draw(s);
  s.setTransform(1, 0, 0, 1, 0, 0);
  let src: HTMLCanvasElement = base;
  if (opt.outline !== false) {
    const { c: out, g: o } = layer(key + ":out", w, h);
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) o.drawImage(base, dx, dy);
    o.globalCompositeOperation = "source-in";
    o.fillStyle = C.ink; o.fillRect(0, 0, w, h);
    o.globalCompositeOperation = "source-over";
    o.drawImage(base, 0, 0);
    src = out;
  }
  g.save();
  g.imageSmoothingEnabled = false;
  if (opt.alpha !== undefined) g.globalAlpha = opt.alpha;
  g.translate(r(x), r(y));
  const px = (opt.pivotX ?? 0), py = (opt.pivotY ?? 0);
  if (opt.rot) { g.translate(px, py); g.rotate(opt.rot); g.translate(-px, -py); }
  if (opt.flip) g.scale(-1, 1);
  const sc = opt.scale ?? 1;
  if (sc !== 1) g.scale(sc, sc);
  g.drawImage(src, -ox, -oy);
  g.restore();
}

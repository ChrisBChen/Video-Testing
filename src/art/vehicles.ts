import { C } from "../engine/palette";
import { G, rect, disc, sprite, ring, line } from "../engine/px";

export interface CarOpts {
  color?: string; dark?: string; rot?: number; wheel?: number; brake?: boolean; flip?: boolean;
  face?: "calm" | "panic" | "grit"; squash?: number; alpha?: number; pivotY?: number;
}
/** Chunky pixel car. (x,y) = bottom-centre of the chassis between the wheels. */
export function drawCar(g: G, x: number, y: number, o: CarOpts = {}) {
  const col = o.color ?? C.yellow, dark = o.dark ?? C.yellowD;
  sprite(g, "car", 56, 40, 28, 32, (s) => {
    // body
    rect(s, -15, -9, 30, 6, col); rect(s, -16, -8, 32, 4, col);
    rect(s, -15, -4, 30, 1, dark); rect(s, -16, -5, 1, 1, dark);
    rect(s, -8, -14, 17, 6, col); rect(s, -7, -15, 15, 1, col); rect(s, -7, -9, 15, 1, dark);
    // windows + driver
    rect(s, -6, -14, 6, 5, C.cyan); rect(s, 1, -14, 6, 5, C.cyan); rect(s, -6, -14, 1, 1, C.white);
    const f = o.face ?? "calm";
    rect(s, 3, -13, 3, 4, C.skin); rect(s, 3, -13, 3, 1, C.white);
    rect(s, 4, -12, 1, 1, C.ink); rect(s, 6, -12, 1, 1, C.ink);
    if (f === "panic") { rect(s, 4, -10, 1, 1, C.ink); rect(s, 3, -14, 1, 1, C.ink); } else rect(s, 4, -10, 2, 1, C.ink);
    // lights
    rect(s, 14, -8, 2, 2, C.white); rect(s, -16, -8, 2, 2, o.brake ? C.red : C.redD);
    if (o.brake) { rect(s, -18, -9, 1, 4, C.red); }
    rect(s, -16, -5, 32, 1, C.grayD);
    // wheels
    for (const wx of [-9, 9]) {
      disc(s, wx, -3, 3, C.ink);
      disc(s, wx, -3, 1, C.gray);
      const a = o.wheel ?? 0;
      s.fillStyle = C.grayL;
      s.fillRect(Math.round(wx + Math.cos(a) * 2), Math.round(-3 + Math.sin(a) * 2), 1, 1);
      s.fillRect(Math.round(wx - Math.cos(a) * 2), Math.round(-3 - Math.sin(a) * 2), 1, 1);
    }
  }, x, y, { rot: o.rot, flip: o.flip, pivotX: 0, pivotY: o.pivotY ?? 0, alpha: o.alpha, scale: 1 });
}

export function drawCart(g: G, x: number, y: number, o: { items?: boolean; squash?: number } = {}) {
  sprite(g, "cart", 48, 40, 24, 34, (s) => {
    rect(s, -10, -12, 20, 9, C.white); rect(s, -10, -12, 20, 1, C.mist);
    rect(s, -10, -5, 20, 2, C.red);
    rect(s, -11, -13, 22, 2, C.redD);
    // umbrella
    rect(s, 0, -26, 1, 14, C.grayD);
    for (let i = -10; i < 10; i += 2) rect(s, i, -27 + Math.floor(Math.abs(i) / 5), 2, 3, ((i / 2) & 1) ? C.red : C.white);
    rect(s, -8, -10, 6, 1, C.mist);
    disc(s, -6, -2, 2, C.ink); disc(s, 6, -2, 2, C.ink);
    rect(s, -3, -14, 3, 1, C.orange); rect(s, 3, -14, 3, 1, C.orange);
  }, x, y, { scale: 1 });
}

export function drawHotdog(g: G, x: number, y: number, rot = 0) {
  sprite(g, "hotdog", 16, 16, 8, 8, (s) => {
    rect(s, -3, -1, 7, 3, C.orange); rect(s, -3, 0, 7, 1, C.red); rect(s, -4, 0, 1, 1, C.red); rect(s, 4, 0, 1, 1, C.red);
    rect(s, -2, -1, 5, 1, C.yellow);
  }, x, y, { rot });
}

export function drawPigeon(g: G, x: number, y: number, flap: number) {
  sprite(g, "pigeon", 32, 24, 16, 14, (s) => {
    rect(s, -5, -3, 9, 5, C.gray); rect(s, -4, -1, 7, 3, C.grayL); rect(s, -7, -3, 3, 2, C.grayD);
    rect(s, 3, -6, 4, 4, C.gray); rect(s, 7, -5, 2, 1, C.orange); rect(s, 5, -5, 1, 1, C.ink); rect(s, 3, -3, 3, 1, C.violet);
    rect(s, -2, 2, 1, 2, C.orange); rect(s, 1, 2, 1, 2, C.orange);
    const up = Math.sin(flap) > 0;
    if (up) { rect(s, -4, -9, 6, 6, C.gray); rect(s, -3, -10, 4, 1, C.grayD); rect(s, -4, -9, 2, 6, C.grayL); }
    else { rect(s, -4, -1, 7, 2, C.gray); rect(s, -6, 1, 8, 3, C.gray); rect(s, -7, 3, 5, 1, C.grayD); }
  }, x, y, {});
}

export function drawCrate(g: G, x: number, y: number, rot = 0) {
  sprite(g, "crate", 20, 20, 10, 10, (s) => {
    rect(s, -4, -3, 8, 7, C.brown); rect(s, -4, -3, 8, 1, "#b07a52");
    rect(s, -4, -3, 1, 7, C.brownD); rect(s, 3, -3, 1, 7, C.brownD); rect(s, -1, -3, 2, 7, C.brownD);
  }, x, y, { rot });
}

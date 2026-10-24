import { C } from "./palette";
import { G, rect, line, sprite } from "./px";
import { ik2 } from "./physics";

/**
 * Dr. Pip: the recurring protagonist of the series.
 *
 * Coordinates inside a pose are in the sprite's own pixel space: origin = ground contact
 * between the feet, +x = the direction he faces, -y = up. Limb targets are absolute in that
 * space, so scenes can say "put the right hand at (7,-14)" without worrying about flip/lean.
 */
export type Mouth = "flat" | "smile" | "grin" | "o" | "yell" | "frown" | "gasp";
export type Eyes = "normal" | "wide" | "squint" | "closed" | "dizzy" | "happy";

export interface Pose {
  x: number; y: number;
  flip?: boolean;
  lean?: number;       // horizontal offset of the head relative to the hips (px, + = forward)
  crouch?: number;     // hips lowered by this many px
  rot?: number;        // whole-body rotation (radians) about the torso, nearest-neighbour sampled
  footL?: [number, number]; footR?: [number, number];
  handL?: [number, number]; handR?: [number, number];
  mouth?: Mouth; eyes?: Eyes;
  brow?: number;       // -1 worried ... +1 angry
  lookX?: number; lookY?: number;
  sweat?: boolean; plaster?: boolean; soot?: boolean;
  headDy?: number;
  alpha?: number;
  noGlasses?: boolean;
}

export const HIP_Y = -8.5;
export const shoulderY = (p: Pose) => HIP_Y + (p.crouch ?? 0) - 9;
const PIVOT: [number, number] = [0, -14];

export interface Anchors { handL: [number, number]; handR: [number, number]; head: [number, number]; feet: [number, number] }

function toWorld(p: Pose, sx: number, sy: number): [number, number] {
  let x = sx - PIVOT[0], y = sy - PIVOT[1];
  if (p.rot) { const c = Math.cos(p.rot), s = Math.sin(p.rot); [x, y] = [x * c - y * s, x * s + y * c]; }
  x += PIVOT[0]; y += PIVOT[1];
  return [p.x + (p.flip ? -x : x), p.y + y];
}

export function drawScientist(g: G, p: Pose): Anchors {
  const crouch = p.crouch ?? 0, lean = Math.round(p.lean ?? 0);
  const hipY = HIP_Y + crouch;
  const yTop = hipY - 11;                 // top of torso
  const ht = yTop - 12 + (p.headDy ?? 0); // head-top reference row
  const hx = lean;
  const fL = p.footL ?? [-2, 0], fR = p.footR ?? [2, 0];
  const sh = yTop + 2;
  const hL = p.handL ?? [-4 + lean * 0.3, sh + 8], hR = p.handR ?? [4 + lean * 0.3, sh + 8];

  const draw = (s: G) => {
    const leg = (hipX: number, f: [number, number], pants: string, shoe: string) => {
      const k = ik2(hipX, hipY, f[0], f[1], 4.6, 4.6, 1);
      line(s, hipX, hipY, k.kx, k.ky, pants, 2);
      line(s, k.kx, k.ky, k.fx, k.fy - 1, pants, 2);
      rect(s, k.fx - 2, k.fy - 1, 5, 2, shoe);
      rect(s, k.fx - 2, k.fy, 5, 1, C.redD === shoe ? C.ink : C.redD);
    };
    const arm = (shX: number, h: [number, number], coat: string) => {
      const k = ik2(shX, sh, h[0], h[1], 4, 4, -1);
      line(s, shX, sh, k.kx, k.ky, coat, 2);
      line(s, k.kx, k.ky, k.fx, k.fy, coat, 2);
      rect(s, k.fx - 0.5, k.fy - 0.5, 2, 2, C.skin);
    };

    // far limbs (darker), legs, torso, head, near arm
    arm(-3 + lean * 0.4, hL, C.mist);
    leg(-2, fL, C.blueD, C.redD);
    leg(2, fR, C.blue, C.red);

    // lab coat, sheared by lean row by row
    for (let i = 0; i < 14; i++) {
      const y = yTop + i;
      const dx = Math.round(lean * (1 - i / 13));
      const flare = i > 8 ? 1 : 0;
      rect(s, -5 + dx - flare, y, 10 + flare * 2, 1, C.white);
      rect(s, 3 + dx + flare, y, 2, 1, C.mist);
      if (i > 1 && i < 9) rect(s, -1 + dx, y, 1, 1, C.lav);
    }
    rect(s, -4 + Math.round(lean * 0.3), yTop + 8, 3, 3, C.mist);          // pocket
    rect(s, -3 + Math.round(lean * 0.3), yTop + 6, 1, 2, C.blue);          // pen
    // bow tie
    rect(s, hx - 3, yTop - 1, 2, 2, C.red); rect(s, hx + 1, yTop - 1, 2, 2, C.red); rect(s, hx - 1, yTop - 1, 2, 2, C.redD);

    // head (14 wide so skin shows around the glasses)
    rect(s, hx - 6, ht + 1, 12, 1, C.skin);
    rect(s, hx - 7, ht + 2, 14, 9, C.skin);
    rect(s, hx - 6, ht + 11, 12, 1, C.skinD);
    rect(s, hx - 7, ht + 10, 14, 1, C.skinD);
    // wild hair
    rect(s, hx - 7, ht, 14, 2, C.white);
    for (const [ox, h] of [[-6, 2], [-3, 3], [0, 4], [3, 3], [5, 2]] as const) rect(s, hx + ox, ht - h, 2, h, C.white);
    rect(s, hx - 9, ht, 2, 5, C.white); rect(s, hx + 7, ht, 2, 5, C.white);
    rect(s, hx - 9, ht + 4, 1, 1, C.mist); rect(s, hx + 8, ht + 4, 1, 1, C.mist); rect(s, hx - 1, ht - 1, 1, 1, C.mist); rect(s, hx - 7, ht + 1, 2, 1, C.mist);
    // round orange glasses
    if (!p.noGlasses) { rect(s, hx - 6, ht + 2, 6, 6, C.orange); rect(s, hx, ht + 2, 6, 6, C.orange);
    rect(s, hx - 6, ht + 7, 6, 1, C.yellowD); rect(s, hx, ht + 7, 6, 1, C.yellowD); }
    const eyes = p.eyes ?? "normal";
    const lx = [hx - 5, hx + 1];
    const lookX = Math.max(-1, Math.min(1, p.lookX ?? 0.5)), lookY = Math.max(-1, Math.min(1, p.lookY ?? 0));
    for (const ex of lx) {
      if (!p.noGlasses) rect(s, ex, ht + 3, 4, 4, eyes === "wide" ? C.white : C.cyan);
      else { rect(s, ex, ht + 3, 4, 4, C.skin); rect(s, ex + 1, ht + 4, 2, 2, C.white); }
      const px = ex + 1 + Math.round(lookX * (eyes === "wide" ? 1 : 1)), py = ht + 4 + Math.round(lookY * 0.5);
      if (eyes === "normal") rect(s, px, py, 1, 2, C.ink);
      else if (eyes === "wide") rect(s, ex + 1 + Math.round(lookX * 0.5 + 0.5), py, 2, 2, C.ink);
      else if (eyes === "squint") { rect(s, ex, ht + 3, 4, 2, C.skin); rect(s, ex + 1, ht + 5, 2, 1, C.ink); }
      else if (eyes === "closed") { rect(s, ex, ht + 5, 4, 1, C.ink); }
      else if (eyes === "happy") { rect(s, ex, ht + 5, 1, 1, C.ink); rect(s, ex + 1, ht + 4, 2, 1, C.ink); rect(s, ex + 3, ht + 5, 1, 1, C.ink); }
      else if (eyes === "dizzy") { rect(s, ex, ht + 3, 1, 1, C.ink); rect(s, ex + 3, ht + 3, 1, 1, C.ink); rect(s, ex + 1, ht + 4, 2, 2, C.ink); rect(s, ex, ht + 6, 1, 1, C.ink); rect(s, ex + 3, ht + 6, 1, 1, C.ink); }
      if (eyes === "normal") rect(s, ex, ht + 3, 1, 1, C.white);
    }
    if (!p.noGlasses) rect(s, hx - 1, ht + 4, 2, 1, C.orange);
    // brows
    const b = Math.round(p.brow ?? 0);
    if (b !== 0 || eyes === "wide") {
      const bb = eyes === "wide" && b === 0 ? -2 : b;
      const outer = bb < 0 ? ht + 1 : ht + 1, inner = bb < 0 ? ht - 0 : ht + 2;
      rect(s, hx - 6, outer, 2, 1, C.mist); rect(s, hx - 4, inner, 3, 1, C.mist);
      rect(s, hx + 1, inner, 3, 1, C.mist); rect(s, hx + 4, outer, 2, 1, C.mist);
    }
    // mouth
    const m = p.mouth ?? "smile", mx = hx - 1;
    if (m === "flat") rect(s, mx - 1, ht + 9, 4, 1, C.ink);
    else if (m === "smile") { rect(s, mx - 1, ht + 8, 1, 1, C.ink); rect(s, mx + 2, ht + 8, 1, 1, C.ink); rect(s, mx, ht + 9, 2, 1, C.ink); }
    else if (m === "grin") { rect(s, mx - 1, ht + 8, 4, 3, C.ink); rect(s, mx, ht + 8, 2, 1, C.white); }
    else if (m === "o") rect(s, mx, ht + 8, 2, 3, C.ink);
    else if (m === "gasp") { rect(s, mx - 1, ht + 8, 4, 3, C.ink); rect(s, mx, ht + 10, 2, 1, C.pink); }
    else if (m === "yell") { rect(s, mx - 1, ht + 8, 4, 3, C.ink); rect(s, mx, ht + 10, 2, 1, C.pink); rect(s, mx, ht + 8, 2, 1, C.white); }
    else if (m === "frown") { rect(s, mx, ht + 9, 2, 1, C.ink); rect(s, mx - 1, ht + 10, 1, 1, C.ink); rect(s, mx + 2, ht + 10, 1, 1, C.ink); }
    if (p.plaster) { rect(s, hx + 3, ht + 8, 4, 2, C.cream); rect(s, hx + 4, ht + 8, 1, 2, C.skinD); }
    if (p.soot) { rect(s, hx - 7, ht + 8, 3, 3, C.grayD); rect(s, hx + 4, ht + 8, 3, 3, C.grayD); rect(s, hx - 3, ht - 4, 3, 2, C.grayL); rect(s, hx + 2, ht - 3, 2, 2, C.gray); }
    if (p.sweat) { rect(s, hx + 9, ht + 3, 1, 2, C.cyan); rect(s, hx + 10, ht + 5, 1, 1, C.cyan); }
    arm(3 + lean * 0.4, hR, C.white);
  };

  sprite(g, "sci", 64, 72, 32, 54, draw, p.x, p.y, { rot: p.rot, flip: p.flip, pivotX: PIVOT[0], pivotY: PIVOT[1], alpha: p.alpha });

  return {
    handL: toWorld(p, hL[0], hL[1]), handR: toWorld(p, hR[0], hR[1]),
    head: toWorld(p, hx, ht + 5), feet: toWorld(p, 0, 0),
  };
}

/** Walk/run cycle: returns foot + hand targets for a given phase (radians). */
export function gait(phase: number, o: { stride?: number; lift?: number; swing?: number; crouch?: number } = {}): Partial<Pose> {
  const stride = o.stride ?? 4, lift = o.lift ?? 3, swing = o.swing ?? 4;
  const foot = (ph: number): [number, number] => [stride * Math.sin(ph), -lift * Math.max(0, Math.cos(ph))];
  const crouch = (o.crouch ?? 0.6) * Math.abs(Math.cos(phase));
  const sh = HIP_Y + crouch - 9 + 2;
  return {
    footR: foot(phase), footL: foot(phase + Math.PI), crouch,
    handR: [4 - swing * Math.sin(phase), sh + 7 - Math.abs(Math.sin(phase)) * 1.2],
    handL: [-4 + swing * Math.sin(phase), sh + 7 - Math.abs(Math.sin(phase)) * 1.2],
  };
}

/** Breathing idle. */
export function idle(t: number): Partial<Pose> {
  const b = (Math.sin(t * 3.2) + 1) / 2;
  return { crouch: b * 0.8 };
}

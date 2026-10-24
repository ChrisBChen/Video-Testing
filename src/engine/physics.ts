/**
 * Deterministic physics helpers. Everything is a pure function of time, so any frame
 * can be rendered independently and renders are bit-for-bit reproducible.
 */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Constant-acceleration motion. */
export const kin = (p0: number, v0: number, a: number, t: number) => p0 + v0 * t + 0.5 * a * t * t;

/** Drop with bounces on a floor. y grows downward. Returns {y, vy}. */
export function bounceY(y0: number, vy0: number, g: number, floor: number, e: number, t: number) {
  let y = y0, vy = vy0, rem = t;
  for (let i = 0; i < 12; i++) {
    const disc = vy * vy + 2 * g * (floor - y);
    const tHit = (-vy + Math.sqrt(Math.max(0, disc))) / g;
    if (tHit >= rem) return { y: y + vy * rem + 0.5 * g * rem * rem, vy: vy + g * rem };
    rem -= tHit;
    vy = -(vy + g * tHit) * e;
    y = floor;
    if (Math.abs(vy) < 6) return { y: floor, vy: 0 };
  }
  return { y: floor, vy: 0 };
}

export interface Bit { x0: number; y0: number; vx: number; vy: number; size: number; spin: number; color: number }
/** Burst of debris fragments; positions are analytic in t (seconds). */
export function burst(seed: number, n: number, speed: number, up = 0.7): Bit[] {
  const rn = rng(seed);
  return Array.from({ length: n }, () => {
    const a = rn() * Math.PI * 2, s = speed * (0.35 + rn() * 0.65);
    return { x0: 0, y0: 0, vx: Math.cos(a) * s, vy: Math.sin(a) * s - speed * up, size: 1 + Math.floor(rn() * 2.4), spin: rn(), color: Math.floor(rn() * 3) };
  });
}
export const bitPos = (b: Bit, t: number, g: number, floor = Infinity) => {
  const y = b.y0 + b.vy * t + 0.5 * g * t * t;
  return { x: b.x0 + b.vx * t, y: Math.min(y, floor) };
};

/** Deterministic camera shake offset (integer pixels), decaying after `t0`. */
export function shake(t: number, amp: number, decay = 6, seed = 1) {
  if (t < 0) return { x: 0, y: 0 };
  const k = amp * Math.exp(-decay * t);
  return { x: Math.round(Math.sin(t * 91 + seed) * k), y: Math.round(Math.cos(t * 77 + seed * 2) * k) };
}

/** Two-bone inverse kinematics; returns the knee/elbow point. `bend` = +1/-1 picks the side. */
export function ik2(hx: number, hy: number, fx: number, fy: number, a: number, b: number, bend: number) {
  let dx = fx - hx, dy = fy - hy;
  let d = Math.hypot(dx, dy);
  const maxD = a + b - 0.001;
  if (d > maxD) { fx = hx + (dx / d) * maxD; fy = hy + (dy / d) * maxD; dx = fx - hx; dy = fy - hy; d = maxD; }
  if (d < 0.001) d = 0.001;
  const x = (d * d + a * a - b * b) / (2 * d);
  const h = Math.sqrt(Math.max(0, a * a - x * x));
  const ux = dx / d, uy = dy / d;
  return { kx: hx + ux * x - uy * h * bend, ky: hy + uy * x + ux * h * bend, fx, fy };
}

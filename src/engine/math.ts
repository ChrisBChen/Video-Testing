export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const inv = (a: number, b: number, v: number) => clamp((v - a) / (b - a));
export type Ease = (t: number) => number;
export const smooth: Ease = (t) => t * t * (3 - 2 * t);
export const smoother: Ease = (t) => t * t * t * (t * (6 * t - 15) + 10);
export const easeOut: Ease = (t) => 1 - Math.pow(1 - t, 3);
export const easeIn: Ease = (t) => t * t * t;
export const easeInOut: Ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const backOut: Ease = (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
/** Damped spring settle 0 -> 1 (overshoots), for pops and squash-and-stretch. */
export const spring = (t: number, freq = 12, damp = 5) => (t <= 0 ? 0 : 1 - Math.exp(-damp * t) * Math.cos(freq * t));

/** Piecewise keyframes: key(t, [[t0,v0],[t1,v1]...], ease). */
export function key(t: number, ks: [number, number][], ease: Ease = smooth): number {
  if (t <= ks[0][0]) return ks[0][1];
  for (let i = 1; i < ks.length; i++) if (t <= ks[i][0]) {
    const [t0, v0] = ks[i - 1], [t1, v1] = ks[i];
    return lerp(v0, v1, ease((t - t0) / (t1 - t0)));
  }
  return ks[ks.length - 1][1];
}

/** Monotone cubic (Fritsch-Carlson) interpolation: smooth, never overshoots. Mirrored in tools/build_audio.py. */
export function pchip(xs: number[], ys: number[]) {
  const n = xs.length, h: number[] = [], del: number[] = [];
  for (let i = 0; i < n - 1; i++) { h.push(xs[i + 1] - xs[i]); del.push((ys[i + 1] - ys[i]) / h[i]); }
  const d = new Array(n).fill(0);
  for (let i = 1; i < n - 1; i++) {
    if (del[i - 1] * del[i] > 0) {
      const w1 = 2 * h[i] + h[i - 1], w2 = h[i] + 2 * h[i - 1];
      d[i] = (w1 + w2) / (w1 / del[i - 1] + w2 / del[i]);
    }
  }
  const end = (h0: number, h1: number, d0: number, d1: number) => {
    let m = ((2 * h0 + h1) * d0 - h0 * d1) / (h0 + h1);
    if (Math.sign(m) !== Math.sign(d0)) m = 0;
    else if (Math.sign(d0) !== Math.sign(d1) && Math.abs(m) > 3 * Math.abs(d0)) m = 3 * d0;
    return m;
  };
  d[0] = end(h[0], h[1], del[0], del[1]);
  d[n - 1] = end(h[n - 2], h[n - 3], del[n - 2], del[n - 3]);
  return (x: number) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0; while (x > xs[i + 1]) i++;
    const t = (x - xs[i]) / h[i], t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h[i] * d[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h[i] * d[i + 1];
  };
}
export const rng = (seed: number) => {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
};

import tl from "./data/timeline.json";
import { FOOT, PipPose, Face } from "./engine/pip";
import { clamp, inv, key, lerp, smooth, smoother, easeInOut, easeOut } from "./engine/math";
import { fallTau, HALF_TRIP, OMEGA, V_MAX_KMH } from "./engine/physics";
import type { Cam } from "./engine/project";

/** The director: everything that happens is a pure function of time `s` (seconds). */
export const E = tl.events;
export const FPS = tl.fps;
export const TOTAL = Math.round(tl.totalSeconds * FPS);
export const R = 12;                 // Earth slice radius (scene units)
export const PS = 0.8;               // Pip scale
export const FOOT_Y = FOOT * PS;     // boots below centre
export const A_PIP = R + FOOT_Y;     // amplitude of Pip's fall (centre path)
type V3 = [number, number, number];
const groundY = (x: number) => Math.sqrt(R * R - x * x);

export const tauFall = (s: number) => (s <= E.jump ? 0 : s >= E.arrival ? HALF_TRIP : fallTau(s));

// ----- tunnels used in the race (scene units; chord B is to true scale, chord C is exaggerated) -----
const chord = (a: number, thetaDeg: number) => {
  const th = (thetaDeg * Math.PI) / 180, d = Math.sqrt(R * R - a * a);
  const M: [number, number] = [d * Math.cos(th), d * Math.sin(th)], u: [number, number] = [-Math.sin(th), Math.cos(th)];
  return { a, M, p1: [M[0] + a * u[0], M[1] + a * u[1], 0] as V3, p2: [M[0] - a * u[0], M[1] - a * u[1], 0] as V3 };
};
export const TUNNELS = [
  { id: "A", color: "#46e6ff", a: A_PIP, p1: [0, -A_PIP, 0] as V3, p2: [0, A_PIP, 0] as V3, kmh: V_MAX_KMH, label: "THROUGH THE CENTER", sub: "12,742 km", appear: E.zoomOut + 2.6 },
  { id: "B", color: "#ffb02e", ...chord(3.7, 135), kmh: V_MAX_KMH * (3.7 / R), label: "NEW YORK → LOS ANGELES", sub: "3,940 km", appear: E.chordB },
  { id: "C", color: "#ff6fb1", ...chord(1.1, 35), kmh: (OMEGA * 5000 * 3.6), label: "ACROSS TOWN", sub: "10 km", appear: E.chordC },
];
export const raceTau = (s: number) => clamp((s - E.raceStart) / (E.raceEnd - E.raceStart)) * HALF_TRIP;
export function podAt(i: number, s: number): { pos: V3; dir: V3; speedFrac: number } {
  const t = TUNNELS[i], tau = raceTau(s);
  const e: V3 = [t.p2[0] - t.p1[0], t.p2[1] - t.p1[1], 0]; const L = Math.hypot(e[0], e[1]); e[0] /= L; e[1] /= L;
  const c: V3 = [(t.p1[0] + t.p2[0]) / 2, (t.p1[1] + t.p2[1]) / 2, 0];
  const k = -Math.cos(OMEGA * tau) * t.a;
  return { pos: [c[0] + e[0] * k, c[1] + e[1] * k, 0.3], dir: e, speedFrac: Math.abs(Math.sin(OMEGA * tau)) };
}

// ----- Pip -----
const L0 = (a: number | undefined, b: number | undefined, t: number) => lerp(a ?? 0, b ?? 0, t);
export function blend(a: PipPose, b: PipPose, t: number): PipPose {
  const out: any = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (k === "face" || k === "look") out[k] = t < 0.5 ? (a as any)[k] ?? (b as any)[k] : (b as any)[k] ?? (a as any)[k];
    else { const d = k === "squash" ? 1 : 0; out[k] = lerp((a as any)[k] ?? d, (b as any)[k] ?? d, t); }
  }
  return out;
}
const stand = (s: number, face: Face = "calm"): PipPose => ({ armRz: 0.05, armLz: 0.05, face, lean: 0, antenna: Math.sin((2 * Math.PI * s) / 4.45), squash: 1 + 0.01 * Math.sin((2 * Math.PI * s) / 2.225), blink: (s * 1.7) % 3.1 < 0.12 ? 1 : 0 });
const flail = (s: number, amp: number, face: Face): PipPose => ({
  armRz: 2.2 + Math.sin(s * 9) * 0.45 * amp, armLz: 2.2 + Math.cos(s * 9 + 1) * 0.45 * amp, armRx: Math.sin(s * 7) * 0.4 * amp, armLx: Math.cos(s * 7) * 0.4 * amp,
  elbR: -0.5 * amp, elbL: -0.5 * amp, legRx: Math.sin(s * 7) * 0.7 * amp, legLx: -Math.sin(s * 7) * 0.7 * amp, kneeR: 0.5 * amp, kneeL: 0.5 * amp, face, antenna: Math.sin(s * 8),
});
const fly = (s: number, face: Face): PipPose => ({ armRz: 2.95, armLz: 2.95, elbR: 0, elbL: 0, legRz: 0.08, legLz: -0.08, kneeR: 0.1, kneeL: 0.1, lean: 0, face, antenna: Math.sin(s * 2) * 0.6, headX: -0.05 });

export interface PipState { pos: V3; rot: V3; pose: PipPose; scale: number; visible: boolean; pod?: { podScale: number } }
export function pipState(s: number): PipState {
  const restPos: V3 = [-2.5, groundY(-2.5) + FOOT_Y, -0.9];
  const restRot: V3 = [0, 0.35, 2.5 / R];
  // --- before the jump: stands at the rim, peers in, crouches ---
  if (s < E.jump) {
    const x = key(s, [[0, -2.5], [1.6, -2.5], [2.5, -1.0], [3.0, -1.0], [E.jump, 0]], smooth);
    const z = key(s, [[0, -0.9], [2.9, -0.9], [E.jump, 0.45]], smooth);
    const hop = s > 3.0 ? 0.9 * Math.sin(Math.PI * inv(3.0, E.jump, s)) : 0;
    const tilt = -x / R;
    let pose: PipPose = stand(s);
    if (s > 1.0) pose = blend(pose, { lean: 0.28, headX: 0.35, face: "worried", armRx: -0.4, armLx: -0.4, look: [0, -1] }, smooth(inv(1.0, 1.8, s)));
    if (s > 2.2) pose = blend(pose, { squash: 0.9, kneeL: 0.8, kneeR: 0.8, legLx: -0.4, legRx: -0.4, lean: 0.25, armRx: -0.7, armLx: -0.7, face: "smug", headX: 0.0, look: [0, 0] }, smooth(inv(2.2, 2.9, s)));
    if (s > 3.0) pose = blend(pose, { squash: 1.1, armRz: 2.6, armLz: 2.6, legRz: 0.3, legLz: -0.3, kneeL: 0, kneeR: 0, lean: 0, face: "yell" }, smooth(inv(3.0, 3.3, s)));
    return { pos: [x, groundY(x) + FOOT_Y + hop, z], rot: [0, lerp(0.35, 0, inv(2.9, E.jump, s)), tilt * (1 - inv(3.0, E.jump, s))], pose, scale: PS, visible: true };
  }
  // --- the fall ---
  if (s < E.arrival) {
    const tau = tauFall(s), y = A_PIP * Math.cos(OMEGA * tau);
    const frac = tau / HALF_TRIP, phi = Math.PI * smoother(frac);
    const sp = Math.abs(Math.sin(OMEGA * tau));
    let pose: PipPose;
    if (s < 6.5) pose = flail(s, 1, s < 5.5 ? "yell" : "wide");
    else if (s < 10.0) pose = blend(flail(s, 0.6, "wide"), { armRz: 1.5, armLz: 1.5, elbR: -0.2, elbL: -0.2, face: "awe", legRz: 0.2, legLz: -0.2 }, smooth(inv(6.5, 9.8, s)));
    else if (s < 16.0) pose = blend({ armRz: 1.5, armLz: 1.5, face: "awe", legRz: 0.2, legLz: -0.2 }, fly(s, "happy"), smooth(inv(9.8, 11.0, s)));
    else if (s < 19.5) pose = blend(fly(s, "happy"), { armRz: 1.0, armLz: 1.0, face: "calm", legRz: 0.15, legLz: -0.15 }, smooth(inv(16, 18, s)));
    else pose = blend({ armRz: 1.0, armLz: 1.0, face: "calm", legRz: 0.15, legLz: -0.15 }, { armRz: 2.0, armLz: 2.0, elbR: -1.8, elbL: -1.8, face: "worried", legRz: 0.1, legLz: -0.1, kneeR: 0.5, kneeL: 0.5, headX: -0.15 }, smooth(inv(19.5, 21.5, s)));
    if (s > 21.8) pose = blend(pose, { armRz: 0.1, armLz: 0.1, face: "wide", squash: 1.0 }, smooth(inv(21.8, E.arrival, s)));
    const twist = Math.sin(s * 0.8) * 0.5 * (s > 9 && s < 17 ? 1 : 0);
    return { pos: [0, y, 0.45], rot: [0, twist, phi], pose, scale: PS, visible: true };
  }
  // --- arrival: stands upside-down on the far side, steps out onto the beach, cheers ---
  const bottom = (x: number): V3 => [x, -groundY(x) - FOOT_Y, 0.45 * (1 - inv(E.stepOut, E.stepOut + 0.5, s)) - 0.9 * inv(E.stepOut, E.stepOut + 0.6, s)];
  if (s < E.zoomOut + 2.6) {
    const x = key(s, [[E.stepOut, 0], [E.stepOut + 1.5, 2.8], [E.zoomOut + 1.0, 2.8], [E.zoomOut + 2.3, 0]], smooth);
    const hop = s > E.stepOut && s < E.stepOut + 0.6 ? 0.8 * Math.sin(Math.PI * inv(E.stepOut, E.stepOut + 0.6, s)) : 0;
    const b = bottom(x);
    const walking = (s > E.stepOut + 0.4 && s < E.stepOut + 1.5) || (s > E.zoomOut + 1.0 && s < E.zoomOut + 2.3);
    const g = Math.sin(s * 11);
    let pose: PipPose = walking ? { armRx: g * 0.6, armLx: -g * 0.6, legRx: -g * 0.7, legLx: g * 0.7, face: "happy", antenna: g }
      : s < E.stepOut ? { armRz: 0.1, armLz: 0.1, face: "wide", antenna: Math.sin(s * 3) }
      : { armRz: 2.8 + Math.sin(s * 8) * 0.2, armLz: 0.1, elbR: -0.2, face: "smug", antenna: Math.sin(s * 5), squash: 1 + 0.04 * Math.abs(Math.sin(s * 6)) };
    return { pos: [x, b[1] - hop, b[2]], rot: [0, 0, Math.PI + x / R], pose, scale: PS, visible: true };
  }
  // --- in the pod during the race ---
  if (s < E.raceEnd + 0.4) {
    const p = podAt(0, s), tau = raceTau(s);
    const rz = Math.PI + Math.PI * smoother(tau / HALF_TRIP);
    const w = Math.sin(s * 7);
    return { pos: [p.pos[0], p.pos[1], 0.3], rot: [0, 0.25 * Math.sin(s * 1.3), rz], pose: { armRz: 2.6 + w * 0.3, armLz: 0.2, face: s > E.raceEnd - 1.2 ? "happy" : "wide", legRz: 0.15, legLz: -0.15, kneeR: 0.3, kneeL: 0.3, antenna: w }, scale: 0.9, visible: s >= E.zoomOut + 2.6, pod: { podScale: 1 } };
  }
  // --- after the race: climbs out, walks back to where we began, waits for the loop ---
  const x = key(s, [[E.raceEnd + 0.4, 0], [E.explain + 0.6, 0], [E.explain + 2.4, -2.5]], smooth);
  const z = key(s, [[E.raceEnd + 0.4, 0.3], [E.explain + 0.6, 0.3], [E.explain + 1.2, -0.9]], smooth);
  const walking = s > E.explain + 0.6 && s < E.explain + 2.4;
  const g = Math.sin(s * 11);
  const y = groundY(x) + FOOT_Y;
  const settle = smooth(inv(E.explain + 2.4, E.explain + 3.0, s));
  let pose: PipPose = walking ? { armRx: g * 0.6, armLx: -g * 0.6, legRx: -g * 0.7, legLx: g * 0.7, face: "happy", antenna: g } : stand(s);
  if (!walking && s < E.explain + 0.6) pose = { armRz: 2.8 + Math.sin(s * 8) * 0.2, armLz: 0.1, face: "happy", antenna: Math.sin(s * 5) };
  const scaleK = s < E.explain + 0.6 ? lerp(0.9, PS, smooth(inv(E.raceEnd + 0.4, E.explain + 0.6, s))) : PS;
  const ry = lerp(0, 0.35, settle * inv(E.explain + 1.2, E.explain + 2.4, s));
  return { pos: [x, y, z], rot: [0, ry, -x / R], pose, scale: scaleK, visible: true };
}

// ----- camera -----
const lerp3 = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const K0: Cam = { pos: [3.4, 12.3, 10.2], target: [-0.9, 12.4, -0.6], fov: 40 };
const K1: Cam = { pos: [1.4, 14.2, 9.4], target: [-1.2, 12.2, -0.3], fov: 42 };
const WIDE_POS: V3 = [0, -3.2, 80], WIDE_TGT: V3 = [0, -3.2, 0];
const PUSH_Z = 20, PUSH_Y = 2.0;
function trackOffset(s: number): V3 {
  const k = (i: number) => key(s, [[E.jump, [2.3, 2.0, 9.6][i]], [7, [2.8, 1.0, 10.0][i]], [10, [-2.5, 0.8, 10.5][i]], [12.5, [-3.0, 0.5, 10.5][i]], [15.5, [2.4, -0.3, 10.0][i]], [19, [2.8, -0.8, 10.5][i]], [E.arrival, [2.8, 1.2, 10.0][i]], [E.stepOut + 1.2, [3.4, 0.8, 11][i]]], smooth);
  return [k(0), k(1), k(2)];
}
export function camera(s: number): Cam {
  let pos: V3, target: V3, fov: number;
  if (s < 1.6) { const t = easeInOut(inv(0, 1.6, s)); pos = lerp3(K0.pos, K1.pos, t); target = lerp3(K0.target, K1.target, t); fov = lerp(K0.fov, K1.fov, t); }
  else if (s < E.jump) {
    const tau = 0, o = trackOffset(E.jump); const tgt: V3 = [0, A_PIP - 0.2, 0.2];
    const t = easeInOut(inv(1.6, E.jump, s));
    pos = lerp3(K1.pos, [tgt[0] + o[0], tgt[1] + o[1], tgt[2] + o[2]], t); target = lerp3(K1.target, tgt, t); fov = lerp(K1.fov, 38, t); void tau;
  } else if (s < E.stepOut + 1.2) {
    const tau = tauFall(s), y = A_PIP * Math.cos(OMEGA * tau), o = trackOffset(s);
    const lead = -0.5 * Math.sin(OMEGA * tau) * (s < E.arrival ? 1 : 0);
    const ty = s < E.arrival ? y + lead : -A_PIP + 0.0;
    const tx = s < E.arrival ? 0 : lerp(0, 1.2, smooth(inv(E.stepOut, E.stepOut + 1.2, s)));
    target = [tx, ty, 0.2]; pos = [tx + o[0], ty + o[1], o[2]]; fov = 38;
  } else if (s < E.zoomOut + 3.7) {
    const o = trackOffset(E.stepOut + 1.2); const t0: V3 = [1.2, -A_PIP, 0.2]; const p0: V3 = [t0[0] + o[0], t0[1] + o[1], o[2]];
    const t = easeInOut(inv(E.stepOut + 1.2, E.zoomOut + 3.7, s));
    pos = lerp3(p0, WIDE_POS, t); target = lerp3(t0, WIDE_TGT, t); fov = lerp(38, 38, t);
  } else if (s < E.outro) {
    const k = s - (E.zoomOut + 3.7), push = key(s, [[E.explain, 0], [E.outro, 1]], smooth);
    pos = [Math.sin(k * 0.35) * 5.5, WIDE_POS[1] + Math.sin(k * 0.27) * 1.2, WIDE_POS[2] - PUSH_Z * push]; target = [0, WIDE_TGT[1] + PUSH_Y * push, 0]; fov = 38;
  } else {
    const t = easeInOut(inv(E.outro, tl.totalSeconds, s));
    const k = E.outro - (E.zoomOut + 3.7);
    const p0: V3 = [Math.sin(k * 0.35) * 5.5, WIDE_POS[1] + Math.sin(k * 0.27) * 1.2, WIDE_POS[2] - PUSH_Z], t0: V3 = [0, WIDE_TGT[1] + PUSH_Y, 0];
    pos = lerp3(p0, K0.pos, t); target = lerp3(t0, K0.target, t); fov = lerp(38, K0.fov, t);
  }
  const dist = Math.hypot(pos[0] - target[0], pos[1] - target[1], pos[2] - target[2]);
  const k = key(s, [[0, 0.05], [E.stepOut + 1.2, 0.05], [E.zoomOut + 3.7, 0.0], [E.outro, 0.0], [tl.totalSeconds, 0.05]], smooth);
  target = [target[0], target[1] - k * 2 * dist * Math.tan((fov * Math.PI) / 360), target[2]];
  return { pos, target, fov };
}

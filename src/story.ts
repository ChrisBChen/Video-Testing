import tl from "./data/timeline.json";
import { FOOT, PipPose, Face } from "./engine/pip";
import { clamp, inv, key, lerp, smooth, smoother, easeInOut, easeOut } from "./engine/math";
import { fallTau, HALF_TRIP, OMEGA, V_MAX_KMH } from "./engine/physics";
import type { Cam } from "./engine/project";
import * as THREE from "three";

/** The director: everything that happens is a pure function of time `s` (seconds). */
export const E = tl.events;
export const FPS = tl.fps;
export const TOTAL = Math.round(tl.totalSeconds * FPS);
export const R = 12;                 // Earth slice radius (scene units)
export const PS = 0.8;               // Pip scale
export const FOOT_Y = FOOT * PS;     // boots below centre
export const A_PIP = R + FOOT_Y;     // amplitude of Pip's fall (centre path)
type V3 = [number, number, number];

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
const Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
const qz = (a: number) => new THREE.Quaternion().setFromAxisAngle(Z, a);
const qy = (a: number) => new THREE.Quaternion().setFromAxisAngle(Y, a);
const qUp = (n: THREE.Vector3) => new THREE.Quaternion().setFromUnitVectors(Y, n.clone().normalize());
const Q = (q: THREE.Quaternion): [number, number, number, number] => [q.x, q.y, q.z, q.w];
/** Standing on the sphere at (x, z) near the top pole (up = 1) or the bottom pole (up = -1). */
function stand3(x: number, z: number, up: 1 | -1, yaw: number) {
  const h = Math.sqrt(Math.max(1, R * R - x * x - z * z));
  const top = new THREE.Vector3(up === 1 ? x : -x, h, up === 1 ? z : -z).normalize();
  const pos = new THREE.Vector3(x, up * h, z).normalize().multiplyScalar(R + FOOT_Y);
  let q = qUp(top);
  if (up === -1) q = q.multiply(qz(Math.PI));
  q = q.multiply(qy(yaw));
  return { pos: pos.toArray() as V3, q: Q(q) };
}
const L0 = (a: number | undefined, b: number | undefined, t: number) => lerp(a ?? 0, b ?? 0, t);
export function blend(a: PipPose, b: PipPose, t: number): PipPose {
  const out: any = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (k === "face" || k === "look") out[k] = t < 0.5 ? (a as any)[k] ?? (b as any)[k] : (b as any)[k] ?? (a as any)[k];
    else { const d = k === "squash" ? 1 : 0; out[k] = lerp((a as any)[k] ?? d, (b as any)[k] ?? d, t); }
  }
  return out;
}
const stand = (s: number, face: Face = "calm"): PipPose => ({ armRz: 0.05, armLz: 0.05, face, lean: 0, antenna: Math.sin((2 * Math.PI * s) / 4.45), squash: 1 + 0.012 * Math.sin((2 * Math.PI * s) / 2.225), blink: (s * 1.7) % 3.1 < 0.12 ? 1 : 0 });
const flail = (s: number, amp: number, face: Face): PipPose => ({
  armRz: 2.2 + Math.sin(s * 9) * 0.45 * amp, armLz: 2.2 + Math.cos(s * 9 + 1) * 0.45 * amp, armRx: Math.sin(s * 7) * 0.4 * amp, armLx: Math.cos(s * 7) * 0.4 * amp,
  elbR: -0.5 * amp, elbL: -0.5 * amp, legRx: Math.sin(s * 7) * 0.7 * amp, legLx: -Math.sin(s * 7) * 0.7 * amp, kneeR: 0.5 * amp, kneeL: 0.5 * amp, face, antenna: Math.sin(s * 8),
});
const fly = (s: number, face: Face): PipPose => ({ armRz: 2.95, armLz: 2.95, elbR: 0, elbL: 0, legRz: 0.08, legLz: -0.08, kneeR: 0.1, kneeL: 0.1, lean: 0, face, antenna: Math.sin(s * 2) * 0.6, headX: -0.05 });
const walkCycle = (s: number, face: Face = "happy"): PipPose => { const g = Math.sin(s * 11); return { armRx: g * 0.6, armLx: -g * 0.6, legRx: -g * 0.7, legLx: g * 0.7, kneeR: Math.max(0, -g) * 0.5, kneeL: Math.max(0, g) * 0.5, face, antenna: g }; };

export interface PipState { pos: V3; q: [number, number, number, number]; pose: PipPose; scale: number; visible: boolean }
export function pipState(s: number): PipState {
  // --- before the jump: stands in the park, looks at us, peers in, crouches ---
  if (s < E.jump) {
    const x = key(s, [[0, -2.5], [1.8, -2.5], [2.6, -1.0], [3.0, -1.0], [E.jump, 0]], smooth);
    const z = key(s, [[0, -0.9], [2.9, -0.9], [E.jump, 0.45]], smooth);
    const yaw = key(s, [[0, 0.55], [1.2, 0.55], [2.0, 1.15], [2.9, 0.9], [E.jump, 0]], smooth);
    const hop = s > 3.0 ? 0.9 * Math.sin(Math.PI * inv(3.0, E.jump, s)) : 0;
    const st = stand3(x, z, 1, yaw);
    let pose: PipPose = stand(s, s < 1.0 ? "smug" : "calm");
    if (s > 1.1) pose = blend(pose, { lean: 0.28, headX: 0.35, face: "worried", armRx: -0.4, armLx: -0.4, look: [0, -1] }, smooth(inv(1.1, 1.9, s)));
    if (s > 2.3) pose = blend(pose, { squash: 0.9, kneeL: 0.8, kneeR: 0.8, legLx: -0.4, legRx: -0.4, lean: 0.25, armRx: -0.7, armLx: -0.7, face: "smug", headX: 0.0, look: [0, 0] }, smooth(inv(2.3, 2.95, s)));
    if (s > 3.0) pose = blend(pose, { squash: 1.1, armRz: 2.6, armLz: 2.6, legRz: 0.3, legLz: -0.3, kneeL: 0, kneeR: 0, lean: 0, face: "yell" }, smooth(inv(3.0, 3.3, s)));
    return { pos: [st.pos[0], st.pos[1] + hop, st.pos[2]], q: st.q, pose, scale: PS, visible: true };
  }
  // --- the fall ---
  if (s < E.arrival) {
    const tau = tauFall(s), y = A_PIP * Math.cos(OMEGA * tau);
    const frac = tau / HALF_TRIP, phi = Math.PI * smoother(frac);
    let pose: PipPose;
    if (s < 6.5) pose = flail(s, 1, s < 5.5 ? "yell" : "wide");
    else if (s < 10.0) pose = blend(flail(s, 0.6, "wide"), { armRz: 1.5, armLz: 1.5, elbR: -0.2, elbL: -0.2, face: "awe", legRz: 0.2, legLz: -0.2 }, smooth(inv(6.5, 9.8, s)));
    else if (s < 16.0) pose = blend({ armRz: 1.5, armLz: 1.5, face: "awe", legRz: 0.2, legLz: -0.2 }, fly(s, "happy"), smooth(inv(9.8, 11.0, s)));
    else if (s < 19.5) pose = blend(fly(s, "happy"), { armRz: 1.0, armLz: 1.0, face: "calm", legRz: 0.15, legLz: -0.15 }, smooth(inv(16, 18, s)));
    else pose = blend({ armRz: 1.0, armLz: 1.0, face: "calm", legRz: 0.15, legLz: -0.15 }, { armRz: 2.0, armLz: 2.0, elbR: -1.8, elbL: -1.8, face: "worried", legRz: 0.1, legLz: -0.1, kneeR: 0.5, kneeL: 0.5, headX: -0.15 }, smooth(inv(19.5, 21.5, s)));
    if (s > 21.8) pose = blend(pose, { armRz: 0.1, armLz: 0.1, face: "wide", squash: 1.0 }, smooth(inv(21.8, E.arrival, s)));
    const twist = Math.sin(s * 0.8) * 0.5 * (s > 9 && s < 17 ? 1 : 0) + 0.25 * Math.sin(s * 0.5);
    return { pos: [0, y, 0.45], q: Q(qz(phi).multiply(qy(twist))), pose, scale: PS, visible: true };
  }
  // --- arrival: stands upside-down on the far side, steps out onto the beach, cheers, then walks back to the hole ---
  if (s < E.zoomOut + 2.6) {
    const x = key(s, [[E.stepOut, 0], [E.stepOut + 1.5, 2.8], [E.zoomOut + 1.0, 2.8], [E.zoomOut + 2.3, 0]], smooth);
    const z = key(s, [[E.stepOut, 0.45], [E.stepOut + 0.6, -0.9], [E.zoomOut + 1.0, -0.9], [E.zoomOut + 2.3, 0.3]], smooth);
    const hop = s > E.stepOut && s < E.stepOut + 0.6 ? 0.8 * Math.sin(Math.PI * inv(E.stepOut, E.stepOut + 0.6, s)) : 0;
    const st = stand3(x, z, -1, key(s, [[E.stepOut, 0], [E.stepOut + 1.5, 0.6], [E.zoomOut + 1.0, 0.0]], smooth));
    const walking = (s > E.stepOut + 0.4 && s < E.stepOut + 1.5) || (s > E.zoomOut + 1.0 && s < E.zoomOut + 2.3);
    const pose: PipPose = walking ? walkCycle(s) : s < E.stepOut ? { armRz: 0.1, armLz: 0.1, face: "wide", antenna: Math.sin(s * 3) } : { armRz: 2.8 + Math.sin(s * 8) * 0.2, armLz: 0.1, elbR: -0.2, face: "smug", antenna: Math.sin(s * 5), squash: 1 + 0.04 * Math.abs(Math.sin(s * 6)) };
    return { pos: [st.pos[0], st.pos[1] - hop, st.pos[2]], q: st.q, pose, scale: PS, visible: true };
  }
  // --- in the pod during the race ---
  if (s < E.raceEnd + 0.4) {
    const p = podAt(0, s), tau = raceTau(s);
    const rz = Math.PI + Math.PI * smoother(tau / HALF_TRIP);
    const w = Math.sin(s * 7);
    return { pos: [p.pos[0], p.pos[1], 0.3], q: Q(qz(rz).multiply(qy(0.25 * Math.sin(s * 1.3)))), pose: { armRz: 2.6 + w * 0.3, armLz: 0.2, face: s > E.raceEnd - 1.2 ? "happy" : "wide", legRz: 0.15, legLz: -0.15, kneeR: 0.3, kneeL: 0.3, antenna: w }, scale: 0.9, visible: true };
  }
  // --- after the race: climbs out, walks back to where we began, waits for the loop ---
  const x = key(s, [[E.raceEnd + 0.4, 0], [E.explain + 0.6, 0], [E.explain + 2.4, -2.5]], smooth);
  const z = key(s, [[E.raceEnd + 0.4, 0.3], [E.explain + 0.6, 0.3], [E.explain + 1.2, -0.9]], smooth);
  const yaw = key(s, [[E.explain + 1.2, 0], [E.explain + 2.6, 0.55]], smooth);
  const walking = s > E.explain + 0.6 && s < E.explain + 2.4;
  const st = stand3(x, z, 1, yaw);
  let pose: PipPose = walking ? walkCycle(s) : stand(s, s > E.outro ? "smug" : "calm");
  if (!walking && s < E.explain + 0.6) pose = { armRz: 2.8 + Math.sin(s * 8) * 0.2, armLz: 0.1, face: "happy", antenna: Math.sin(s * 5) };
  const scaleK = s < E.explain + 0.6 ? lerp(0.9, PS, smooth(inv(E.raceEnd + 0.4, E.explain + 0.6, s))) : PS;
  return { pos: st.pos, q: st.q, pose, scale: scaleK, visible: true };
}

// ----- camera -----
const lerp3 = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const mixCam = (a: Cam, b: Cam, t: number): Cam => ({ pos: lerp3(a.pos, b.pos, t), target: lerp3(a.target, b.target, t), fov: lerp(a.fov, b.fov, t) });
const K0: Cam = { pos: [-0.15, 13.25, 3.0], target: [-2.5, 13.1, -0.9], fov: 34 };   // close-up on Pip: first and last frame
const K1: Cam = { pos: [6.8, 11.4, 9.8], target: [-0.9, 12.0, -1.0], fov: 42 };      // establishing: the planet, the park, the hole
const K1b: Cam = { pos: [2.6, 15.6, 5.6], target: [-0.4, 11.6, 0.1], fov: 42 };       // looking down the shaft
const WIDE_Y = -3.2, WIDE_Z = 80, PUSH_Z = 20, PUSH_Y = 2.0;
function trackOffset(s: number): V3 {
  const k = (i: number) => key(s, [[E.jump, [3.6, 2.0, 9.4][i]], [7, [4.8, 0.8, 10.4][i]], [10, [-4.2, 0.8, 10.2][i]], [12.5, [-4.8, 0.4, 9.8][i]], [15.5, [3.4, -0.3, 10.2][i]], [19, [3.8, -0.8, 10.8][i]], [E.arrival, [3.6, 1.2, 10.2][i]], [E.stepOut + 1.2, [3.8, 0.8, 11][i]]], smooth);
  return [k(0), k(1), k(2)];
}
const yawAt = (s: number) => key(s, [[E.zoomOut + 3.7, -0.42], [E.explain, 0.3], [E.outro, 0.06]], smooth);
function wideCam(s: number): Cam {
  const yaw = yawAt(s), k = s - (E.zoomOut + 3.7), push = key(s, [[E.explain, 0], [E.outro, 1]], smooth);
  const d = WIDE_Z - PUSH_Z * push;
  return { pos: [d * Math.sin(yaw), WIDE_Y + Math.sin(k * 0.27) * 1.2, d * Math.cos(yaw)], target: [0, WIDE_Y + PUSH_Y * push, 0], fov: 38 };
}
export function camera(s: number): Cam {
  let c: Cam;
  if (s < 1.75) c = mixCam(K0, K1, easeInOut(inv(0, 1.75, s)));
  else if (s < 2.75) c = mixCam(K1, K1b, easeInOut(inv(1.75, 2.75, s)));
  else if (s < E.jump) {
    const o = trackOffset(E.jump), tgt: V3 = [0, A_PIP - 0.2, 0.2];
    c = mixCam(K1b, { pos: [tgt[0] + o[0], tgt[1] + o[1], tgt[2] + o[2]], target: tgt, fov: 38 }, easeInOut(inv(2.75, E.jump, s)));
  } else if (s < E.stepOut + 1.2) {
    const tau = tauFall(s), y = A_PIP * Math.cos(OMEGA * tau), o = trackOffset(s);
    const lead = -0.5 * Math.sin(OMEGA * tau) * (s < E.arrival ? 1 : 0);
    const ty = s < E.arrival ? y + lead : -A_PIP;
    const tx = s < E.arrival ? 0 : lerp(0, 1.2, smooth(inv(E.stepOut, E.stepOut + 1.2, s)));
    c = { target: [tx, ty, 0.2], pos: [tx + o[0], ty + o[1], o[2]], fov: 38 };
  } else if (s < E.zoomOut + 3.7) {
    const o = trackOffset(E.stepOut + 1.2), t0: V3 = [1.2, -A_PIP, 0.2];
    const a: Cam = { target: t0, pos: [t0[0] + o[0], t0[1] + o[1], o[2]], fov: 38 };
    c = mixCam(a, wideCam(E.zoomOut + 3.7), easeInOut(inv(E.stepOut + 1.2, E.zoomOut + 3.7, s)));
  } else if (s < E.outro) {
    c = wideCam(s);
    // the "money shot": cut in on the glowing core as the centre pod flies through it
    const mid = E.raceStart + 0.5 * (E.raceEnd - E.raceStart);
    if (s > mid - 0.9 && s < mid + 0.9) c = { pos: [-10, 1.5, 34], target: [0, 0, 0], fov: 38 };
  } else {
    c = mixCam(wideCam(E.outro), K0, easeInOut(inv(E.outro, tl.totalSeconds, s)));
  }
  const dist = Math.hypot(c.pos[0] - c.target[0], c.pos[1] - c.target[1], c.pos[2] - c.target[2]);
  const k = key(s, [[0, 0], [1.75, 0.04], [E.stepOut + 1.2, 0.05], [E.zoomOut + 3.7, 0.0], [E.outro, 0.0], [tl.totalSeconds, 0]], smooth);
  // gentle handheld drift so the shot never feels locked off (deterministic)
  const dr = 0.004 * dist;
  const pos: V3 = [c.pos[0] + dr * Math.sin(s * 1.3), c.pos[1] + dr * Math.sin(s * 1.7 + 1), c.pos[2] + dr * Math.sin(s * 0.9 + 2)];
  return { pos, target: [c.target[0] + dr * 0.6 * Math.sin(s * 1.1 + 3), c.target[1] - k * 2 * dist * Math.tan((c.fov * Math.PI) / 360), c.target[2]], fov: c.fov };
}

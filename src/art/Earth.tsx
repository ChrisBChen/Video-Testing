import React, { useMemo } from "react";
import "@react-three/fiber";
import * as THREE from "three";
import { rng } from "../engine/math";
import { R } from "../story";

export const DEPTH = 3;
const tex = (c: HTMLCanvasElement) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
const mk = (w: number, h: number) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };

/** Cutaway face: concentric layers with painterly flow lines. */
function faceTexture() {
  const N = 2048, c = mk(N, N), g = c.getContext("2d")!, px = N / 2 / R, cx = N / 2;
  const ring = (r0: number, r1: number, c0: string, c1: string) => {
    const gr = g.createRadialGradient(cx, cx, r0 * R * px, cx, cx, r1 * R * px); gr.addColorStop(0, c0); gr.addColorStop(1, c1);
    g.fillStyle = gr; g.beginPath(); g.arc(cx, cx, r1 * R * px, 0, Math.PI * 2); g.fill();
  };
  g.fillStyle = "#000"; g.fillRect(0, 0, N, N);
  ring(0.955, 1.0, "#6a4a33", "#4a3223");                  // crust (not to scale: exaggerated)
  ring(0.546, 0.955, "#ff7a30", "#c9401f");                // mantle (hot inside)
  ring(0.191, 0.546, "#ffe36a", "#ffa21f");                // outer core
  ring(0.0, 0.191, "#ffe9a0", "#ffd86a");                  // inner core
  const r = rng(3);
  g.lineCap = "round";
  for (let i = 0; i < 26; i++) {                           // convection flow lines in the mantle
    const a0 = r() * 6.28, rr = (0.6 + r() * 0.33) * R * px, len = 0.2 + r() * 0.5;
    g.strokeStyle = `rgba(255,${190 + r() * 50},120,${0.1 + r() * 0.12})`; g.lineWidth = 6 + r() * 14;
    g.beginPath(); g.arc(cx, cx, rr, a0, a0 + len); g.stroke();
  }
  for (let i = 0; i < 40; i++) {                           // crust strata specks
    const a = r() * 6.28, rr = (0.962 + r() * 0.03) * R * px;
    g.fillStyle = `rgba(255,255,255,${0.05 + r() * 0.08})`; g.fillRect(cx + Math.cos(a) * rr, cx + Math.sin(a) * rr, 5 + r() * 12, 3);
  }
  for (const [rr, col, w] of [[0.955, "#3a2418", 6], [0.546, "#a8301a", 6], [0.191, "#ff9a2a", 5]] as const) {
    g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.arc(cx, cx, rr * R * px, 0, Math.PI * 2); g.stroke();
  }
  return tex(c);
}
function coreGlowTexture() {
  const N = 1024, c = mk(N, N), g = c.getContext("2d")!, px = N / 2 / R, cx = N / 2;
  g.fillStyle = "#000"; g.fillRect(0, 0, N, N);
  let gr = g.createRadialGradient(cx, cx, 0, cx, cx, 0.191 * R * px); gr.addColorStop(0, "#ffe9a0"); gr.addColorStop(1, "#d99a3a");
  g.fillStyle = gr; g.beginPath(); g.arc(cx, cx, 0.191 * R * px, 0, 7); g.fill();
  gr = g.createRadialGradient(cx, cx, 0.191 * R * px, cx, cx, 0.546 * R * px); gr.addColorStop(0, "#7a3a00"); gr.addColorStop(1, "#000");
  g.fillStyle = gr; g.beginPath(); g.arc(cx, cx, 0.546 * R * px, 0, 7); g.arc(cx, cx, 0.191 * R * px, 0, 7, true); g.fill("evenodd");
  return tex(c);
}
/** Surface strip (u = angle / 2pi): land at the top, tropical island at the bottom, ocean elsewhere. */
function surfaceTexture() {
  const W = 2048, H = 64, c = mk(W, H), g = c.getContext("2d")!;
  const U = (a: number) => (((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) / (2 * Math.PI) * W;
  g.fillStyle = "#2a74d6"; g.fillRect(0, 0, W, H);
  const r = rng(8);
  g.fillStyle = "rgba(255,255,255,0.18)"; for (let i = 0; i < 220; i++) g.fillRect(r() * W, r() * H, 14 + r() * 26, 2);
  const land = (a: number, half: number, c1: string, c2: string) => {
    const x0 = U(a - half), w = (half * 2 / (2 * Math.PI)) * W;
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, c1); gr.addColorStop(1, c2);
    g.fillStyle = gr; g.fillRect(x0, 0, w, H);
  };
  land(Math.PI / 2, 0.62, "#79d24f", "#3f9a3a");
  land(Math.PI / 2 + 0.95, 0.25, "#8dd85a", "#47a03d");
  land(Math.PI * 1.5, 0.42, "#f4dc9a", "#d9b66a");
  land(0.2, 0.35, "#79d24f", "#3f9a3a"); land(3.9, 0.3, "#9ad45a", "#4fa83e");
  return tex(c);
}
function sideGeometry() {
  const N = 256, pos: number[] = [], uv: number[] = [], nor: number[] = [], idx: number[] = [];
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    pos.push(R * c, R * s, 0, R * c, R * s, -DEPTH); nor.push(c, s, 0, c, s, 0); uv.push(i / N, 1, i / N, 0);
  }
  for (let i = 0; i < N; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); return g;
}
const signTexture = () => {
  const c = mk(256, 160), g = c.getContext("2d")!;
  g.fillStyle = "#fffdf5"; g.fillRect(0, 0, 256, 160); g.strokeStyle = "#e8453c"; g.lineWidth = 14; g.strokeRect(7, 7, 242, 146);
  g.fillStyle = "#e8453c"; g.font = "800 46px Poppins, sans-serif"; g.textAlign = "center"; g.fillText("DO NOT", 128, 70); g.fillText("ENTER", 128, 120);
  return tex(c);
};

/** Place something standing on the rim at angle `a` (rad from +x), depth `z`, `off` units above the ground. */
const onRim = (a: number, z: number, off = 0): { position: [number, number, number]; rotation: [number, number, number] } => ({
  position: [(R + off) * Math.cos(a), (R + off) * Math.sin(a), z], rotation: [0, 0, a - Math.PI / 2],
});
const Tree: React.FC<{ s?: number }> = ({ s = 1 }) => (
  <group scale={s}>
    <mesh position={[0, 0.3, 0]} castShadow><cylinderGeometry args={[0.1, 0.14, 0.6, 8]} /><meshStandardMaterial color="#7a4a2b" roughness={0.9} /></mesh>
    <mesh position={[0, 0.95, 0]} castShadow><coneGeometry args={[0.55, 0.9, 10]} /><meshStandardMaterial color="#2f9a4a" roughness={0.8} /></mesh>
    <mesh position={[0, 1.45, 0]} castShadow><coneGeometry args={[0.4, 0.75, 10]} /><meshStandardMaterial color="#3fb85a" roughness={0.8} /></mesh>
  </group>
);
const Palm: React.FC = () => (
  <group>
    {[0, 1, 2, 3, 4].map((i) => <mesh key={i} position={[0.1 * i * 0.5 + i * 0.04, 0.3 + i * 0.42, 0]} rotation={[0, 0, -0.1 - i * 0.03]} castShadow><cylinderGeometry args={[0.09 - i * 0.008, 0.11 - i * 0.008, 0.46, 8]} /><meshStandardMaterial color="#9a6a3a" roughness={0.9} /></mesh>)}
    {[0, 1, 2, 3, 4, 5].map((i) => <group key={i} position={[0.55, 2.2, 0]} rotation={[0, (i / 6) * Math.PI * 2, 0]}><mesh position={[0.5, -0.1, 0]} rotation={[0, 0, -0.55]} scale={[1, 0.12, 0.35]} castShadow><sphereGeometry args={[0.65, 12, 8]} /><meshStandardMaterial color="#2fb85a" roughness={0.7} /></mesh></group>)}
    <mesh position={[0.62, 2.1, 0.1]}><sphereGeometry args={[0.1, 10, 8]} /><meshStandardMaterial color="#7a4a2b" /></mesh>
  </group>
);
const Cone: React.FC = () => (
  <group>
    <mesh position={[0, 0.3, 0]} castShadow><coneGeometry args={[0.2, 0.6, 14]} /><meshStandardMaterial color="#ff7a1f" roughness={0.5} /></mesh>
    <mesh position={[0, 0.32, 0]}><cylinderGeometry args={[0.13, 0.15, 0.1, 14]} /><meshStandardMaterial color="#fff" /></mesh>
    <mesh position={[0, 0.02, 0]}><boxGeometry args={[0.5, 0.04, 0.5]} /><meshStandardMaterial color="#d9601a" /></mesh>
  </group>
);

export const Earth: React.FC<{ coreGlow?: number }> = ({ coreGlow = 0.6 }) => {
  const face = useMemo(faceTexture, []), glow = useMemo(coreGlowTexture, []), surf = useMemo(surfaceTexture, []), side = useMemo(sideGeometry, []), sign = useMemo(signTexture, []);
  return (
    <group>
      <mesh position={[0, 0, 0.001]} receiveShadow><circleGeometry args={[R, 128]} /><meshStandardMaterial map={face} emissiveMap={glow} emissive="#ffffff" emissiveIntensity={coreGlow} roughness={0.85} /></mesh>
      <mesh geometry={side} receiveShadow castShadow><meshStandardMaterial map={surf} roughness={0.85} side={THREE.DoubleSide} /></mesh>
      <mesh position={[0, 0, -DEPTH]} rotation={[0, Math.PI, 0]}><circleGeometry args={[R, 96]} /><meshStandardMaterial color="#3a2a22" /></mesh>
      <mesh position={[0, 0, -DEPTH - 0.05]}><ringGeometry args={[R + 0.05, R + 0.7, 128]} /><meshBasicMaterial color="#7fc4ff" transparent opacity={0.25} /></mesh>
      {([[1, 0], [-1, Math.PI]] as const).map(([k, rot], i) => (
        <group key={i} position={[0, k * R, 0.0]} rotation={[0, 0, rot]}>
          <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[1.28, 32, 0, Math.PI]} /><meshStandardMaterial color="#05060f" side={THREE.DoubleSide} /></mesh>
          <mesh position={[0, 0.03, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[1.31, 0.05, 8, 28, Math.PI]} /><meshStandardMaterial color="#ffd23f" emissive="#ffb000" emissiveIntensity={0.5} roughness={0.4} /></mesh>
        </group>))}
      <group {...onRim(Math.PI / 2 + 0.28, -1.3)}><Tree s={1.2} /></group>
      <group {...onRim(Math.PI / 2 + 0.42, -2.2)}><Tree s={0.9} /></group>
      <group {...onRim(Math.PI / 2 + 0.55, -0.7)}><Tree s={1.0} /></group>
      <group {...onRim(Math.PI / 2 - 0.5, -1.0)}><Tree s={1.1} /></group>
      <group {...onRim(Math.PI / 2 - 0.34, -2.3)}><Tree s={0.8} /></group>
      <group {...onRim(Math.PI / 2 + 0.2, -0.5)}><Cone /></group>
      <group {...onRim(Math.PI / 2 - 0.16, -0.5)}><Cone /></group>
      <group {...onRim(Math.PI / 2 - 0.2, -0.35)}>
        <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.04, 0.04, 1.0, 6]} /><meshStandardMaterial color="#9aa0b8" /></mesh>
        <mesh position={[0, 1.15, 0]} castShadow><boxGeometry args={[0.95, 0.6, 0.05]} /><meshStandardMaterial map={sign} /></mesh>
      </group>
      <group {...onRim(Math.PI * 1.5 - 0.32, -1.3)}><Palm /></group>
      <group {...onRim(Math.PI * 1.5 + 0.34, -1.0)}><Palm /></group>
      <group {...onRim(Math.PI * 1.5 + 0.18, -0.4)}>
        <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.03, 0.03, 1.0, 6]} /><meshStandardMaterial color="#fff" /></mesh>
        <mesh position={[0, 1.05, 0]} castShadow><coneGeometry args={[0.65, 0.3, 14]} /><meshStandardMaterial color="#ff4d6d" /></mesh>
      </group>
    </group>
  );
};

/** Glass vacuum tube between p0 and p1, revealing from p0 as `reveal` goes 0..1. */
export const Tube: React.FC<{ p0: [number, number, number]; p1: [number, number, number]; r: number; color: string; reveal?: number; rings?: boolean }> = ({ p0, p1, r, color, reveal = 1, rings = false }) => {
  const d = new THREE.Vector3(p1[0] - p0[0], p1[1] - p0[1], 0), L = d.length(), dir = d.clone().normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  const len = L * reveal;
  const mid: [number, number, number] = [p0[0] + dir.x * len / 2, p0[1] + dir.y * len / 2, 0.02];
  const n = rings ? Math.floor(L / 2.4) : 0;
  return (
    <group position={mid} quaternion={q}>
      <mesh><cylinderGeometry args={[r, r, Math.max(0.001, len), 28, 1, true, -Math.PI / 2, Math.PI]} /><meshStandardMaterial color={color} transparent opacity={0.16} side={THREE.DoubleSide} roughness={0.1} emissive={color} emissiveIntensity={0.25} /></mesh>
      {[-1, 1].map((s) => <mesh key={s} position={[s * r, 0, 0]}><cylinderGeometry args={[0.035, 0.035, Math.max(0.001, len), 6]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.6} toneMapped={false} /></mesh>)}
      {Array.from({ length: n }, (_, i) => { const y = -len / 2 + (i + 0.5) * (L / n); return y < len / 2 ? <mesh key={i} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[r, 0.03, 6, 24, Math.PI]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.2} toneMapped={false} /></mesh> : null; })}
    </group>
  );
};

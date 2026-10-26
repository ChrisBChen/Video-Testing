import React, { useMemo } from "react";
import "@react-three/fiber";
import * as THREE from "three";
import { rng, smooth } from "../engine/math";
import { R } from "../story";
import { useEnv } from "../engine/env";

const tex = (c: HTMLCanvasElement, srgb = true) => { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 2; return t; };
const mk = (w: number, h: number) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };

// ---- seeded 3D value noise, so continents are seamless on the sphere and identical on every render ----
const hash = (a: number, b: number, c: number) => { let n = (a * 127 + b * 311 + c * 743 + 1013) | 0; n = (n << 13) ^ n; return 1 - (((n * (n * n * 15731 + 789221) + 1376312589) & 0x7fffffff) / 1073741824); };
const vnoise = (x: number, y: number, z: number) => {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const L = (a: number, b: number, t: number) => a + (b - a) * t;
  return L(L(L(hash(xi, yi, zi), hash(xi + 1, yi, zi), u), L(hash(xi, yi + 1, zi), hash(xi + 1, yi + 1, zi), u), v),
           L(L(hash(xi, yi, zi + 1), hash(xi + 1, yi, zi + 1), u), L(hash(xi, yi + 1, zi + 1), hash(xi + 1, yi + 1, zi + 1), u), v), w);
};
const fbm = (x: number, y: number, z: number, oct = 5) => { let a = 0.5, f = 1, s = 0; for (let i = 0; i < oct; i++) { s += a * vnoise(x * f, y * f, z * f); f *= 2.05; a *= 0.5; } return s; };
const mix = (a: number[], b: number[], t: number) => a.map((v, i) => v + (b[i] - v) * Math.min(1, Math.max(0, t)));
const ss = (a: number, b: number, v: number) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

/** Hemisphere surface texture: u spans 180 degrees of longitude (phi: pi..2pi), v spans pole to pole. */
function surfaceTexture() {
  const N = 768, c = mk(N, N), g = c.getContext("2d")!, img = g.createImageData(N, N), d = img.data;
  const deep = [20, 64, 150], mid = [38, 112, 214], shallow = [92, 192, 232], sand = [236, 218, 160], grass1 = [112, 202, 78], grass2 = [58, 150, 62], rock = [138, 108, 78], snow = [244, 248, 255];
  for (let j = 0; j < N; j++) {
    const th = (j / (N - 1)) * Math.PI;                  // 0 at the top pole
    for (let i = 0; i < N; i++) {
      const ph = Math.PI + (i / (N - 1)) * Math.PI;
      const dx = -Math.cos(ph) * Math.sin(th), dy = Math.cos(th), dz = Math.sin(ph) * Math.sin(th);
      let n = fbm(dx * 2.3 + 7, dy * 2.3 + 3, dz * 2.3 + 11, 4) * 1.6;
      const north = 1 - ss(0.2, 0.62, th), south = ss(Math.PI - 0.62, Math.PI - 0.2, th);
      n = Math.max(n, 0.62 * north + 0.0, 0.5 * south);
      const thr = 0.5;
      let col: number[];
      if (n < thr) {
        const dep = ss(thr - 0.34, thr - 0.02, n);
        col = mix(mix(deep, mid, dep * 1.6), shallow, ss(thr - 0.08, thr, n));
      } else {
        const h = (n - thr) * 4;
        col = mix(mix(sand, grass1, ss(0, 0.2, h)), mix(grass2, rock, ss(0.45, 1.0, h)), ss(0.2, 0.55, h));
        if (h > 1.05 && north < 0.2 && south < 0.2) col = mix(col, snow, ss(1.05, 1.3, h));
      }
      const k = (j * N + i) * 4; d[k] = col[0]; d[k + 1] = col[1]; d[k + 2] = col[2]; d[k + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return tex(c);
}
function cloudTexture() {
  const N = 640, c = mk(N, N), g = c.getContext("2d")!, img = g.createImageData(N, N), d = img.data;
  for (let j = 0; j < N; j++) {
    const th = (j / (N - 1)) * Math.PI;
    for (let i = 0; i < N; i++) {
      const ph = Math.PI + (i / (N - 1)) * Math.PI;
      const dx = -Math.cos(ph) * Math.sin(th), dy = Math.cos(th), dz = Math.sin(ph) * Math.sin(th);
      const n = fbm(dx * 3.1 + 40, dy * 4.2 + 9, dz * 3.1 + 5, 4);
      const a = ss(0.52, 0.7, n) * ss(0.85, 1.25, th) * (1 - ss(Math.PI - 1.25, Math.PI - 0.85, th)) * 0.8;
      const k = (j * N + i) * 4; d[k] = 255; d[k + 1] = 255; d[k + 2] = 255; d[k + 3] = a * 255;
    }
  }
  g.putImageData(img, 0, 0);
  return tex(c);
}
/** The cut face: concentric layers with painterly flow lines and crisp boundary lines. */
function faceTexture() {
  const N = 2048, c = mk(N, N), g = c.getContext("2d")!, px = N / 2 / R, cx = N / 2;
  const ring = (r0: number, r1: number, c0: string, c1: string) => {
    const gr = g.createRadialGradient(cx, cx, r0 * R * px, cx, cx, r1 * R * px); gr.addColorStop(0, c0); gr.addColorStop(1, c1);
    g.fillStyle = gr; g.beginPath(); g.arc(cx, cx, r1 * R * px, 0, Math.PI * 2); g.fill();
  };
  g.fillStyle = "#000"; g.fillRect(0, 0, N, N);
  ring(0.955, 1.0, "#7a563a", "#4f3425");
  ring(0.546, 0.955, "#ff8a3a", "#c63d1f");
  ring(0.191, 0.546, "#ffe36a", "#ffa21f");
  ring(0.0, 0.191, "#ffeaa8", "#ffd86a");
  const r = rng(3); g.lineCap = "round";
  for (let i = 0; i < 40; i++) {
    const a0 = r() * 6.28, rr = (0.58 + r() * 0.36) * R * px, len = 0.2 + r() * 0.6;
    g.strokeStyle = `rgba(255,${190 + r() * 50},120,${0.1 + r() * 0.14})`; g.lineWidth = 5 + r() * 16;
    g.beginPath(); g.arc(cx, cx, rr, a0, a0 + len); g.stroke();
  }
  for (let i = 0; i < 60; i++) {
    const a = r() * 6.28, rr = (0.962 + r() * 0.03) * R * px;
    g.fillStyle = `rgba(255,255,255,${0.05 + r() * 0.08})`; g.fillRect(cx + Math.cos(a) * rr, cx + Math.sin(a) * rr, 5 + r() * 12, 3);
  }
  for (const [rr, col, w] of [[0.955, "#2c1a10", 7], [0.546, "#9a2c18", 7], [0.191, "#ff9a2a", 6]] as const) {
    g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.arc(cx, cx, rr * R * px, 0, Math.PI * 2); g.stroke();
  }
  return tex(c);
}
function faceGlowTexture() {
  const N = 1024, c = mk(N, N), g = c.getContext("2d")!, px = N / 2 / R, cx = N / 2;
  g.fillStyle = "#000"; g.fillRect(0, 0, N, N);
  let gr = g.createRadialGradient(cx, cx, 0, cx, cx, 0.191 * R * px); gr.addColorStop(0, "#fff0c0"); gr.addColorStop(1, "#e8a040");
  g.fillStyle = gr; g.beginPath(); g.arc(cx, cx, 0.191 * R * px, 0, 7); g.fill();
  gr = g.createRadialGradient(cx, cx, 0.191 * R * px, cx, cx, 0.546 * R * px); gr.addColorStop(0, "#8a4400"); gr.addColorStop(1, "#000");
  g.fillStyle = gr; g.beginPath(); g.arc(cx, cx, 0.546 * R * px, 0, 7); g.arc(cx, cx, 0.191 * R * px, 0, 7, true); g.fill("evenodd");
  g.strokeStyle = "rgba(255,255,255,0.55)"; g.lineWidth = 3;
  for (const rr of [0.955, 0.546, 0.191]) { g.beginPath(); g.arc(cx, cx, rr * R * px, 0, Math.PI * 2); g.stroke(); }
  return tex(c);
}
const signTexture = () => {
  const c = mk(256, 160), g = c.getContext("2d")!;
  g.fillStyle = "#fffdf5"; g.fillRect(0, 0, 256, 160); g.strokeStyle = "#e8453c"; g.lineWidth = 14; g.strokeRect(7, 7, 242, 146);
  g.fillStyle = "#e8453c"; g.font = "800 46px Poppins, sans-serif"; g.textAlign = "center"; g.fillText("DO NOT", 128, 70); g.fillText("ENTER", 128, 120);
  return tex(c);
};

/** Surface point (x, z offsets from the pole axis; `up` = +1 near the top pole, -1 near the bottom one) + orientation along the normal. */
export function onSphere(x: number, z: number, up: 1 | -1 = 1, off = 0) {
  const h = Math.sqrt(R * R - x * x - z * z), n = new THREE.Vector3(x, up * h, z).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
  return { position: n.clone().multiplyScalar(R + off).toArray() as [number, number, number], quaternion: q };
}
const At: React.FC<{ x: number; z: number; up?: 1 | -1; yaw?: number; children: React.ReactNode }> = ({ x, z, up = 1, yaw = 0, children }) => {
  const o = onSphere(x, z, up);
  return <group position={o.position} quaternion={o.quaternion}><group rotation={[0, yaw, 0]}>{children}</group></group>;
};
const Tree: React.FC<{ s?: number }> = ({ s = 1 }) => (
  <group scale={s}>
    <mesh position={[0, 0.3, 0]} castShadow><cylinderGeometry args={[0.1, 0.15, 0.6, 10]} /><meshStandardMaterial color="#7a4a2b" roughness={0.9} /></mesh>
    <mesh position={[0, 0.95, 0]} castShadow><coneGeometry args={[0.58, 0.95, 14]} /><meshStandardMaterial color="#2f9a4a" roughness={0.75} /></mesh>
    <mesh position={[0, 1.5, 0]} castShadow><coneGeometry args={[0.42, 0.8, 14]} /><meshStandardMaterial color="#42bd5e" roughness={0.75} /></mesh>
  </group>
);
const Palm: React.FC = () => (
  <group>
    {[0, 1, 2, 3, 4].map((i) => <mesh key={i} position={[0.03 * i * i * 0.5 + i * 0.04, 0.3 + i * 0.42, 0]} rotation={[0, 0, -0.1 - i * 0.04]} castShadow><cylinderGeometry args={[0.09 - i * 0.008, 0.11 - i * 0.008, 0.46, 8]} /><meshStandardMaterial color="#a67846" roughness={0.9} /></mesh>)}
    {[0, 1, 2, 3, 4, 5].map((i) => <group key={i} position={[0.55, 2.2, 0]} rotation={[0, (i / 6) * Math.PI * 2, 0]}><mesh position={[0.5, -0.1, 0]} rotation={[0, 0, -0.55]} scale={[1, 0.12, 0.35]} castShadow><sphereGeometry args={[0.65, 12, 8]} /><meshStandardMaterial color="#2fb85a" roughness={0.7} /></mesh></group>)}
    <mesh position={[0.62, 2.1, 0.1]}><sphereGeometry args={[0.1, 10, 8]} /><meshStandardMaterial color="#7a4a2b" /></mesh>
  </group>
);
const Cone: React.FC = () => (
  <group>
    <mesh position={[0, 0.3, 0]} castShadow><coneGeometry args={[0.2, 0.6, 18]} /><meshStandardMaterial color="#ff7a1f" roughness={0.45} /></mesh>
    <mesh position={[0, 0.32, 0]}><cylinderGeometry args={[0.13, 0.15, 0.1, 18]} /><meshStandardMaterial color="#fff" roughness={0.5} /></mesh>
    <mesh position={[0, 0.02, 0]}><boxGeometry args={[0.5, 0.04, 0.5]} /><meshStandardMaterial color="#d9601a" /></mesh>
  </group>
);
const Rock: React.FC<{ s?: number }> = ({ s = 1 }) => <mesh position={[0, 0.15 * s, 0]} scale={[s, s * 0.7, s]} castShadow><dodecahedronGeometry args={[0.3, 0]} /><meshStandardMaterial color="#9a96b0" roughness={0.9} flatShading /></mesh>;

function atmosphereTexture() {
  const N = 512, c = mk(N, N), g = c.getContext("2d")!, e = 0.769;
  const gr = g.createRadialGradient(N / 2, N / 2, N / 2 * e * 0.97, N / 2, N / 2, N / 2);
  gr.addColorStop(0, "rgba(120,190,255,0.0)"); gr.addColorStop(0.06, "rgba(140,205,255,0.95)"); gr.addColorStop(0.28, "rgba(80,150,255,0.38)"); gr.addColorStop(1, "rgba(40,80,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, N, N); return tex(c);
}

export const Earth: React.FC<{ coreGlow?: number; s?: number; atmosphere?: number; wide?: boolean }> = ({ coreGlow = 0.55, s = 0, atmosphere = 1, wide = true }) => {
  const surf = useMemo(surfaceTexture, []), clouds = useMemo(cloudTexture, []), face = useMemo(faceTexture, []), glow = useMemo(faceGlowTexture, []), sign = useMemo(signTexture, []);
  const atmo = useMemo(atmosphereTexture, []);
  return (
    <group>
      {/* the planet: one hemisphere (z < 0), seen through the cut */}
      <mesh castShadow receiveShadow><sphereGeometry args={[R, 96, 72, Math.PI, Math.PI]} /><meshStandardMaterial map={surf} roughness={0.78} side={THREE.DoubleSide} /></mesh>
      {wide && <group rotation={[0, s * 0.012, 0]}><mesh><sphereGeometry args={[R * 1.04, 64, 48, Math.PI, Math.PI]} /><meshStandardMaterial map={clouds} transparent depthWrite={false} roughness={1} side={THREE.DoubleSide} /></mesh></group>}
      {atmosphere > 0.01 && <mesh position={[0, 0, -0.6]}><planeGeometry args={[R * 2 * 1.3, R * 2 * 1.3]} /><meshBasicMaterial map={atmo} transparent opacity={atmosphere} depthWrite={false} blending={THREE.AdditiveBlending} /></mesh>}
      {/* the cut face */}
      <mesh position={[0, 0, 0.001]} receiveShadow><circleGeometry args={[R, 96]} /><meshStandardMaterial map={face} emissiveMap={glow} emissive="#ffffff" emissiveIntensity={coreGlow} roughness={0.7} /></mesh>
      <mesh position={[0, 0, 0.004]}><ringGeometry args={[R - 0.08, R + 0.02, 96]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.55} /></mesh>

      {/* the two ends of the tunnel: a round hole with a hazard-yellow lip, half of it removed by the cut */}
      {([[1, 0], [-1, Math.PI]] as const).map(([k, rot], i) => (
        <group key={i} position={[0, k * (R - 0.03), 0]} rotation={[0, 0, rot]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[1.27, 48, 0, Math.PI]} /><meshStandardMaterial color="#04050f" side={THREE.DoubleSide} /></mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[1.31, 0.07, 12, 40, Math.PI]} /><meshStandardMaterial color="#ffd23f" emissive="#ffb000" emissiveIntensity={0.45} roughness={0.35} /></mesh>
        </group>))}

      {/* north: a little park around the hole */}
      <At x={-6.4} z={-2.6}><Tree s={1.3} /></At><At x={-5.0} z={-5.4}><Tree s={1.0} /></At><At x={-7.8} z={-5.2}><Tree s={1.15} /></At>
      <At x={4.6} z={-3.2}><Tree s={1.2} /></At><At x={6.6} z={-1.2}><Tree s={0.9} /></At><At x={6.0} z={-5.6}><Tree s={1.1} /></At><At x={2.6} z={-6.4}><Tree s={0.85} /></At>
      <At x={-1.7} z={-0.45}><Cone /></At><At x={1.7} z={-0.55}><Cone /></At><At x={-3.9} z={-1.4}><Rock s={1.1} /></At><At x={3.5} z={-1.5}><Rock s={0.8} /></At>
      <At x={2.9} z={-0.7} yaw={-0.35}>
        <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.04, 0.04, 1.0, 8]} /><meshStandardMaterial color="#aab0c8" metalness={0.5} roughness={0.4} /></mesh>
        <mesh position={[0, 1.15, 0]} castShadow><boxGeometry args={[1.0, 0.62, 0.05]} /><meshStandardMaterial map={sign} /></mesh>
      </At>
      {/* south: a tropical island on the far side */}
      <At x={-4.2} z={-2.4} up={-1} yaw={Math.PI}><Palm /></At><At x={4.0} z={-1.9} up={-1} yaw={Math.PI}><Palm /></At><At x={6.4} z={-4.4} up={-1} yaw={Math.PI}><Palm /></At>
      <At x={2.4} z={-0.7} up={-1} yaw={Math.PI}>
        <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.03, 0.03, 1.0, 8]} /><meshStandardMaterial color="#fff" /></mesh>
        <mesh position={[0, 1.05, 0]} castShadow><coneGeometry args={[0.7, 0.32, 20]} /><meshStandardMaterial color="#ff4d6d" roughness={0.5} /></mesh>
      </At>
      <At x={-2.0} z={-0.5} up={-1} yaw={Math.PI}><Rock s={0.9} /></At>
    </group>
  );
};

/** Glass vacuum tube between p0 and p1 (revealing from p0 as `reveal` goes 0..1), with a dark groove behind it so the contents pop. */
export const Tube: React.FC<{ p0: [number, number, number]; p1: [number, number, number]; r: number; color: string; reveal?: number; rings?: boolean; flow?: number }> = ({ p0, p1, r, color, reveal = 1, rings = false, flow = 0 }) => {
  const d = new THREE.Vector3(p1[0] - p0[0], p1[1] - p0[1], 0), L = d.length(), dir = d.clone().normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  const len = L * reveal;
  const mid: [number, number, number] = [p0[0] + dir.x * len / 2, p0[1] + dir.y * len / 2, 0.02];
  const env = useEnv();
  const n = rings ? Math.floor(L / 2.4) : 0;
  const groove = Math.min(1, (2 * (R - 0.05)) / Math.max(0.001, len)) * (L > 2 * R + 0.5 ? 1 : 1);
  return (
    <group position={mid} quaternion={q}>
      <mesh position={[0, 0, -0.012]} scale={[1, groove, 1]}><planeGeometry args={[r * 2.15, Math.max(0.001, len)]} /><meshBasicMaterial color="#060920" transparent opacity={0.86} /></mesh>
      <mesh><cylinderGeometry args={[r, r, Math.max(0.001, len), 56, 1, true]} /><meshStandardMaterial color={color} transparent opacity={0.14} roughness={0.05} metalness={0.2} envMap={env} envMapIntensity={2.2} emissive={color} emissiveIntensity={0.2} side={THREE.DoubleSide} depthWrite={false} /></mesh>
      {[-1, 1].map((sd) => <mesh key={sd} position={[sd * r, 0, 0]}><cylinderGeometry args={[0.045, 0.045, Math.max(0.001, len), 8]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.2} toneMapped={false} /></mesh>)}
      {Array.from({ length: n }, (_, i) => {
        const base = (i + 0.5) * (L / n); const y = -len / 2 + base;
        const pulse = rings ? 0.5 + 0.5 * Math.sin(flow * 6 - i * 0.9) : 0.5;
        return y < len / 2 ? <mesh key={i} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[r, 0.035, 8, 40]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8 + 1.8 * pulse} toneMapped={false} /></mesh> : null;
      })}
    </group>
  );
};

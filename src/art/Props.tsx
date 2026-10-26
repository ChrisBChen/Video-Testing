import React, { useMemo } from "react";
import "@react-three/fiber";
import * as THREE from "three";

const Y = new THREE.Vector3(0, 1, 0);
/** Arrow in the XY plane from `from` along `vec` (length = |vec|). */
export const Arrow: React.FC<{ from: [number, number, number]; vec: [number, number]; color: string; width?: number; opacity?: number; glow?: number }> = ({ from, vec, color, width = 0.12, opacity = 1, glow = 1.4 }) => {
  const L = Math.hypot(vec[0], vec[1]);
  if (L < 0.02) return null;
  const dir = new THREE.Vector3(vec[0] / L, vec[1] / L, 0);
  const q = new THREE.Quaternion().setFromUnitVectors(Y, dir);
  const head = Math.min(0.5, L * 0.45), shaft = Math.max(0.001, L - head);
  const m = <meshStandardMaterial color={color} emissive={color} emissiveIntensity={glow} transparent={opacity < 1} opacity={opacity} toneMapped={false} />;
  return (
    <group position={from} quaternion={q}>
      <mesh position={[0, shaft / 2, 0]}><cylinderGeometry args={[width, width, shaft, 12]} />{m}</mesh>
      <mesh position={[0, shaft + head / 2, 0]}><coneGeometry args={[width * 2.2, head, 14]} />{m}</mesh>
    </group>
  );
};

/** Glass capsule pod; its long axis follows `dir`. */
export const Pod: React.FC<{ pos: [number, number, number]; dir: [number, number, number]; r: number; len: number; color: string; scale?: number; core?: boolean }> = ({ pos, dir, r, len, color, scale = 1, core = true }) => {
  const q = useMemo(() => new THREE.Quaternion().setFromUnitVectors(Y, new THREE.Vector3(dir[0], dir[1], 0).normalize()), [dir[0], dir[1]]);
  return (
    <group position={pos} quaternion={q} scale={scale}>
      <mesh><capsuleGeometry args={[r, len, 10, 28]} /><meshStandardMaterial color={color} transparent opacity={0.28} roughness={0.08} metalness={0.1} emissive={color} emissiveIntensity={0.35} depthWrite={false} /></mesh>
      <mesh><capsuleGeometry args={[r * 1.02, len, 10, 28]} /><meshBasicMaterial color={color} wireframe transparent opacity={0.18} /></mesh>
      {core && <mesh><sphereGeometry args={[r * 0.45, 16, 12]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} toneMapped={false} /></mesh>}
    </group>
  );
};

/** Expanding ring flash (pop). t in 0..1. */
export const Pulse: React.FC<{ pos: [number, number, number]; t: number; color: string; size?: number }> = ({ pos, t, color, size = 4 }) =>
  t <= 0 || t >= 1 ? null : (
    <mesh position={pos} scale={0.3 + t * size}><ringGeometry args={[0.85, 1, 48]} /><meshBasicMaterial color={color} transparent opacity={(1 - t) * 0.9} depthWrite={false} /></mesh>
  );

export const Backdrop: React.FC = () => {
  const t = useMemo(() => {
    const c = document.createElement("canvas"); c.width = c.height = 512; const g = c.getContext("2d")!;
    const gr = g.createRadialGradient(256, 256, 120, 256, 256, 256); gr.addColorStop(0, "rgba(90,150,255,0.22)"); gr.addColorStop(0.55, "rgba(70,90,255,0.07)"); gr.addColorStop(1, "rgba(40,40,160,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 512, 512); const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx;
  }, []);
  return <mesh position={[0, 0, -55]}><planeGeometry args={[190, 190]} /><meshBasicMaterial map={t} transparent depthWrite={false} blending={THREE.AdditiveBlending} /></mesh>;
};

let haloTex: THREE.CanvasTexture | null = null;
/** Soft additive glow sprite (a poor man's bloom). */
export const Halo: React.FC<{ pos: [number, number, number]; size: number; color: string; opacity?: number }> = ({ pos, size, color, opacity = 0.8 }) => {
  const t = useMemo(() => {
    if (!haloTex) {
      const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d")!;
      const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.25, "rgba(255,255,255,0.55)"); gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr; g.fillRect(0, 0, 128, 128); haloTex = new THREE.CanvasTexture(c);
    }
    return haloTex;
  }, []);
  return <mesh position={pos} scale={size}><planeGeometry args={[1, 1]} /><meshBasicMaterial map={t} color={color} transparent opacity={opacity} depthWrite={false} blending={THREE.AdditiveBlending} /></mesh>;
};

/** A horizontal scan-line flash at height y (used when Pip crosses a layer boundary). t in 0..1. */
export const Scan: React.FC<{ y: number; t: number; color?: string }> = ({ y, t, color = "#bff6ff" }) =>
  t <= 0 || t >= 1 ? null : (
    <mesh position={[0, y, 0.7]} scale={[1 + t * 0.4, 1 - t * 0.5, 1]}><planeGeometry args={[6, 0.14]} /><meshBasicMaterial color={color} transparent opacity={(1 - t) * 0.5} depthWrite={false} blending={THREE.AdditiveBlending} /></mesh>
  );

/** Seeded 3D starfield with real parallax when the camera orbits. */
export const Stars: React.FC = () => {
  const geo = useMemo(() => {
    let a = 7; const r = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
    const n = 900, p = new Float32Array(n * 3), c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      p[i * 3] = (r() - 0.5) * 340; p[i * 3 + 1] = (r() - 0.5) * 420; p[i * 3 + 2] = -70 - r() * 160;
      const k = 0.55 + r() * 0.45, warm = r(); c[i * 3] = k * (warm > 0.8 ? 1 : 0.85); c[i * 3 + 1] = k * 0.9; c[i * 3 + 2] = k * (warm > 0.8 ? 0.8 : 1);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(p, 3)); g.setAttribute("color", new THREE.BufferAttribute(c, 3)); return g;
  }, []);
  return <points geometry={geo}><pointsMaterial size={3.2} sizeAttenuation={false} vertexColors transparent opacity={0.95} depthWrite={false} /></points>;
};

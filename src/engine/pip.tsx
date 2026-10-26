import React from "react";
import "@react-three/fiber";
import * as THREE from "three";
import { useEnv } from "./env";

/**
 * Pip: a round little astronaut, the recurring protagonist of the series.
 * Faceless in the Kurzgesagt / WALL-E tradition: the expression lives on a dark visor as glowing eyes,
 * brows and a mouth, so it stays readable at tiny sizes and in any pose.
 * Origin = torso centre; +z = the way he faces; standing height ~2.1 units; boots at y = -FOOT.
 * Fully pose-driven: every frame is a pure function of props.
 */
export const FOOT = 0.93;
export type Face = "calm" | "happy" | "wide" | "worried" | "yell" | "awe" | "smug" | "dizzy";
export interface PipPose {
  armLx?: number; armLz?: number; elbL?: number; armRx?: number; armRz?: number; elbR?: number;
  legLx?: number; legLz?: number; kneeL?: number; legRx?: number; legRz?: number; kneeR?: number;
  lean?: number; twist?: number; headX?: number; headY?: number; headZ?: number;
  face?: Face; look?: [number, number]; blink?: number; squash?: number; antenna?: number;
}
const C = { suit: "#f4f6ff", shade: "#cfd6f0", orange: "#ff8a2a", dark: "#171c45", glow: "#7ff3ff", pack: "#dde3f7", warn: "#ff5d73" };
let ENV: THREE.Texture | null = null;
const S = (color: string, rough = 0.5, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) => <meshStandardMaterial color={color} roughness={rough} metalness={0.03} envMap={ENV} envMapIntensity={0.75} {...extra} />;
const Glow = (c: string = C.glow, k = 1.6) => <meshStandardMaterial color={c} emissive={c} emissiveIntensity={k} roughness={0.4} toneMapped={false} />;

const Limb: React.FC<{ r: number; len: number; color: string; end?: React.ReactNode }> = ({ r, len, color, end }) => (
  <group>
    <mesh position={[0, -len / 2, 0]} castShadow><capsuleGeometry args={[r, Math.max(0.001, len - 2 * r), 6, 18]} />{S(color)}</mesh>
    {end && <group position={[0, -len, 0]}>{end}</group>}
  </group>
);
const Arm: React.FC<{ side: 1 | -1; sx: number; sz: number; el: number }> = ({ side, sx, sz, el }) => (
  <group position={[0.4 * side, 0.18, 0]} rotation={[sx, 0, side * (0.2 + sz)]}>
    <mesh castShadow><sphereGeometry args={[0.13, 16, 12]} />{S(C.suit)}</mesh>
    <Limb r={0.105} len={0.3} color={C.suit} end={
      <group rotation={[el, 0, 0]}>
        <Limb r={0.1} len={0.26} color={C.suit} end={
          <group>
            <mesh position={[0, -0.02, 0]} castShadow><sphereGeometry args={[0.135, 18, 14]} />{S(C.orange, 0.45)}</mesh>
            <mesh position={[0, 0.1, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow><torusGeometry args={[0.105, 0.03, 8, 20]} />{S(C.shade)}</mesh>
          </group>} />
      </group>} />
  </group>
);
const Leg: React.FC<{ side: 1 | -1; lx: number; lz: number; kn: number }> = ({ side, lx, lz, kn }) => (
  <group position={[0.17 * side, -0.24, 0]} rotation={[lx, 0, lz]}>
    <Limb r={0.135} len={0.34} color={C.suit} end={
      <group rotation={[kn, 0, 0]}>
        <Limb r={0.125} len={0.3} color={C.suit} end={
          <group>
            <mesh position={[0, -0.05, 0.06]} scale={[1, 0.7, 1.45]} castShadow><sphereGeometry args={[0.16, 18, 14]} />{S(C.orange, 0.45)}</mesh>
            <mesh position={[0, 0.07, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow><torusGeometry args={[0.12, 0.03, 8, 20]} />{S(C.shade)}</mesh>
          </group>} />
      </group>} />
  </group>
);

const Eyes: React.FC<{ face: Face; look: [number, number]; blink: number }> = ({ face, look, blink }) => {
  const open = (1 - blink);
  const eye = (s: 1 | -1) => {
    const x = 0.125 * s + look[0] * 0.02, y = 0.04 + look[1] * 0.02;
    if (face === "happy" || face === "smug") return <mesh key={s} position={[x, y - 0.01, 0.0]} rotation={[0, 0, 0]}><torusGeometry args={[0.065, 0.02, 8, 18, Math.PI]} />{Glow()}</mesh>;
    if (face === "dizzy") return <group key={s} position={[x, y, 0]}>
      <mesh rotation={[0, 0, Math.PI / 4]}><boxGeometry args={[0.15, 0.03, 0.03]} />{Glow(C.warn)}</mesh>
      <mesh rotation={[0, 0, -Math.PI / 4]}><boxGeometry args={[0.15, 0.03, 0.03]} />{Glow(C.warn)}</mesh></group>;
    const big = face === "wide" || face === "yell" || face === "awe" ? 1.35 : face === "worried" ? 1.1 : 1;
    const sy = 1;
    return <mesh key={s} position={[x, y, 0]} scale={[0.065 * big, 0.085 * big * open * sy + 0.004, 0.02]}><sphereGeometry args={[1, 18, 14]} />{Glow()}</mesh>;
  };
  return <group>{eye(-1)}{eye(1)}</group>;
};
const Brows: React.FC<{ face: Face }> = ({ face }) => {
  const a = face === "worried" || face === "yell" ? -0.4 : face === "smug" ? 0.35 : 0;
  const up = face === "wide" || face === "awe" || face === "yell" ? 0.05 : 0;
  if (face === "calm" || face === "happy" || face === "dizzy") return null;
  return <group>{[-1, 1].map((s) => (
    <mesh key={s} position={[0.125 * s, 0.16 + up, 0]} rotation={[0, 0, s * a]}><boxGeometry args={[0.12, 0.022, 0.02]} />{Glow(C.glow, 1.3)}</mesh>))}</group>;
};
const Mouth: React.FC<{ face: Face }> = ({ face }) => {
  const y = -0.12;
  if (face === "yell") return <mesh position={[0, y - 0.01, 0]} scale={[0.1, 0.075, 0.02]}><sphereGeometry args={[1, 16, 12]} />{Glow("#ffb3c0", 1.4)}</mesh>;
  if (face === "awe") return <mesh position={[0, y, 0]} scale={[0.045, 0.055, 0.02]}><sphereGeometry args={[1, 16, 12]} />{Glow()}</mesh>;
  if (face === "wide") return <mesh position={[0, y, 0]} scale={[0.05, 0.04, 0.02]}><sphereGeometry args={[1, 16, 12]} />{Glow()}</mesh>;
  if (face === "worried") return <mesh position={[0, y - 0.015, 0]} rotation={[0, 0, 0]}><torusGeometry args={[0.07, 0.016, 8, 16, Math.PI]} />{Glow()}</mesh>;
  if (face === "dizzy") return <mesh position={[0, y, 0]}><boxGeometry args={[0.1, 0.02, 0.02]} />{Glow(C.warn)}</mesh>;
  if (face === "calm") return <mesh position={[0, y, 0]}><boxGeometry args={[0.09, 0.018, 0.02]} />{Glow()}</mesh>;
  // happy / smug: a smile arc (torus half rotated)
  return <mesh position={[0, y + 0.045, 0]} rotation={[0, 0, Math.PI]} scale={face === "smug" ? [1.1, 0.7, 1] : [1.1, 1, 1]}><torusGeometry args={[0.075, 0.017, 8, 18, Math.PI]} />{Glow()}</mesh>;
};

export const Pip: React.FC<{ pose?: PipPose; position?: [number, number, number]; rotation?: [number, number, number]; quaternion?: [number, number, number, number]; scale?: number }> = ({ pose = {}, position = [0, 0, 0], rotation = [0, 0, 0], quaternion, scale = 1 }) => {
  const p = { armLx: 0, armLz: 0, elbL: 0, armRx: 0, armRz: 0, elbR: 0, legLx: 0, legLz: 0, kneeL: 0, legRx: 0, legRz: 0, kneeR: 0, lean: 0, twist: 0, headX: 0, headY: 0, headZ: 0, face: "calm" as Face, look: [0, 0] as [number, number], blink: 0, squash: 1, antenna: 0, ...pose };
  ENV = useEnv();
  const sq = p.squash, st = 1 / Math.sqrt(sq);
  return (
    <group position={position} {...(quaternion ? { quaternion } : { rotation })} scale={scale}>
      <group scale={[st, sq, st]}>
        <Leg side={1} lx={p.legRx} lz={p.legRz} kn={p.kneeR} />
        <Leg side={-1} lx={p.legLx} lz={p.legLz} kn={p.kneeL} />
        <group rotation={[p.lean, p.twist, 0]}>
          {/* body */}
          <mesh castShadow scale={[1, 1.05, 0.9]}><capsuleGeometry args={[0.36, 0.22, 8, 28]} />{S(C.suit)}</mesh>
          <mesh position={[0, -0.2, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.9, 1]}><torusGeometry args={[0.35, 0.035, 10, 32]} />{S(C.orange, 0.45)}</mesh>
          <mesh position={[0, 0.02, 0.31]} castShadow><boxGeometry args={[0.26, 0.2, 0.06]} />{S(C.orange, 0.4)}</mesh>
          <mesh position={[-0.06, 0.02, 0.345]}><sphereGeometry args={[0.025, 10, 8]} />{Glow("#7dff9b")}</mesh>
          <mesh position={[0.06, 0.02, 0.345]}><sphereGeometry args={[0.025, 10, 8]} />{Glow("#ffd95e")}</mesh>
          {/* life-support pack */}
          <mesh position={[0, 0.05, -0.36]} castShadow><boxGeometry args={[0.42, 0.52, 0.2]} />{S(C.pack, 0.55)}</mesh>
          <mesh position={[0, 0.05, -0.465]}><boxGeometry args={[0.3, 0.06, 0.02]} />{S(C.orange)}</mesh>
          <mesh position={[-0.12, -0.27, -0.38]} rotation={[0.2, 0, 0]}><cylinderGeometry args={[0.05, 0.065, 0.1, 12]} />{S("#8a93b8", 0.4)}</mesh>
          <mesh position={[0.12, -0.27, -0.38]} rotation={[0.2, 0, 0]}><cylinderGeometry args={[0.05, 0.065, 0.1, 12]} />{S("#8a93b8", 0.4)}</mesh>
          <Arm side={1} sx={p.armRx} sz={p.armRz} el={p.elbR} />
          <Arm side={-1} sx={p.armLx} sz={p.armLz} el={p.elbL} />
          {/* helmet */}
          <group position={[0, 0.79, 0]} rotation={[p.headX, p.headY, p.headZ]}>
            <mesh position={[0, -0.4, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.24, 0.05, 10, 28]} />{S(C.orange, 0.45)}</mesh>
            <mesh castShadow><sphereGeometry args={[0.5, 48, 36]} /><meshStandardMaterial color={C.suit} roughness={0.22} metalness={0.05} envMap={ENV} envMapIntensity={0.9} /></mesh>
            {/* visor: glossy dark glass */}
            <mesh position={[0, 0.0, 0.2]} scale={[1, 0.8, 0.78]} castShadow><sphereGeometry args={[0.4, 36, 28]} /><meshStandardMaterial color="#0c1030" roughness={0.04} metalness={0.55} envMap={ENV} envMapIntensity={1.6} /></mesh>
            <mesh position={[-0.13, 0.17, 0.47]} rotation={[0, 0.1, 0.4]} scale={[0.1, 0.035, 0.012]}><sphereGeometry args={[1, 14, 10]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.55} /></mesh>
            {/* the face */}
            <group position={[0, 0.0, 0.5]}><Eyes face={p.face} look={p.look} blink={p.blink} /><Brows face={p.face} /><Mouth face={p.face} /></group>
            {/* ear pods + antenna */}
            {[-1, 1].map((s) => <mesh key={s} position={[0.5 * s, 0, -0.02]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.1, 0.1, 0.1, 18]} />{S(C.orange, 0.45)}</mesh>)}
            <group position={[0.2, 0.46, -0.1]} rotation={[0.2, 0, -0.35 + p.antenna * 0.3]}>
              <mesh position={[0, 0.12, 0]}><cylinderGeometry args={[0.012, 0.012, 0.24, 6]} />{S(C.shade)}</mesh>
              <mesh position={[0, 0.27, 0]}>{<sphereGeometry args={[0.045, 12, 10]} />}{Glow(C.warn, 1.2)}</mesh>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
};

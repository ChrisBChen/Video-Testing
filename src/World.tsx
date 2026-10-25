import React from "react";
import "@react-three/fiber";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Earth, Tube } from "./art/Earth";
import { Arrow, Backdrop, Halo, Pod, Pulse } from "./art/Props";
import { Pip } from "./engine/pip";
import { E, R, A_PIP, TUNNELS, camera, pipState, podAt, raceTau } from "./story";
import { clamp, inv, smooth, spring } from "./engine/math";

const Rig: React.FC<{ s: number }> = ({ s }) => {
  const { camera: cam } = useThree();
  const c = camera(s);
  const pc = cam as THREE.PerspectiveCamera;
  pc.fov = c.fov; pc.position.set(...c.pos); pc.up.set(0, 1, 0); pc.lookAt(...c.target); pc.near = 0.5; pc.far = 400; pc.updateProjectionMatrix(); pc.updateMatrixWorld(true);
  return null;
};

export const World: React.FC<{ s: number }> = ({ s }) => {
  const cam = camera(s);
  const pip = pipState(s);
  const tgt: [number, number, number] = cam.target;
  const wide = s > E.zoomOut + 1.5 && s < E.outro + 1.0;
  const podVis = (i: number) => s >= TUNNELS[i].appear;
  const reveal = (i: number) => (i === 0 ? 1 : smooth(inv(TUNNELS[i].appear - 0.6, TUNNELS[i].appear + 0.5, s)));

  // center: gravity from every side cancels
  const cen = inv(E.center - 1.4, E.center - 0.6, s) * (1 - inv(E.center + 2.6, E.center + 3.4, s));
  const pipPos = pip.pos;
  // arrival + finish pulses
  const arrivalT = inv(E.arrival, E.arrival + 0.9, s);
  const endT = inv(E.raceEnd, E.raceEnd + 1.0, s);
  const explain = s >= E.explain;
  const podOut = 1 - smooth(inv(E.raceEnd + 0.5, E.raceEnd + 1.1, s));
  const arrowsOut = 1 - smooth(inv(E.outro - 0.8, E.outro + 0.1, s));

  return (
    <>
      <Rig s={s} />
      <hemisphereLight args={["#cfe0ff", "#4a3a7a", wide ? 1.15 : 0.95]} />
      <directionalLight position={[tgt[0] + 7, tgt[1] + 10, tgt[2] + 14]} intensity={2.3} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-9} shadow-camera-right={9} shadow-camera-top={9} shadow-camera-bottom={-9} shadow-camera-near={1} shadow-camera-far={60} shadow-bias={-0.0006} shadow-normalBias={0.03}>
        <object3D attach="target" position={tgt} />
      </directionalLight>
      <directionalLight position={[-8, 3, -6]} intensity={1.1} color="#7fb0ff" />
      <pointLight position={[0, 0, 3]} intensity={12 * (0.2 + cen)} color="#ffb04a" distance={14} decay={2} />
      <Backdrop />
      <Earth coreGlow={0.3 + cen * 0.3} />

      {/* the vacuum tube through the middle (and the two extra tunnels once revealed) */}
      <Tube p0={[0, -A_PIP, 0]} p1={[0, A_PIP, 0]} r={1.25} color="#46e6ff" rings />
      {([1, 2] as const).map((i) => reveal(i) > 0 ? <Tube key={i} p0={TUNNELS[i].p1} p1={TUNNELS[i].p2} r={i === 1 ? 0.9 : 0.72} color={TUNNELS[i].color} reveal={reveal(i)} /> : null)}

      {pip.visible && <Pip position={pip.pos} rotation={pip.rot} pose={pip.pose} scale={pip.scale} />}

      {/* center: eight equal pulls cancel */}
      {cen > 0.02 && Array.from({ length: 8 }, (_, k) => {
        const a = (k / 8) * Math.PI * 2 + s * 0.15, rr = 2.9 - 0.25 * Math.sin(s * 5 + k);
        return <Arrow key={k} from={[pipPos[0] + Math.cos(a) * rr, pipPos[1] + Math.sin(a) * rr, 0.6]} vec={[-Math.cos(a) * 1.15 * cen, -Math.sin(a) * 1.15 * cen]} color="#46e6ff" width={0.09} opacity={0.9 * cen} />;
      })}

      <Pulse pos={[0, -A_PIP, 0.6]} t={arrivalT} color="#46e6ff" size={7} />

      {/* the race */}
      {TUNNELS.map((t, i) => {
        if (!podVis(i)) return null;
        const p = podAt(i, s), k = spring((s - t.appear) / 1, 12, 5);
        const trail = Array.from({ length: 16 }, (_, j) => {
          const ts = s - (j + 1) * 0.07; if (ts < E.raceStart || s > E.raceEnd + 0.6) return null;
          const q = podAt(i, Math.min(ts, E.raceEnd));
          return <mesh key={j} position={[q.pos[0], q.pos[1], 0.25]} scale={(i === 0 ? 0.9 : 0.6) * (1 - j / 18)}><sphereGeometry args={[1, 10, 8]} /><meshBasicMaterial color={t.color} transparent opacity={0.5 * (1 - j / 16)} /></mesh>;
        });
        return (
          <group key={t.id}>
            {trail}
            <Halo pos={[p.pos[0], p.pos[1], 0.6]} size={(i === 0 ? 7 : i === 1 ? 5.5 : 4.5) * Math.max(0.001, k * podOut)} color={t.color} opacity={0.55} />
            <Pod pos={p.pos} dir={p.dir} r={i === 0 ? 1.4 : i === 1 ? 0.85 : 0.66} len={i === 0 ? 1.3 : i === 1 ? 0.3 : 0.2} color={t.color} scale={Math.max(0.001, k * podOut)} core={i !== 0} />
            <Pulse pos={[t.id === "A" ? 0 : t.p2[0], t.id === "A" ? A_PIP : t.p2[1], 0.8]} t={endT} color={t.color} size={i === 0 ? 7 : 4} />
          </group>
        );
      })}

      {/* why: the pull along each tunnel is proportional to how far it is from the middle */}
      {explain && TUNNELS.map((t, i) => {
        const k = smooth(inv(E.explain + 0.3 + i * 0.5, E.explain + 1.0 + i * 0.5, s)) * arrowsOut;
        const start = t.p2;                       // the end the pods reached = the end we explain from
        const g = Math.hypot(start[0], start[1]);
        const toC: [number, number] = [-start[0] / g, -start[1] / g];
        const e: [number, number] = [t.p1[0] - t.p2[0], t.p1[1] - t.p2[1]]; const L = Math.hypot(e[0], e[1]); e[0] /= L; e[1] /= L;
        const along = toC[0] * e[0] + toC[1] * e[1];
        return (
          <group key={t.id}>
            <Arrow from={[start[0], start[1], 0.9]} vec={[toC[0] * 6.5 * k, toC[1] * 6.5 * k]} color="#ff5d73" width={0.16} opacity={0.6} glow={1} />
            <Arrow from={[start[0] - toC[1] * 0.7, start[1] + toC[0] * 0.7, 1.0]} vec={[e[0] * along * 6.5 * k, e[1] * along * 6.5 * k]} color="#ffe14d" width={0.26} />
          </group>
        );
      })}
    </>
  );
};

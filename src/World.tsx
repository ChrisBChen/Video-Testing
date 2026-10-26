import React, { useMemo } from "react";
import "@react-three/fiber";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { Earth, Tube } from "./art/Earth";
import { Arrow, Backdrop, Halo, Pod, Pulse, Scan, Stars } from "./art/Props";
import { Pip } from "./engine/pip";
import { E, R, A_PIP, TUNNELS, camera, pipState, podAt, tauFall } from "./story";
import { inv, rng, smooth, spring } from "./engine/math";
import { OMEGA } from "./engine/physics";
import { EnvContext } from "./engine/env";

/** Studio reflections for every material (glossy visor, glass tube): generated once per page. */
let envTex: THREE.Texture | null = null;
const useEnvTexture = () => {
  const { gl } = useThree();
  return useMemo(() => { if (!envTex) { const pm = new THREE.PMREMGenerator(gl); envTex = pm.fromScene(new RoomEnvironment(), 0.03).texture; } return envTex; }, [gl]);
};
const Rig: React.FC<{ s: number }> = ({ s }) => {
  const { camera: cam } = useThree();
  const c = camera(s), pc = cam as THREE.PerspectiveCamera;
  pc.fov = c.fov; pc.position.set(...c.pos); pc.up.set(0, 1, 0); pc.lookAt(...c.target); pc.near = 0.5; pc.far = 600; pc.updateProjectionMatrix(); pc.updateMatrixWorld(true);
  return null;
};

// When does Pip cross each layer boundary (for the scan-line flashes)? Computed once from the same physics.
const BOUNDS = [0.955, 0.546, 0.191].map((f) => f * R).flatMap((b) => [b, -b]);
const CROSS: { t: number; y: number }[] = (() => {
  const out: { t: number; y: number }[] = []; let prev = A_PIP;
  for (let s = E.jump; s <= E.arrival; s += 0.005) {
    const y = A_PIP * Math.cos(OMEGA * tauFall(s));
    for (const b of BOUNDS) if ((prev - b) * (y - b) < 0) out.push({ t: s, y: b });
    prev = y;
  }
  return out;
})();
const STREAKS = (() => { const r = rng(5); return Array.from({ length: 44 }, () => ({ x: (r() - 0.5) * 1.7, y: (r() - 0.5) * 2 * A_PIP, z: 0.1 + r() * 0.8, w: 0.025 + r() * 0.03 })); })();

export const World: React.FC<{ s: number }> = ({ s }) => {
  const env = useEnvTexture();
  const cam = camera(s), pip = pipState(s);
  const tgt: [number, number, number] = cam.target;
  const podVis = (i: number) => s >= TUNNELS[i].appear;
  const reveal = (i: number) => (i === 0 ? 1 : smooth(inv(TUNNELS[i].appear - 0.6, TUNNELS[i].appear + 0.5, s)));
  const cen = inv(E.center - 1.4, E.center - 0.6, s) * (1 - inv(E.center + 2.6, E.center + 3.4, s));
  const arrivalT = inv(E.arrival, E.arrival + 0.9, s), endT = inv(E.raceEnd, E.raceEnd + 1.0, s);
  const explain = s >= E.explain;
  const podOut = 1 - smooth(inv(E.raceEnd + 0.5, E.raceEnd + 1.1, s));
  const arrowsOut = 1 - smooth(inv(E.outro - 0.8, E.outro + 0.1, s));
  const falling = s > E.jump && s < E.arrival;
  const tau = falling ? tauFall(s) : 0, sp = Math.abs(Math.sin(OMEGA * tau));

  return (
    <EnvContext.Provider value={env}>
      <Rig s={s} />
      <hemisphereLight args={["#cfe0ff", "#5a4a8a", 0.55]} />
      <directionalLight position={[tgt[0] + 8, tgt[1] + 11, tgt[2] + 14]} intensity={2.0} color="#fff3e0" castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-9} shadow-camera-right={9} shadow-camera-top={9} shadow-camera-bottom={-9} shadow-camera-near={1} shadow-camera-far={70} shadow-bias={-0.0006} shadow-normalBias={0.04}>
        <object3D attach="target" position={tgt} />
      </directionalLight>
      <directionalLight position={[-14, 9, -10]} intensity={1.0} color="#ffb877" />
      <directionalLight position={[10, -6, 6]} intensity={0.8} color="#6fa8ff" />
      <pointLight position={[0, 0, 3]} intensity={14 * (0.2 + cen)} color="#ffb04a" distance={16} decay={2} />

      <Stars />

      <Earth coreGlow={0.35 + cen * 0.3} s={s} atmosphere={smooth(inv(34, 62, Math.hypot(cam.pos[0], cam.pos[1], cam.pos[2])))} wide={Math.hypot(cam.pos[0], cam.pos[1], cam.pos[2]) > 40} />

      <Tube p0={[0, -A_PIP, 0]} p1={[0, A_PIP, 0]} r={1.25} color="#46e6ff" rings flow={s} />
      {([1, 2] as const).map((i) => reveal(i) > 0 ? <Tube key={i} p0={TUNNELS[i].p1} p1={TUNNELS[i].p2} r={i === 1 ? 0.9 : 0.72} color={TUNNELS[i].color} reveal={reveal(i)} /> : null)}

      {/* speed streaks inside the tube, stretched by his actual speed */}
      {falling && STREAKS.map((k, i) => <mesh key={i} position={[k.x, k.y, 0.15 + k.z * 0.6]} scale={[k.w, 0.2 + 5.5 * sp * sp, k.w]}><boxGeometry args={[1, 1, 1]} /><meshBasicMaterial color="#bff6ff" transparent opacity={0.12 + 0.5 * sp} depthWrite={false} blending={THREE.AdditiveBlending} /></mesh>)}
      {CROSS.map((c, i) => <Scan key={i} y={c.y} t={(s - c.t) / 0.7} />)}

      {pip.visible && <Pip position={pip.pos} quaternion={pip.q} pose={pip.pose} scale={pip.scale} />}

      {cen > 0.02 && Array.from({ length: 8 }, (_, k) => {
        const a = (k / 8) * Math.PI * 2 + s * 0.15, rr = 2.9 - 0.25 * Math.sin(s * 5 + k), p = pip.pos;
        return <Arrow key={k} from={[p[0] + Math.cos(a) * rr, p[1] + Math.sin(a) * rr, 0.6]} vec={[-Math.cos(a) * 1.15 * cen, -Math.sin(a) * 1.15 * cen]} color="#46e6ff" width={0.09} opacity={0.9 * cen} />;
      })}
      <Pulse pos={[0, -A_PIP, 0.6]} t={arrivalT} color="#46e6ff" size={7} />

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

      {explain && TUNNELS.map((t, i) => {
        const k = smooth(inv(E.explain + 0.3 + i * 0.5, E.explain + 1.0 + i * 0.5, s)) * arrowsOut;
        const start = t.p2, g = Math.hypot(start[0], start[1]);
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
    </EnvContext.Provider>
  );
};

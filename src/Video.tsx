import React, { useLayoutEffect, useMemo, useState } from "react";
import { AbsoluteFill, Audio, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { World } from "./World";
import { Hud } from "./components/Hud";
import { Captions } from "./components/Captions";
import { FPS } from "./story";
import { rng } from "./engine/math";

const Stars: React.FC = () => {
  const dots = useMemo(() => { const r = rng(42); return Array.from({ length: 160 }, () => ({ x: r() * 1080, y: r() * 1920, s: 2 + r() * 4, o: 0.25 + r() * 0.7 })); }, []);
  return <>{dots.map((d, i) => <div key={i} style={{ position: "absolute", left: d.x, top: d.y, width: d.s, height: d.s, borderRadius: "50%", background: "#fff", opacity: d.o }} />)}</>;
};

export const Video: React.FC = () => {
  const frame = useCurrentFrame();
  const s = frame / FPS;
  const [handle] = useState(() => delayRender("fonts"));
  useLayoutEffect(() => {
    Promise.all([600, 700, 800].map((w) => { const ff = new FontFace("Poppins", `url(${staticFile(`fonts/Poppins-${w}.woff2`)})`, { weight: String(w) }); return ff.load().then(() => (document.fonts as any).add(ff)); }))
      .then(() => continueRender(handle));
  }, [handle]);
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 38%, #26307a 0%, #121a4e 45%, #0a0e2e 100%)" }}>
      <Stars />
      <ThreeCanvas width={1080} height={1920} camera={{ position: [0, 0, 30], fov: 40 }} shadows gl={{ alpha: true, antialias: true }}>
        <World s={s} />
      </ThreeCanvas>
      <Hud s={s} />
      <Captions />
      <Audio src={staticFile("audio/mix.wav")} />
    </AbsoluteFill>
  );
};

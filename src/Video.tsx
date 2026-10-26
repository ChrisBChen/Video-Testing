import React, { useLayoutEffect, useState } from "react";
import { AbsoluteFill, Audio, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { World } from "./World";
import { Hud } from "./components/Hud";
import { Captions } from "./components/Captions";
import { FPS } from "./story";

export const Video: React.FC = () => {
  const frame = useCurrentFrame();
  const s = frame / FPS;
  const [handle] = useState(() => delayRender("fonts"));
  useLayoutEffect(() => {
    Promise.all([600, 700, 800].map((w) => { const ff = new FontFace("Poppins", `url(${staticFile(`fonts/Poppins-${w}.woff2`)})`, { weight: String(w) }); return ff.load().then(() => (document.fonts as any).add(ff)); }))
      .then(() => continueRender(handle));
  }, [handle]);
  return (
    <AbsoluteFill style={{ background: "radial-gradient(circle at 12% 7%, rgba(255,230,170,0.34) 0%, rgba(255,230,170,0) 17%), radial-gradient(ellipse at 88% 80%, rgba(110,60,255,0.2) 0%, rgba(110,60,255,0) 45%), radial-gradient(ellipse at 14% 96%, rgba(0,184,212,0.14) 0%, rgba(0,184,212,0) 42%), radial-gradient(ellipse at 50% 40%, #1b2563 0%, #0e1542 50%, #060920 100%)" }}>
      <ThreeCanvas width={1080} height={1920} camera={{ position: [0, 0, 30], fov: 40 }} shadows="percentage" gl={{ alpha: true, antialias: true }}>
        <World s={s} />
      </ThreeCanvas>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 44%, rgba(0,0,0,0) 52%, rgba(3,5,22,0.55) 100%)" }} />
      <Hud s={s} />
      <Captions />
      <Audio src={staticFile("audio/mix.wav")} />
    </AbsoluteFill>
  );
};

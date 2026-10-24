import React, { useLayoutEffect, useRef, useState } from "react";
import { AbsoluteFill, Audio, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import { renderFrame } from "./engine/render";
import { W, H, SCALE } from "./engine/px";
import { Captions } from "./components/Captions";

export const Video: React.FC = () => {
  const frame = useCurrentFrame();
  const ref = useRef<HTMLCanvasElement>(null);
  const [handle] = useState(() => delayRender("font"));
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const ff = new FontFace("PressStart2P", `url(${staticFile("fonts/PressStart2P.woff2")})`);
    ff.load().then(() => { (document.fonts as any).add(ff); setReady(true); continueRender(handle); });
  }, [handle]);

  useLayoutEffect(() => {
    if (!ready) return;
    const g = ref.current!.getContext("2d")!;
    g.setTransform(1, 0, 0, 1, 0, 0);
    renderFrame(g, frame);
  }, [frame, ready]);

  return (
    <AbsoluteFill style={{ background: "#171226" }}>
      <canvas ref={ref} width={W} height={H} style={{ width: W * SCALE, height: H * SCALE, imageRendering: "pixelated" }} />
      <Captions />
      <Audio src={staticFile("audio/mix.wav")} />
    </AbsoluteFill>
  );
};

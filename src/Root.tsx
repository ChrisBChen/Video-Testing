import React from "react";
import { Composition } from "remotion";
import { Video } from "./Video";
import { FPS, TOTAL_FRAMES } from "./engine/timeline";

export const Root: React.FC = () => (
  <Composition id="Friction" component={Video} durationInFrames={TOTAL_FRAMES} fps={FPS} width={1080} height={1920} />
);

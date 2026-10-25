import React from "react";
import { Composition } from "remotion";
import { Video } from "./Video";
import { FPS, TOTAL } from "./story";
export const Root: React.FC = () => <Composition id="Tunnel" component={Video} durationInFrames={TOTAL} fps={FPS} width={1080} height={1920} />;

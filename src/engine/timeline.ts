import timeline from "../data/timeline.json";

/** The configurable timeline: edit src/data/timeline.json to retime scenes. */
export const FPS = timeline.fps;
export const TOTAL_FRAMES = timeline.totalFrames;
/** Frame at which friction switches back on (HUD clock hits 0:30). */
export const RETURN_FRAME = timeline.returnFrame;
export interface SceneDef { id: string; from: number; dur: number }
export const SCENES: SceneDef[] = timeline.scenes;
export const TRANSITIONS: { at: number; kind: "dissolve" | "iris" | "wipe" | "flash"; dur: number }[] = timeline.transitions as any;

export const sceneIndexAt = (f: number) => {
  let idx = 0;
  for (let i = 0; i < SCENES.length; i++) if (f >= SCENES[i].from) idx = i;
  return idx;
};

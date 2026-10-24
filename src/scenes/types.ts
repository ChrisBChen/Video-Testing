import { G } from "../engine/px";
/** A scene draws itself as a pure function of its local frame `t` (and global frame `f`). */
export type SceneFn = (g: G, t: number, f: number) => void;

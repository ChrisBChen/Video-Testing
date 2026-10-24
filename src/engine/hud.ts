import { C } from "./palette";
import { G, rect, text, panel, disc } from "./px";
import { RETURN_FRAME } from "./timeline";

/** Persistent experiment clock: it shows the 30 s hypothetical running in real time. */
export function drawHud(g: G, f: number) {
  const on = f >= RETURN_FRAME;
  const sim = Math.min(30, (f / RETURN_FRAME) * 30);
  const sec = Math.floor(sim);
  const blink = on ? 1 : (f % 30 < 18 ? 1 : 0);
  panel(g, 12, 33, 156, 17, C.plum, C.ink);
  disc(g, 22, 41, 3, blink ? (on ? C.lime : C.red) : (on ? C.greenD : C.redD));
  text(g, on ? "FRICTION ON" : "FRICTION OFF", 30, 37, on ? C.lime : C.white, { outline: null });
  const t = `0:${String(sec).padStart(2, "0")}`;
  text(g, t, 160, 37, sim > 26 && !on ? C.yellow : C.white, { align: "right", outline: null });
  rect(g, 12, 53, 156, 3, C.ink);
  rect(g, 13, 54, Math.round((154 * sim) / 30), 1, on ? C.lime : C.orange);
}

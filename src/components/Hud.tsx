import React from "react";
import { E, R, TUNNELS, camera, raceTau, podAt, tauFall, A_PIP } from "../story";
import { fmtClock, HALF_TRIP, kmh, OMEGA, V_MAX_KMH } from "../engine/physics";
import { clamp, inv, smooth, spring, easeOut } from "../engine/math";
import { project } from "../engine/project";

const F = "Poppins, system-ui, sans-serif";
const glass: React.CSSProperties = { background: "linear-gradient(180deg, rgba(16,26,76,0.68), rgba(8,12,40,0.7))", border: "2px solid rgba(127,243,255,0.42)", borderRadius: 28, boxShadow: "0 12px 44px rgba(0,0,0,0.38), inset 0 0 34px rgba(127,243,255,0.07)", color: "#fff", fontFamily: F };
const Panel: React.FC<{ x: number; y: number; w: number; label: string; value: string; color: string; sub?: string; h?: number }> = ({ x, y, w, label, value, color, sub, h = 128 }) => (
  <div style={{ ...glass, position: "absolute", left: x, top: y, width: w, height: h, padding: "14px 26px", boxSizing: "border-box" }}>
    <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: 3, color: "rgba(255,255,255,0.65)" }}>{label}</div>
    <div style={{ fontSize: 58, fontWeight: 800, color, lineHeight: 1.1, fontVariantNumeric: "tabular-nums", textShadow: `0 0 24px ${color}66` }}>{value}{sub && <span style={{ fontSize: 26, marginLeft: 10, color: "rgba(255,255,255,0.7)" }}>{sub}</span>}</div>
  </div>
);
const pop = (s: number, t0: number, t1: number) => { const k = spring((s - t0) / 0.9, 13, 6); const fade = s > t1 ? 1 - clamp((s - t1) / 0.3) : 1; return s < t0 ? 0 : Math.max(0, k) * fade; };

const LAYERS: { name: string; depth: string; y: number }[] = [
  { name: "CRUST", depth: "0–35 km", y: 11.75 }, { name: "MANTLE", depth: "to 2,900 km", y: 9.0 }, { name: "OUTER CORE", depth: "to 5,150 km", y: 4.4 }, { name: "INNER CORE", depth: "6,371 km: the center", y: 0 },
  { name: "OUTER CORE", depth: "", y: -4.4 }, { name: "MANTLE", depth: "", y: -9.0 }, { name: "CRUST", depth: "", y: -11.75 },
];

export const Hud: React.FC<{ s: number }> = ({ s }) => {
  const cam = camera(s);
  const racing = s >= E.zoomOut + 2.4 && s < E.outro - 0.2;
  const falling = s >= E.jump && s < E.zoomOut + 1;
  const tau = s >= E.zoomOut + 2.4 ? raceTau(s) : s >= E.jump ? (s >= E.arrival ? HALF_TRIP : tauFall(s)) : 0;
  const speed = falling ? V_MAX_KMH * Math.abs(Math.sin(OMEGA * tau)) : 0;
  const hudIn = smooth(inv(E.jump - 0.3, E.jump + 0.3, s)) * (1 - smooth(inv(E.outro - 0.2, E.outro + 0.6, s)));
  const titleK = s < E.jump ? 1 * (1 - clamp((s - 1.9) / 0.4)) : 0;
  const showLabels = s > E.jump + 0.5 && s < E.arrival + 0.5;
  const finalNote = s > E.outro - 1.0;

  return (
    <div style={{ position: "absolute", inset: 0, fontFamily: F, pointerEvents: "none" }}>
      {/* hook title */}
      {titleK > 0.01 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 215, textAlign: "center", transform: `scale(${0.85 + 0.15 * titleK})`, opacity: Math.min(1, titleK * 1.4) }}>
          <div style={{ fontSize: 56, fontWeight: 800, color: "#fff", letterSpacing: 1, lineHeight: 1.12, textShadow: "0 6px 0 rgba(10,14,46,0.9), 0 0 40px rgba(127,243,255,0.7)" }}>WHAT IF YOU JUMPED</div>
          <div style={{ fontSize: 78, fontWeight: 800, color: "#7ff3ff", lineHeight: 1.1, textShadow: "0 7px 0 rgba(10,14,46,0.9), 0 0 50px rgba(127,243,255,0.9)" }}>THROUGH THE EARTH?</div>
        </div>
      )}
      {/* clock + speed */}
      {hudIn > 0.01 && !racing && (
        <div style={{ opacity: hudIn, transform: `translateY(${(1 - hudIn) * -30}px)` }}>
          <Panel x={60} y={180} w={440} label="ELAPSED" value={fmtClock(tau)} color="#7ff3ff" />
          <Panel x={540} y={180} w={480} label="SPEED" value={kmh(speed)} sub="km/h" color="#ffb02e" />
        </div>
      )}
      {racing && (
        <div>
          <Panel x={60} y={150} w={440} label="ELAPSED" value={fmtClock(tau)} color="#7ff3ff" h={112} />
          {TUNNELS.map((t, i) => {
            const p = podAt(i, s), v = t.kmh * p.speedFrac, appear = s >= t.appear;
            return (
              <div key={t.id} style={{ ...glass, position: "absolute", left: 60 + i * 322, top: 276, width: 308, height: 104, padding: "8px 16px", boxSizing: "border-box", opacity: appear ? 1 : 0.25, borderColor: t.color }}>
                <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 1.5, color: t.color, whiteSpace: "nowrap" }}>{["CENTER", "NYC → LA", "ACROSS TOWN"][i]}</div>
                <div style={{ fontSize: 34, fontWeight: 800, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{i === 2 ? v.toFixed(0) : kmh(v)}<span style={{ fontSize: 20, marginLeft: 6, color: "rgba(255,255,255,0.7)" }}>km/h</span></div>
              </div>);
          })}
        </div>
      )}
      {/* layer labels beside the falling astronaut */}
      {showLabels && LAYERS.map((L, i) => {
        const p = project(cam, [1.35, L.y, 0.2]);
        if (!p.visible || p.y < 330 || p.y > 1230) return null;
        const edge = Math.min(inv(330, 480, p.y), inv(1230, 1080, p.y));
        return (
          <div key={i} style={{ position: "absolute", right: 40, top: p.y - 30, opacity: edge * 0.95 }}>
            <div style={{ ...glass, borderRadius: 18, border: "2px solid rgba(255,255,255,0.35)", padding: "6px 18px", display: "inline-block", background: "rgba(10,14,46,0.78)" }}>
              <span style={{ fontSize: 30, fontWeight: 800, letterSpacing: 2 }}>{L.name}</span>
              {L.depth && <span style={{ fontSize: 22, marginLeft: 12, color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>{L.depth}</span>}
            </div>
          </div>);
      })}
      {/* g = 0 */}
      {(() => { const k = pop(s, E.center - 1.1, E.center + 1.4); return k > 0.01 ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: 360, textAlign: "center", transform: `scale(${0.6 + 0.4 * k})`, opacity: Math.min(1, k) }}>
          <div style={{ fontSize: 150, fontWeight: 800, color: "#7ff3ff", textShadow: "0 8px 0 rgba(10,14,46,0.9), 0 0 60px rgba(127,243,255,0.9)", lineHeight: 1 }}>g = 0</div>
          <div style={{ fontSize: 34, fontWeight: 700, color: "#fff", textShadow: "0 3px 0 rgba(10,14,46,0.9)" }}>pulled equally from every side</div>
        </div>) : null; })()}
      {/* space-station comparison */}
      {(() => { const k = pop(s, E.center + 1.7, E.center + 5.7); return k > 0.01 ? (
        <div style={{ position: "absolute", left: 60, width: 960, top: 330, opacity: Math.min(1, k), transform: `translateY(${(1 - Math.min(1, k)) * 30}px)` }}>
          <div style={{ ...glass, padding: "16px 28px" }}>
            {[["PIP, AT THE CENTER", V_MAX_KMH, "#ffb02e"], ["SPACE STATION", 27600, "#9bb3ff"]].map(([n, v, c]) => (
              <div key={n as string} style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, fontWeight: 700 }}><span style={{ color: "rgba(255,255,255,0.75)", letterSpacing: 2 }}>{n}</span><span style={{ color: c as string, fontVariantNumeric: "tabular-nums" }}>{kmh(v as number)} km/h</span></div>
                <div style={{ height: 18, background: "rgba(255,255,255,0.12)", borderRadius: 9, overflow: "hidden" }}><div style={{ width: `${(v as number) / V_MAX_KMH * 100 * easeOut(clamp(k))}%`, height: "100%", background: c as string, borderRadius: 9 }} /></div>
              </div>))}
          </div>
        </div>) : null; })()}
      {/* arrival stopwatch */}
      {(() => { const k = pop(s, E.arrival - 0.1, E.arrival + 2.6); return k > 0.01 ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: 380, textAlign: "center", transform: `scale(${0.55 + 0.45 * k})`, opacity: Math.min(1, k) }}>
          <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: 6, color: "#fff", textShadow: "0 4px 0 rgba(10,14,46,0.9)" }}>OTHER SIDE REACHED</div>
          <div style={{ fontSize: 190, fontWeight: 800, color: "#ffe14d", fontVariantNumeric: "tabular-nums", lineHeight: 1.05, textShadow: "0 9px 0 rgba(10,14,46,0.9), 0 0 70px rgba(255,225,77,0.8)" }}>42:12</div>
        </div>) : null; })()}
      {/* same time! */}
      {(() => { const k = pop(s, E.raceEnd + 0.1, E.explain + 1.2); return k > 0.01 ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: 640, textAlign: "center", transform: `scale(${0.55 + 0.45 * k})`, opacity: Math.min(1, k) }}>
          <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: 5, color: "#fff", textShadow: "0 4px 0 rgba(10,14,46,0.9)" }}>ALL THREE ARRIVE AT</div>
          <div style={{ fontSize: 150, fontWeight: 800, color: "#7dff9b", fontVariantNumeric: "tabular-nums", lineHeight: 1.05, textShadow: "0 9px 0 rgba(10,14,46,0.9), 0 0 60px rgba(125,255,155,0.8)" }}>42:12</div>
        </div>) : null; })()}
      {/* explanation chips next to each gravity arrow */}
      {s > E.explain + 1.0 && s < E.outro && TUNNELS.map((t, i) => {
        const base = project(cam, [t.p2[0], t.p2[1], 0]);
        const off = [[-300, 330], [250, 190], [-300, 240]][i];
        const x = Math.min(900, Math.max(180, base.x + off[0])), y = base.y + off[1];
        const k = pop(s, E.explain + 1.0 + i * 0.5, 99) * (1 - clamp((s - (E.outro - 0.8)) / 0.8));
        const txt = ["STEEP: STRONG PULL", "TILTED: MEDIUM PULL", "FLAT: GENTLE PULL"][i], sub = ["LONG TRIP", "MEDIUM TRIP", "SHORT TRIP"][i];
        return k > 0.01 ? (
          <div key={t.id} style={{ position: "absolute", left: x, top: y, transform: `translate(-50%,-50%) scale(${0.6 + 0.4 * k})`, opacity: Math.min(1, k) }}>
            <div style={{ ...glass, borderColor: t.color, padding: "8px 20px", borderRadius: 22, textAlign: "center" }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#ffe14d", whiteSpace: "nowrap" }}>{txt}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#fff" }}>{sub}</div>
            </div>
          </div>) : null;
      })}
      {(() => { const k = pop(s, E.explain + 3.2, E.outro - 0.5); return k > 0.01 ? (
        <div style={{ position: "absolute", left: 40, right: 40, top: 960, textAlign: "center", transform: `scale(${0.7 + 0.3 * Math.min(1, k)})`, opacity: Math.min(1, k) }}>
          <div style={{ ...glass, display: "inline-block", padding: "16px 34px", borderColor: "#ffe14d" }}>
            <div style={{ fontSize: 46, fontWeight: 800, color: "#ffe14d", lineHeight: 1.15 }}>BIGGER PULL, LONGER TRIP</div>
            <div style={{ fontSize: 58, fontWeight: 800, color: "#fff", lineHeight: 1.15 }}>= SAME TIME</div>
          </div>
        </div>) : null; })()}
      {/* fine print: this is the IDEAL Earth */}
      {s > E.jump && (
        <div style={{ position: "absolute", left: 60, right: 60, top: 1222, textAlign: "center", opacity: 0.92 }}>
          <span style={{ ...glass, display: "inline-block", fontSize: 25, fontWeight: 600, padding: "6px 22px", borderRadius: 18, background: "rgba(10,14,46,0.7)", border: "2px solid rgba(255,255,255,0.25)" }}>
            {finalNote ? "REAL EARTH: ~38 MIN THROUGH THE CENTER (DENSE CORE)" : "IDEAL EARTH: uniform density · no air · no friction · no rotation"}
          </span>
        </div>)}
    </div>
  );
};

import tl from "../data/timeline.json";
import { pchip } from "./math";

/**
 * The physics of the gravity tunnel (idealised, uniform-density Earth, no air, no rotation, no friction).
 * Inside the Earth g(r) = g0 * r / R, so motion along ANY straight tunnel is simple harmonic with
 * omega = sqrt(g0 / R), independent of the tunnel's length. One-way time = pi / omega ~ 42.2 min.
 */
export const R_KM = tl.earth.radiusKm;
export const G0 = tl.earth.g;
export const OMEGA = Math.sqrt(G0 / (R_KM * 1000));                 // rad/s  (1.24e-3)
export const HALF_TRIP = Math.PI / OMEGA;                            // s      (2532)
export const V_MAX_KMH = (OMEGA * R_KM * 1000 * 3.6);                // km/h   (28,458)

/** Video time (s) -> physical time (s) for the fall: a deliberate, variable-rate time-lapse. */
export const fallTau = pchip(tl.fallMap.s, tl.fallMap.tau);

/** Position along a tunnel as a fraction of its half-length, starting at one end: +1 -> -1. */
export const slide = (tau: number) => Math.cos(OMEGA * tau);
/** Speed as a fraction of that tunnel's top speed. */
export const speedFrac = (tau: number) => Math.abs(Math.sin(OMEGA * tau));
export const fmtClock = (tauSec: number) => {
  const t = Math.min(HALF_TRIP, Math.max(0, tauSec));
  const m = Math.floor(t / 60), s = Math.floor(t % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};
export const kmh = (v: number) => Math.round(v).toLocaleString("en-US");

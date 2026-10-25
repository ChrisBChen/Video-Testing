import React from "react";
import { useCurrentFrame } from "remotion";
import captions from "../data/captions.json";

interface Word { w: string; s: number; e: number }
interface Chunk { s: number; e: number; words: Word[] }

/** Karaoke captions in the platform-safe band (y 1290-1446 of 1920). */
export const Captions: React.FC = () => {
  const f = useCurrentFrame();
  const chunk = (captions as Chunk[]).find((c) => f >= c.s && f < c.e);
  if (!chunk) return null;
  const k = Math.min(1, (f - chunk.s + 1) / 4);
  return (
    <div style={{ position: "absolute", left: 50, right: 50, top: 1290, height: 156, display: "flex", alignItems: "center", justifyContent: "center", opacity: k, transform: `translateY(${(1 - k) * 12}px)` }}>
      <div style={{ textAlign: "center", fontFamily: "Poppins", fontWeight: 800, fontSize: 70, lineHeight: 1.12, textTransform: "uppercase", letterSpacing: 1 }}>
        {chunk.words.map((w, i) => {
          const active = f >= w.s && f < w.e;
          return (
            <span key={i} style={{ color: active ? "#ffe14d" : "#ffffff", display: "inline-block", marginRight: 18, transform: active ? "scale(1.08)" : "none",
              WebkitTextStroke: "10px #0a0e2e", paintOrder: "stroke fill", textShadow: "0 6px 0 #0a0e2e, 0 0 24px rgba(10,14,46,0.8)" }}>{w.w}</span>
          );
        })}
      </div>
    </div>
  );
};

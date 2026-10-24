import React from "react";
import { useCurrentFrame } from "remotion";
import captions from "../data/captions.json";

interface Word { w: string; s: number; e: number }
interface Chunk { s: number; e: number; words: Word[] }

/** Word-by-word karaoke captions in the platform-safe band (y 1290-1446 of 1920). */
export const Captions: React.FC = () => {
  const f = useCurrentFrame();
  const chunk = (captions as Chunk[]).find((c) => f >= c.s && f < c.e);
  if (!chunk) return null;
  return (
    <div style={{ position: "absolute", left: 60, right: 60, top: 1290, height: 156, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", fontFamily: "PressStart2P", fontSize: 58, lineHeight: 1.3, textTransform: "uppercase" }}>
        {chunk.words.map((w, i) => {
          const active = f >= w.s && f < w.e;
          const past = f >= w.e;
          return (
            <span key={i} style={{
              color: active ? "#ffd23f" : "#fbf6ea", opacity: past || active ? 1 : 0.92,
              display: "inline-block", marginRight: 20,
              transform: active ? "translateY(-6px)" : "none",
              textShadow: "0 6px 0 #171226, 6px 0 0 #171226, -6px 0 0 #171226, 0 -6px 0 #171226, 6px 6px 0 #171226, -6px -6px 0 #171226, 6px -6px 0 #171226, -6px 6px 0 #171226",
            }}>{w.w}</span>
          );
        })}
      </div>
    </div>
  );
};

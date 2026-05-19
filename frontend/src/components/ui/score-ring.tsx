"use client";
import { useEffect, useRef } from "react";

interface ScoreRingProps {
  pct: number;
  size?: number;
}

export function ScoreRing({ pct, size = 52 }: ScoreRingProps) {
  const fillRef = useRef<SVGCircleElement>(null);
  const strokeW = size <= 52 ? 4.5 : 5;
  const r = (size - strokeW * 2) / 2;
  const circ = 2 * Math.PI * r;
  const targetOffset = circ * (1 - pct / 100);

  useEffect(() => {
    const el = fillRef.current;
    if (!el) return;
    el.style.strokeDashoffset = String(circ);
    import("gsap").then(({ gsap }) => {
      gsap.to(el, {
        strokeDashoffset: targetOffset,
        duration: 1.0,
        ease: "power3.out",
        delay: 0.15,
      });
    });
  }, [pct, circ, targetOffset]);

  // Color based on score — all scores get a meaningful color, no muddy grey
  const color =
    pct >= 80 ? "var(--accent)" :
    pct >= 60 ? "#e8a020" :      // warm amber
    pct >= 40 ? "#c47820" :      // deeper amber
    "#a05c20";                    // muted sienna for low scores — still readable

  const trackColor = "rgba(0,0,0,0.12)"; // neutral track visible on white cards
  const fontSize = size <= 52 ? 11 : 15;

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: "rotate(-90deg)" }}
      >
        {/* Track — visible neutral ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeW}
        />
        {/* Fill arc */}
        <circle
          ref={fillRef}
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeW}
          strokeDasharray={circ}
          strokeDashoffset={circ}
          strokeLinecap="round"
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 1,
        }}
      >
        <span
          className="font-mono"
          style={{ fontSize, fontWeight: 700, color, lineHeight: 1 }}
        >
          {pct}%
        </span>
        {size >= 64 && (
          <span style={{ fontSize: 8, color: "var(--ink4)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            match
          </span>
        )}
      </div>
    </div>
  );
}

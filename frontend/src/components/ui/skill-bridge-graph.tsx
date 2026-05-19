"use client";
import { useId } from "react";
import type { SkillGapResponse } from "@/lib/types";

interface Props {
  gap: SkillGapResponse | null;
  /** User's full skill list (so we can show "owned but unused" too) */
  userSkills?: string[];
}

type BridgeRow = { mine: string; target: string; sim: number };

/** Visual bridge: left column = your skills, right column = role skills,
 *  curved SVG paths connect adjacent bridges. Direct matches are paired
 *  straight across; missing targets float on the right unconnected. */
export function SkillBridgeGraph({ gap }: Props) {
  const gid = useId();
  if (!gap) {
    return <div style={{ fontSize: 13, color: "var(--ink-3)" }}>Analyzing bridges…</div>;
  }

  const matched = gap.matched_skills ?? gap.matched ?? [];
  const missing = gap.missing_skills ?? gap.missing ?? [];
  const adjRaw = gap.adjacent ?? [];
  const bridges: BridgeRow[] = adjRaw
    .map((entry) =>
      Array.isArray(entry)
        ? { mine: String(entry[0]), target: String(entry[1]), sim: Number(entry[2] ?? 0.6) }
        : null
    )
    .filter((b): b is BridgeRow => b !== null);

  // Build left column (your skills involved) and right column (role's full set)
  const bridgedMineSet = new Set(bridges.map((b) => b.mine));
  const leftItems: { skill: string; kind: "matched" | "bridge" }[] = [
    ...matched.map((s) => ({ skill: s, kind: "matched" as const })),
    ...bridges.map((b) => ({ skill: b.mine, kind: "bridge" as const })),
  ].filter((x, i, arr) => arr.findIndex((y) => y.skill === x.skill) === i);

  const bridgedTargetSet = new Set(bridges.map((b) => b.target));
  const rightItems: { skill: string; kind: "matched" | "bridge" | "missing" }[] = [
    ...matched.map((s) => ({ skill: s, kind: "matched" as const })),
    ...bridges.map((b) => ({ skill: b.target, kind: "bridge" as const })),
    ...missing.filter((m) => !bridgedTargetSet.has(m)).map((s) => ({ skill: s, kind: "missing" as const })),
  ].filter((x, i, arr) => arr.findIndex((y) => y.skill === x.skill && y.kind === x.kind) === i);

  if (leftItems.length === 0 && rightItems.length === 0) {
    return <div style={{ fontSize: 13, color: "var(--ink-3)" }}>No skill data for this role.</div>;
  }

  const rowH = 32;
  const cols = { leftLabel: 120, leftChip: 90, graph: 140, rightChip: 90, rightLabel: 120 };
  const totalRows = Math.max(leftItems.length, rightItems.length);
  const height = Math.max(120, totalRows * rowH + 12);

  const leftX = cols.leftLabel + cols.leftChip;
  const rightX = leftX + cols.graph;

  // Map skill → y position for connecting lines
  const leftY = new Map(leftItems.map((it, i) => [it.skill, i * rowH + rowH / 2 + 6]));
  const rightY = new Map(
    rightItems.map((it, i) => [`${it.kind}:${it.skill}`, i * rowH + rowH / 2 + 6])
  );

  // Connections: matched↔matched (same skill), bridge.mine↔bridge.target
  const connections: { fromY: number; toY: number; kind: "matched" | "bridge"; sim: number }[] = [];
  for (const m of matched) {
    const fy = leftY.get(m);
    const ty = rightY.get(`matched:${m}`);
    if (fy != null && ty != null) connections.push({ fromY: fy, toY: ty, kind: "matched", sim: 1 });
  }
  for (const b of bridges) {
    const fy = leftY.get(b.mine);
    const ty = rightY.get(`bridge:${b.target}`);
    if (fy != null && ty != null) connections.push({ fromY: fy, toY: ty, kind: "bridge", sim: b.sim });
  }

  return (
    <div style={{ position: "relative", width: "100%", overflowX: "auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "start", gap: 0, fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 10 }}>
        <span>Your skills</span>
        <span style={{ textAlign: "center", paddingInline: 24 }}>Bridge</span>
        <span style={{ textAlign: "right" }}>Role requires</span>
      </div>

      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${cols.leftLabel + cols.leftChip + cols.graph + cols.rightChip + cols.rightLabel} ${height}`}
        preserveAspectRatio="none"
        style={{ display: "block" }}
      >
        <defs>
          <linearGradient id={`${gid}-matched`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="var(--positive)" stopOpacity="0.85" />
            <stop offset="1" stopColor="var(--positive)" stopOpacity="0.85" />
          </linearGradient>
          <linearGradient id={`${gid}-bridge`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="var(--positive)" stopOpacity="0.75" />
            <stop offset="1" stopColor="var(--secondary-2)" stopOpacity="0.75" />
          </linearGradient>
        </defs>

        {/* Left column items */}
        {leftItems.map((it, i) => {
          const y = i * rowH + 6;
          return (
            <g key={`L-${it.skill}`}>
              <text x={cols.leftLabel - 6} y={y + rowH / 2 + 4} textAnchor="end" fontSize="12" fill="var(--ink)" style={{ fontFamily: "Geist Mono, monospace" }}>
                {it.skill}
              </text>
              <rect x={cols.leftLabel} y={y + 6} width={cols.leftChip - 12} height={rowH - 12} rx={5}
                fill={bridgedMineSet.has(it.skill) ? "var(--positive-bg)" : "var(--positive-bg)"}
                stroke="var(--positive)" />
              <circle cx={leftX - 6} cy={y + rowH / 2 + 1} r="4" fill="var(--positive)" />
            </g>
          );
        })}

        {/* Curves */}
        {connections.map((c, i) => {
          const x1 = leftX - 6;
          const x2 = rightX + 6;
          const mx = (x1 + x2) / 2;
          const path = `M ${x1} ${c.fromY} C ${mx} ${c.fromY}, ${mx} ${c.toY}, ${x2} ${c.toY}`;
          const strokeUrl = c.kind === "matched" ? `url(#${gid}-matched)` : `url(#${gid}-bridge)`;
          return (
            <path
              key={`c-${i}`}
              d={path}
              fill="none"
              stroke={strokeUrl}
              strokeWidth={c.kind === "matched" ? 2 : 1.5}
              strokeDasharray={c.kind === "bridge" ? "4 4" : undefined}
              opacity={0.85}
            />
          );
        })}

        {/* Right column items */}
        {rightItems.map((it, i) => {
          const y = i * rowH + 6;
          const fillColor =
            it.kind === "matched" ? "var(--positive-bg)" :
            it.kind === "bridge" ? "var(--secondary-bg)" :
            "var(--caution-bg)";
          const strokeColor =
            it.kind === "matched" ? "var(--positive)" :
            it.kind === "bridge" ? "var(--secondary-2)" :
            "var(--caution)";
          const dotColor =
            it.kind === "matched" ? "var(--positive)" :
            it.kind === "bridge" ? "var(--secondary-2)" :
            "var(--caution)";
          return (
            <g key={`R-${it.kind}-${it.skill}`}>
              <circle cx={rightX + 6} cy={y + rowH / 2 + 1} r="4" fill={dotColor} />
              <rect x={rightX + 12} y={y + 6} width={cols.rightChip - 12} height={rowH - 12} rx={5}
                fill={fillColor} stroke={strokeColor} />
              <text x={rightX + cols.rightChip + 6} y={y + rowH / 2 + 4} textAnchor="start" fontSize="12" fill="var(--ink)" style={{ fontFamily: "Geist Mono, monospace" }}>
                {it.skill}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

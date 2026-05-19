"use client";
import type { SkillGapResponse } from "@/lib/types";

interface SkillFitBlockProps {
  gap: SkillGapResponse | null;
  /** Total target skills required for the role */
  targetCount: number;
  /** Optional title — defaults to "Skill fit" */
  title?: string;
}

/** Skill-fit visualization: progress bar + summary line + matched/missing pills.
 * Used on the featured card and the detail page. */
export function SkillFitBlock({ gap, targetCount, title = "Skill fit" }: SkillFitBlockProps) {
  if (targetCount === 0) {
    return (
      <div style={{ marginBottom: 16, fontSize: 12, color: "var(--ink-3)" }}>
        No skill list published for this role — see the description for requirements.
      </div>
    );
  }
  if (!gap) {
    return (
      <div style={{ marginBottom: 16, fontSize: 12, color: "var(--ink-3)" }}>
        {title} — analyzing…
      </div>
    );
  }

  const matchedSkills = gap.matched_skills ?? gap.matched ?? [];
  const missingSkills = gap.missing_skills ?? gap.missing ?? [];
  const adjacentSkills = (gap.adjacent ?? []).map((a) =>
    // Adjacent can be either string[] or [yours, target, sim][] depending on backend.
    Array.isArray(a) ? (a as unknown as string[])[1] : String(a)
  );

  const haveCount = matchedSkills.length;
  const adjCount = adjacentSkills.length;
  const fillPct = Math.min(100, ((haveCount + adjCount * 0.5) / Math.max(targetCount, 1)) * 100);

  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          fontSize: 12,
          color: "var(--ink-3)",
          marginBottom: 8,
        }}
      >
        <span>{title}</span>
        <span
          style={{
            color: "var(--ink)",
            fontWeight: 500,
            fontFamily: "Geist Mono, monospace",
            fontSize: 12.5,
          }}
        >
          {haveCount} of {targetCount} required
          {adjCount > 0 && (
            <span style={{ color: "var(--secondary-2)" }}> · {adjCount} adjacent you can bridge</span>
          )}
        </span>
      </div>
      <div
        style={{
          height: 6,
          background: "var(--surface-2)",
          borderRadius: 999,
          overflow: "hidden",
          border: "1px solid var(--border)",
        }}
      >
        <div
          style={{
            height: "100%",
            background: "var(--accent)",
            borderRadius: 999,
            width: `${fillPct}%`,
            transition: "width 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        />
      </div>

      {(matchedSkills.length > 0 || missingSkills.length > 0) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
          {matchedSkills.slice(0, 8).map((s) => (
            <span
              key={`m-${s}`}
              style={{
                fontSize: 11.5,
                padding: "3px 9px",
                borderRadius: 6,
                background: "var(--positive-bg)",
                color: "var(--positive)",
                border: "1px solid var(--positive)",
              }}
            >
              {s}
            </span>
          ))}
          {missingSkills.slice(0, 6).map((s) => (
            <span
              key={`x-${s}`}
              style={{
                fontSize: 11.5,
                padding: "3px 9px",
                borderRadius: 6,
                background: "var(--caution-bg)",
                color: "var(--caution)",
                border: "1px solid var(--caution)",
              }}
            >
              + {s}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

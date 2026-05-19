"use client";
import type { SkillGapResponse, SalaryResponse } from "@/lib/types";
import { marketVerdict } from "@/lib/hooks";

interface Props {
  gap: SkillGapResponse | null;
  targetSkills: string[];
  predicted: SalaryResponse | null;
  postedMin: number | null | undefined;
  postedMax: number | null | undefined;
}

function fmtK(v: number | null | undefined): string {
  if (v == null) return "—";
  return `$${Math.round(v / 1000)}k`;
}

/** Single integrated chart: segmented fit bar + salary delta annotation.
 *  Replaces the previous separate SkillFitBlock + SalaryTruthBlock. */
export function FitVisualization({ gap, targetSkills, predicted, postedMin, postedMax }: Props) {
  const total = Math.max(targetSkills.length, 1);
  const matched = gap?.matched_skills ?? gap?.matched ?? [];
  const adjacentRaw = gap?.adjacent ?? [];
  const adjacent = adjacentRaw.map((a) =>
    Array.isArray(a) ? (a as unknown as string[])[1] : String(a)
  );
  const missing = gap?.missing_skills ?? gap?.missing ?? [];

  const matchedCt = matched.length;
  const adjCt = adjacent.length;
  const missCt = Math.max(0, total - matchedCt - adjCt);

  const matchedPct = (matchedCt / total) * 100;
  const adjPct = (adjCt / total) * 100;
  const missPct = (missCt / total) * 100;

  const verdict = marketVerdict(postedMin, postedMax, predicted?.midpoint);
  const postedMid =
    postedMin != null && postedMax != null ? (postedMin + postedMax) / 2 : null;
  const delta = postedMid != null && predicted?.midpoint != null ? postedMid - predicted.midpoint : null;

  return (
    <div>
      {/* Headline number row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr auto",
          alignItems: "baseline",
          gap: 16,
          marginBottom: 18,
        }}
      >
        <div>
          <div style={{ fontSize: 44, lineHeight: 1, color: "var(--ink)", letterSpacing: "-0.03em", fontWeight: 600 }}>
            {matchedCt}
            <span style={{ color: "var(--ink-3)", fontSize: 24, fontWeight: 500 }}>/{total}</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginTop: 4 }}>
            Skills you have
          </div>
        </div>
        <div style={{ borderLeft: "1px solid var(--border)", paddingLeft: 20 }}>
          <div style={{ fontSize: 15.5, color: "var(--ink-2)", lineHeight: 1.55 }}>
            {gap ? (
              <>
                You match <strong style={{ color: "var(--positive)" }}>{matchedCt}</strong> required skills directly
                {adjCt > 0 && (
                  <>, and <strong style={{ color: "var(--secondary-2)" }}>{adjCt}</strong> more you can bridge from adjacent experience</>
                )}
                {missCt > 0 ? (
                  <>. The remaining <strong style={{ color: "var(--caution)" }}>{missCt}</strong> would be net-new for you.</>
                ) : (
                  <>. Nothing missing.</>
                )}
              </>
            ) : (
              <span style={{ color: "var(--ink-3)" }}>Analyzing your fit…</span>
            )}
          </div>
        </div>
        {delta != null && (
          <div style={{ textAlign: "right" }}>
            <div
              className="font-mono"
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: delta >= 0 ? "var(--positive)" : "var(--caution)",
                letterSpacing: "-0.02em",
                lineHeight: 1,
              }}
            >
              {delta >= 0 ? "+" : ""}
              {fmtK(delta)}
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginTop: 6 }}>
              vs predicted
            </div>
          </div>
        )}
      </div>

      {/* Segmented fit bar */}
      <div
        style={{
          display: "flex",
          height: 10,
          borderRadius: 999,
          overflow: "hidden",
          border: "1px solid var(--border)",
          background: "var(--surface-2)",
          marginBottom: 12,
        }}
      >
        {matchedPct > 0 && (
          <div style={{ width: `${matchedPct}%`, background: "var(--positive)", transition: "width 600ms cubic-bezier(0.22,1,0.36,1)" }} />
        )}
        {adjPct > 0 && (
          <div style={{ width: `${adjPct}%`, background: "var(--secondary)", transition: "width 600ms cubic-bezier(0.22,1,0.36,1)" }} />
        )}
        {missPct > 0 && (
          <div style={{ width: `${missPct}%`, background: "var(--caution-bg)", transition: "width 600ms cubic-bezier(0.22,1,0.36,1)" }} />
        )}
      </div>
      <div style={{ display: "flex", gap: 18, fontSize: 11.5, color: "var(--ink-3)", marginBottom: 18 }}>
        <Legend dot="var(--positive)" label={`Matched · ${matchedCt}`} />
        <Legend dot="var(--secondary)" label={`Adjacent · ${adjCt}`} />
        <Legend dot="var(--caution)" label={`Net-new · ${missCt}`} />
      </div>

      {/* Skill chips, grouped */}
      {(matched.length > 0 || missing.length > 0) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {matched.slice(0, 12).map((s) => (
            <Chip key={`m-${s}`} label={s} tone="pos" />
          ))}
          {missing.slice(0, 8).map((s) => (
            <Chip key={`x-${s}`} label={s} tone="neg" prefix="+ " />
          ))}
        </div>
      )}

      {/* Salary numbers row, subordinate to the chart above */}
      {(postedMin != null || predicted) && (
        <div
          style={{
            marginTop: 22,
            paddingTop: 18,
            borderTop: "1px solid var(--border)",
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 18,
          }}
        >
          <NumberBlock label="Posted base" value={`${fmtK(postedMin)} – ${fmtK(postedMax)}`} />
          <NumberBlock
            label="Our prediction"
            value={predicted ? `${fmtK(predicted.salary_min)} – ${fmtK(predicted.salary_max)}` : "analyzing…"}
            mono
          />
          <NumberBlock
            label="Verdict"
            value={verdict?.label ?? "—"}
            tone={verdict?.tone}
          />
        </div>
      )}
    </div>
  );
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 8, height: 8, borderRadius: 999, background: dot, display: "inline-block" }} />
      {label}
    </span>
  );
}

function Chip({ label, tone, prefix }: { label: string; tone: "pos" | "neg"; prefix?: string }) {
  const bg = tone === "pos" ? "var(--positive-bg)" : "var(--caution-bg)";
  const fg = tone === "pos" ? "var(--positive)" : "var(--caution)";
  return (
    <span
      style={{
        fontSize: 12,
        padding: "4px 10px",
        borderRadius: 6,
        background: bg,
        color: fg,
        border: `1px solid ${fg}`,
      }}
    >
      {prefix}{label}
    </span>
  );
}

function NumberBlock({
  label,
  value,
  mono,
  tone,
}: { label: string; value: string; mono?: boolean; tone?: "pos" | "neg" | "neutral" }) {
  const color =
    tone === "pos" ? "var(--positive)" : tone === "neg" ? "var(--caution)" : "var(--ink)";
  return (
    <div>
      <div style={{ fontSize: 11.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 8 }}>
        {label}
      </div>
      <div
        className={mono ? "font-mono" : undefined}
        style={{ fontSize: 17, fontWeight: 600, color, letterSpacing: "-0.005em" }}
      >
        {value}
      </div>
    </div>
  );
}

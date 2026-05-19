"use client";
import { marketVerdict } from "@/lib/hooks";
import type { SalaryResponse } from "@/lib/types";

interface SalaryTruthBlockProps {
  postedMin: number | null | undefined;
  postedMax: number | null | undefined;
  predicted: SalaryResponse | null;
}

function fmtK(v: number | null | undefined): string {
  if (v == null) return "—";
  return `$${Math.round(v / 1000)}k`;
}

/** Two-column posted-vs-predicted salary card with above/at/below-market verdict. */
export function SalaryTruthBlock({ postedMin, postedMax, predicted }: SalaryTruthBlockProps) {
  const verdict = marketVerdict(postedMin, postedMax, predicted?.midpoint);
  const verdictBg =
    verdict?.tone === "pos"
      ? "var(--positive-bg)"
      : verdict?.tone === "neg"
        ? "var(--caution-bg)"
        : "var(--surface)";
  const verdictColor =
    verdict?.tone === "pos"
      ? "var(--positive)"
      : verdict?.tone === "neg"
        ? "var(--caution)"
        : "var(--ink-3)";
  const verdictBorder =
    verdict?.tone === "pos"
      ? "var(--positive)"
      : verdict?.tone === "neg"
        ? "var(--caution)"
        : "var(--border)";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 14,
        padding: 14,
        background: "var(--surface-2)",
        borderRadius: 10,
        border: "1px solid var(--border)",
        marginBottom: 16,
      }}
    >
      <div>
        <div
          style={{
            fontSize: 10.5,
            color: "var(--ink-3)",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            marginBottom: 4,
            fontWeight: 600,
          }}
        >
          Posted compensation
        </div>
        <div
          style={{
            fontFamily: "Geist Mono, monospace",
            fontSize: 17,
            fontWeight: 600,
            color: "var(--ink)",
          }}
        >
          {fmtK(postedMin)}{" "}
          <span style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 400, marginLeft: 4 }}>
            – {fmtK(postedMax)} base
          </span>
        </div>
        {verdict && (
          <span
            style={{
              display: "inline-block",
              fontSize: 10.5,
              padding: "3px 8px",
              borderRadius: 5,
              fontWeight: 600,
              marginTop: 6,
              background: verdictBg,
              color: verdictColor,
              border: `1px solid ${verdictBorder}`,
            }}
          >
            {verdict.label}
          </span>
        )}
      </div>
      <div>
        <div
          style={{
            fontSize: 10.5,
            color: "var(--ink-3)",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            marginBottom: 4,
            fontWeight: 600,
          }}
        >
          Our model predicts
        </div>
        <div
          style={{
            fontFamily: "Geist Mono, monospace",
            fontSize: 17,
            fontWeight: 600,
            color: "var(--ink)",
          }}
        >
          {predicted ? (
            <>
              {fmtK(predicted.salary_min)}
              <span style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 400, marginLeft: 4 }}>
                – {fmtK(predicted.salary_max)}
              </span>
            </>
          ) : (
            <span style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 400 }}>analyzing…</span>
          )}
        </div>
        {predicted && (
          <div
            style={{
              fontSize: 10.5,
              color: "var(--ink-3)",
              marginTop: 6,
              fontFamily: "Geist Mono, monospace",
            }}
          >
            midpoint ≈ {fmtK(predicted.midpoint)}
          </div>
        )}
      </div>
    </div>
  );
}

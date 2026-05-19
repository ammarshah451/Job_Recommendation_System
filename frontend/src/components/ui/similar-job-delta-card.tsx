"use client";
import Link from "next/link";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import type { Recommendation, Job } from "@/lib/types";

interface Props {
  rec: Recommendation;
  /** The current job we're showing alternatives to. */
  baseline: Job;
}

function midpoint(min: number | null, max: number | null): number | null {
  if (min == null || max == null) return null;
  return (min + max) / 2;
}

function fmtK(v: number | null | undefined): string {
  if (v == null) return "—";
  const sign = v < 0 ? "-" : "";
  return `${sign}$${Math.abs(Math.round(v / 1000))}k`;
}

/** Similar-jobs card that surfaces the *delta* vs the current job, so users can
 *  see at a glance whether each alternative is a step up, sideways, or down. */
export function SimilarJobDeltaCard({ rec, baseline }: Props) {
  const a = rec.job;
  const b = baseline;

  const aSal = midpoint(a.salary_min, a.salary_max);
  const bSal = midpoint(b.salary_min, b.salary_max);
  const salDelta = aSal != null && bSal != null ? aSal - bSal : null;

  const aSkills = a.skillList ?? [];
  const bSkills = b.skillList ?? [];
  const skillDelta = aSkills.length - bSkills.length;

  const sameLocation = a.location && b.location && a.location === b.location;
  const sameCategory = a.category && b.category && a.category === b.category;
  const sameSeniority = a.seniority && b.seniority && a.seniority === b.seniority;

  // Step direction: positive salary + same-or-higher seniority → "up", lower → "down", else "sideways"
  let direction: "up" | "down" | "side" = "side";
  if (salDelta != null && salDelta > 5000) direction = "up";
  else if (salDelta != null && salDelta < -5000) direction = "down";

  const DirIcon = direction === "up" ? ArrowUpRight : direction === "down" ? ArrowDownRight : Minus;
  const dirColor =
    direction === "up" ? "var(--positive)" :
    direction === "down" ? "var(--caution)" :
    "var(--ink-3)";
  const dirLabel = direction === "up" ? "Step up" : direction === "down" ? "Step down" : "Sideways";

  return (
    <Link
      href={`/jobs/${a.job_id}`}
      style={{
        display: "block",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: 16,
        textDecoration: "none",
        color: "inherit",
        boxShadow: "var(--shadow-1)",
        transition: "transform 0.18s, box-shadow 0.18s, border-color 0.18s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--border-2)";
        e.currentTarget.style.boxShadow = "var(--shadow-2)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.boxShadow = "var(--shadow-1)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--ink)", lineHeight: 1.3, letterSpacing: "-0.01em" }}>
          {a.title}
        </h4>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: 10.5,
            fontWeight: 600,
            color: dirColor,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          <DirIcon size={12} />
          {dirLabel}
        </span>
      </div>

      <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 12 }}>
        {[a.category, a.location].filter(Boolean).join(" · ")}
      </div>

      {/* Delta strip */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
        <DeltaRow
          label="Salary"
          value={salDelta != null ? fmtK(salDelta) : "—"}
          tone={salDelta != null && Math.abs(salDelta) > 5000 ? (salDelta > 0 ? "pos" : "neg") : "neutral"}
        />
        <DeltaRow
          label="Skills required"
          value={skillDelta === 0 ? "same count" : `${skillDelta > 0 ? "+" : ""}${skillDelta}`}
          tone={skillDelta < 0 ? "pos" : skillDelta > 0 ? "neg" : "neutral"}
        />
        <DeltaRow
          label="Location"
          value={sameLocation ? "same city" : a.location ?? "—"}
          tone="neutral"
          tight
        />
        <DeltaRow
          label="Seniority"
          value={sameSeniority ? "same level" : a.seniority ?? "—"}
          tone="neutral"
          tight
        />
      </div>

      {!sameCategory && a.category && (
        <div style={{ marginTop: 10, fontSize: 11.5, color: "var(--ink-3)" }}>
          Different domain · <span style={{ color: "var(--ink)" }}>{a.category}</span>
        </div>
      )}
    </Link>
  );
}

function DeltaRow({
  label,
  value,
  tone,
  tight,
}: { label: string; value: string; tone: "pos" | "neg" | "neutral"; tight?: boolean }) {
  const color = tone === "pos" ? "var(--positive)" : tone === "neg" ? "var(--caution)" : "var(--ink)";
  return (
    <div>
      <div style={{ fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 2 }}>
        {label}
      </div>
      <div
        className={tight ? undefined : "font-mono"}
        style={{ fontSize: tight ? 12 : 13, fontWeight: 500, color }}
      >
        {value}
      </div>
    </div>
  );
}

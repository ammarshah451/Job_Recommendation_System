"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, MapPin, Briefcase, Clock } from "lucide-react";
import type { Recommendation, SkillGapResponse } from "@/lib/types";
import { api } from "@/lib/api";
import { getUserSkills } from "@/lib/hooks";
import { useAppStore } from "@/lib/store";

function companyInitial(rec: Recommendation): string {
  const src = rec.job.company || rec.job.category || rec.job.title || "?";
  return src.trim().charAt(0).toUpperCase();
}

/** Dual-row job card: colored top band with eyebrow + match%, big title row,
 *  skill chip strip, salary + meta row. Designed for vertical-stack lists. */
export function JobCardV2({ rec }: { rec: Recommendation }) {
  const pct = Math.round(rec.score * 100);
  const userId = useAppStore((s) => s.userId);
  const target = rec.job.skillList ?? [];
  const [gap, setGap] = useState<SkillGapResponse | null>(null);

  useEffect(() => {
    if (target.length === 0) return;
    let cancelled = false;
    (async () => {
      const userSkills = await getUserSkills(userId);
      if (cancelled || userSkills.length === 0) return;
      try {
        const res = await api.skillGap(userSkills, target);
        if (!cancelled) setGap(res);
      } catch {
        /* swallow */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, target]);

  const salary =
    rec.job.salary_min != null && rec.job.salary_max != null
      ? `$${Math.round(rec.job.salary_min / 1000)}–${Math.round(rec.job.salary_max / 1000)}k`
      : null;

  const matched = gap ? (gap.matched_skills ?? gap.matched ?? []) : [];
  const missing = gap ? (gap.missing_skills ?? gap.missing ?? []) : [];
  const matchRatio = target.length > 0 ? matched.length / target.length : 0;

  // Tier: strong / moderate / stretch — drives the band gradient + label.
  // Names are explicit so the user knows what each tier means.
  const tier =
    pct >= 80 ? {
      label: "Excellent fit — apply soon",
      color: "var(--positive)",
      // Sage → mint gradient
      bg: "linear-gradient(90deg, oklch(0.88 0.07 165) 0%, oklch(0.94 0.045 165) 60%, oklch(0.97 0.025 165) 100%)",
    } :
    pct >= 60 ? {
      label: "Good fit — worth a closer look",
      color: "var(--secondary-2)",
      // Mustard → cream gradient
      bg: "linear-gradient(90deg, oklch(0.86 0.13 85) 0%, oklch(0.93 0.08 85) 55%, oklch(0.97 0.04 85) 100%)",
    } :
    {
      label: "Stretch role — would require new skills",
      color: "var(--accent)",
      // Slate → linen gradient
      bg: "linear-gradient(90deg, oklch(0.80 0.07 255) 0%, oklch(0.90 0.04 250) 55%, oklch(0.96 0.018 250) 100%)",
    };

  const isFresh = rec.job.posted_days_ago != null && rec.job.posted_days_ago <= 3;

  return (
    <Link
      href={`/jobs/${rec.job.job_id}`}
      className="job-row-enter"
      style={{
        display: "block",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        textDecoration: "none",
        color: "inherit",
        boxShadow: "var(--shadow-1)",
        overflow: "hidden",
        transition: "transform 0.2s cubic-bezier(0.22,1,0.36,1), box-shadow 0.2s, border-color 0.2s",
        position: "relative",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = tier.color;
        e.currentTarget.style.boxShadow = "var(--shadow-2)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.boxShadow = "var(--shadow-1)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {/* Left vertical accent stripe (the entire card height) */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          background: tier.color,
        }}
      />

      {/* Subtitle row: tier headline + fresh + skill count + score on the right */}
      <div
        style={{
          padding: "12px 22px 0 26px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 14,
        }}
      >
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, color: tier.color, fontWeight: 600 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: tier.color, display: "inline-block" }} />
            {tier.label}
          </span>
          {target.length > 0 && gap && (
            <span style={{ fontSize: 12, color: "var(--ink-3)" }}>
              · you have <strong style={{ color: "var(--ink)", fontWeight: 600 }}>{matched.length} of {target.length}</strong> skills
            </span>
          )}
          {isFresh && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "var(--positive)",
                background: "var(--positive-bg)",
                padding: "2px 7px",
                borderRadius: 4,
                border: "1px solid var(--positive)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Fresh · {rec.job.posted_days_ago}d
            </span>
          )}
        </div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 12px 6px 14px",
            borderRadius: 10,
            background: tier.color,
            color: "white",
            boxShadow: `0 4px 10px ${tier.color}55, inset 0 1px 0 rgba(255,255,255,0.18)`,
          }}
        >
          <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, opacity: 0.9 }}>
            Match
          </span>
          <span
            className="font-mono"
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: "white",
              letterSpacing: "-0.025em",
              lineHeight: 1,
            }}
          >
            {pct}
            <span style={{ fontSize: 11, verticalAlign: "super", marginLeft: 1 }}>%</span>
          </span>
        </span>
      </div>

      {/* Body */}
      <div
        style={{
          padding: "14px 22px 18px 26px",
          display: "grid",
          gridTemplateColumns: "52px 1fr auto",
          gap: 18,
          alignItems: "start",
        }}
      >
        {/* Company glyph */}
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 12,
            background: tier.color,
            color: "white",
            display: "grid",
            placeItems: "center",
            fontWeight: 600,
            fontSize: 22,
            letterSpacing: "-0.02em",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}
        >
          {companyInitial(rec)}
        </div>

        {/* Title + meta + chips */}
        <div style={{ minWidth: 0 }}>
          <h4
            style={{
              margin: "0 0 6px",
              fontSize: 17,
              fontWeight: 600,
              color: "var(--ink)",
              letterSpacing: "-0.015em",
              lineHeight: 1.25,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {rec.job.title}
          </h4>
          <div style={{ display: "flex", gap: 14, fontSize: 13, color: "var(--ink-3)", alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
            {rec.job.category && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <Briefcase size={12} /> {rec.job.category}
              </span>
            )}
            {rec.job.location && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <MapPin size={12} /> {rec.job.location}
              </span>
            )}
            {rec.job.posted_days_ago != null && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <Clock size={12} /> Posted {rec.job.posted_days_ago}d ago
              </span>
            )}
            {rec.job.seniority && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                · {rec.job.seniority}
              </span>
            )}
          </div>

          {/* Skill chips strip */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {matched.slice(0, 5).map((s) => (
              <span
                key={`m-${s}`}
                style={{
                  fontSize: 11.5,
                  padding: "3px 9px",
                  borderRadius: 6,
                  background: "var(--positive-bg)",
                  color: "var(--positive)",
                  border: "1px solid var(--positive)",
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                }}
              >
                ✓ {s}
              </span>
            ))}
            {missing.slice(0, 3).map((s) => (
              <span
                key={`x-${s}`}
                style={{
                  fontSize: 11.5,
                  padding: "3px 9px",
                  borderRadius: 6,
                  background: "var(--caution-bg)",
                  color: "var(--caution)",
                  border: "1px solid var(--caution)",
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                }}
              >
                + {s}
              </span>
            ))}
            {!gap && target.slice(0, 6).map((s) => (
              <span
                key={`t-${s}`}
                style={{
                  fontSize: 11.5,
                  padding: "3px 9px",
                  borderRadius: 6,
                  background: "var(--surface-2)",
                  color: "var(--ink-3)",
                  border: "1px solid var(--border)",
                  whiteSpace: "nowrap",
                }}
              >
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* Salary block + arrow */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 12, whiteSpace: "nowrap" }}>
          {salary ? (
            <div style={{ textAlign: "right" }}>
              <div
                className="font-mono"
                style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.015em", lineHeight: 1 }}
              >
                {salary}
              </div>
              <div style={{ fontSize: 10.5, color: "var(--ink-3)", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600 }}>
                Base salary
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 12.5, color: "var(--ink-3)" }}>Undisclosed</div>
          )}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 10px",
              borderRadius: 6,
              background: "var(--bg)",
              border: "1px solid var(--border)",
              fontSize: 11.5,
              color: "var(--ink-2)",
              fontWeight: 500,
            }}
          >
            View role <ArrowUpRight size={12} />
          </div>
        </div>
      </div>

      {/* Bottom skill-match progress bar (very subtle) */}
      {target.length > 0 && gap && (
        <div style={{ height: 3, background: "var(--surface-2)", overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${Math.min(100, matchRatio * 100)}%`,
              background: tier.color,
              transition: "width 600ms cubic-bezier(0.22,1,0.36,1)",
            }}
          />
        </div>
      )}
    </Link>
  );
}

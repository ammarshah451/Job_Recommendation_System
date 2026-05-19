"use client";
import Link from "next/link";
import { Sparkles, Bookmark } from "lucide-react";
import type { Recommendation } from "@/lib/types";
import { useSkillFitAndSalary } from "@/lib/hooks";
import { SkillFitBlock } from "./skill-fit-block";
import { SalaryTruthBlock } from "./salary-truth-block";

export function FeaturedJob({ rec }: { rec: Recommendation }) {
  const pct = Math.round(rec.score * 100);
  const { gap, salary } = useSkillFitAndSalary(rec.job);
  const targetSkills = rec.job.skillList ?? [];

  return (
    <article
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        padding: 26,
        marginBottom: 26,
        boxShadow: "var(--shadow-2)",
        display: "grid",
        gridTemplateColumns: "1fr 260px",
        gap: 32,
        position: "relative",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: -10,
          left: 22,
          background: "var(--accent)",
          color: "white",
          padding: "4px 10px",
          fontSize: 10.5,
          fontWeight: 600,
          borderRadius: 6,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        Best match
      </span>

      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: "var(--ink-3)",
            fontSize: 12.5,
            marginBottom: 10,
            flexWrap: "wrap",
          }}
        >
          {rec.job.company && <span>{rec.job.company}</span>}
          {rec.job.location && (
            <>
              <span>·</span>
              <span>{rec.job.location}</span>
            </>
          )}
          {rec.job.posted_days_ago != null && (
            <>
              <span>·</span>
              <span>posted {rec.job.posted_days_ago}d ago</span>
            </>
          )}
          <span>·</span>
          <span
            style={{
              color: "var(--positive)",
              fontWeight: 500,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span
              style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--positive)" }}
            />
            actively hiring
          </span>
        </div>
        <h3
          style={{
            margin: "0 0 14px",
            fontSize: 26,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: "var(--ink)",
            lineHeight: 1.15,
          }}
        >
          {rec.job.title}
        </h3>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
          {[rec.job.employment_type, rec.job.seniority, rec.job.category].filter(Boolean).map((label, i) => (
            <span
              key={i}
              style={{
                fontSize: 12,
                padding: "4px 10px",
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: 7,
                color: "var(--ink-2)",
              }}
            >
              {label}
            </span>
          ))}
        </div>

        {rec.explanation && (
          <div
            style={{
              background: "var(--secondary-bg)",
              border: "1px solid var(--secondary-bdr)",
              borderRadius: 10,
              padding: "14px 16px",
              marginBottom: 16,
              display: "flex",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                background: "var(--secondary-2)",
                color: "white",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}
            >
              <Sparkles size={14} />
            </div>
            <div>
              <div
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  color: "var(--secondary-2)",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  marginBottom: 4,
                }}
              >
                Why this fits — from your reranker
              </div>
              <p style={{ margin: 0, color: "var(--ink)", fontSize: 13.5, lineHeight: 1.55 }}>
                {rec.explanation}
              </p>
            </div>
          </div>
        )}

        <SkillFitBlock gap={gap} targetCount={targetSkills.length} />

        <SalaryTruthBlock
          postedMin={rec.job.salary_min}
          postedMax={rec.job.salary_max}
          predicted={salary}
        />

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link
            href={`/jobs/${rec.job.job_id}`}
            style={{
              background: "var(--accent)",
              color: "white",
              border: "1px solid var(--accent)",
              borderRadius: 9,
              padding: "10px 16px",
              fontSize: 13.5,
              fontWeight: 500,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            View role →
          </Link>
          <button
            style={{
              background: "var(--bg)",
              color: "var(--ink)",
              border: "1px solid var(--border)",
              borderRadius: 9,
              padding: "10px 16px",
              fontSize: 13.5,
              fontWeight: 500,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Bookmark size={14} />
            Save
          </button>
          <Link
            href={`/jobs/${rec.job.job_id}#skill-bridge`}
            style={{
              background: "var(--secondary-bg)",
              color: "var(--secondary-2)",
              border: "1px solid var(--secondary-bdr)",
              borderRadius: 9,
              padding: "10px 16px",
              fontSize: 13.5,
              fontWeight: 500,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            See skill bridge plan
          </Link>
        </div>
      </div>

      <aside
        style={{
          borderLeft: "1px solid var(--border)",
          paddingLeft: 28,
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        <div
          style={{
            textAlign: "center",
            padding: "18px 0",
            background: "var(--accent-bg)",
            border: "1px solid var(--accent-bdr)",
            borderRadius: 12,
          }}
        >
          <div
            style={{
              fontSize: 54,
              fontWeight: 600,
              color: "var(--accent)",
              letterSpacing: "-0.04em",
              lineHeight: 1,
            }}
          >
            {pct}
            <span style={{ fontSize: 22, verticalAlign: "super", marginLeft: 2 }}>%</span>
          </div>
          <div
            style={{
              fontSize: 11,
              color: "var(--accent-2)",
              marginTop: 6,
              fontWeight: 500,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Overall match
          </div>
        </div>
      </aside>
    </article>
  );
}

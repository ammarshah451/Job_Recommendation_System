"use client";
import { useRef, useEffect } from "react";
import type { Recommendation } from "@/lib/types";
import { useAppStore } from "@/lib/store";
import { ScoreRing } from "./score-ring";

interface JobCardProps {
  rec: Recommendation;
  rank: number;
}

export function JobCard({ rec, rank }: JobCardProps) {
  const { job, score } = rec;
  const pct = Math.round(score * 100);
  const { selectedJobId, selectJob, savedJobIds } = useAppStore();
  const isSelected = selectedJobId === job.job_id;
  const isSaved = savedJobIds.includes(job.job_id);
  const cardRef = useRef<HTMLDivElement>(null);

  // Spotlight mouse tracking
  useEffect(() => {
    import("gsap").then(({ gsap }) => {
      const card = cardRef.current;
      if (!card) return;
      const setX = gsap.quickSetter(card, "--mx", "px");
      const setY = gsap.quickSetter(card, "--my", "px");
      const onMove = (e: MouseEvent) => {
        const r = card.getBoundingClientRect();
        setX(e.clientX - r.left);
        setY(e.clientY - r.top);
      };
      card.addEventListener("mousemove", onMove);
      return () => card.removeEventListener("mousemove", onMove);
    });
  }, []);

  // Staggered entrance
  useEffect(() => {
    let tween: { kill: () => void } | undefined;
    import("gsap").then(({ gsap }) => {
      if (!cardRef.current) return;
      tween = gsap.from(cardRef.current, {
        opacity: 0, y: 16, duration: 0.4,
        delay: rank * 0.065,
        ease: "back.out(1.3)",
      });
    });
    return () => tween?.kill();
  }, [rank]);

  const salaryStr = job.salary_min && job.salary_max
    ? `$${Math.round(job.salary_min / 1000)}–${Math.round(job.salary_max / 1000)}k`
    : null;

  const skills = job.skillList ?? [];
  const extraSkills = skills.length > 3 ? skills.length - 3 : 0;
  const initial = (job.category ?? job.title ?? "?").charAt(0).toUpperCase();

  return (
    <div
      ref={cardRef}
      className="spotlight-card"
      onClick={() => selectJob(isSelected ? null : job.job_id)}
      style={{
        background: isSelected ? "#ffffff" : "#ffffff",
        borderRadius: 11,
        border: isSelected
          ? "1.5px solid var(--accent-bdr)"
          : "1.5px solid var(--warm2)",
        boxShadow: isSelected
          ? "0 4px 16px rgba(45,106,79,0.18), 0 2px 6px rgba(0,0,0,0.12)"
          : "0 2px 8px rgba(0,0,0,0.18), 0 1px 2px rgba(0,0,0,0.1)",
        marginBottom: 6,
        padding: "11px 12px 10px",
        display: "flex", flexDirection: "column", gap: 8,
        position: "relative", overflow: "hidden", cursor: "pointer",
        transition: "box-shadow 0.15s ease, border-color 0.15s ease, transform 0.1s ease",
      }}
      onMouseOver={(e) => {
        if (!isSelected) {
          (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 14px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)";
          (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
        }
      }}
      onMouseOut={(e) => {
        if (!isSelected) {
          (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.03)";
          (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
        }
      }}
    >
      {/* Selected left accent bar */}
      {isSelected && (
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0,
          width: 3, borderRadius: "11px 0 0 11px",
          background: "linear-gradient(to bottom, var(--accent-l), var(--accent))",
        }} />
      )}

      {/* Row 1: logo + title + score ring */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 9, paddingLeft: isSelected ? 5 : 0, transition: "padding 0.15s" }}>
        {/* Category initial badge */}
        <div style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
          background: isSelected ? "var(--accent-bg)" : "var(--warm1)",
          border: `1.5px solid ${isSelected ? "var(--accent-bdr)" : "var(--warm2)"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, fontWeight: 700,
          color: isSelected ? "var(--accent)" : "var(--ink2)",
          fontFamily: "'Geist', sans-serif",
          transition: "all 0.15s",
          userSelect: "none",
        }}>
          {initial}
        </div>

        {/* Title + meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 12.5, fontWeight: 600,
            color: "var(--ink)", lineHeight: 1.3, marginBottom: 2,
            fontFamily: "'Geist', sans-serif",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {job.title}
          </div>
          <div style={{ fontSize: 10.5, color: "var(--ink3)", display: "flex", alignItems: "center", gap: 3 }}>
            {job.category && (
              <span style={{
                fontSize: 9.5, padding: "1px 6px", borderRadius: 4,
                background: "var(--warm1)", color: "var(--ink3)",
                border: "1px solid var(--warm2)",
                fontWeight: 500,
              }}>{job.category}</span>
            )}
            {job.location && (
              <span style={{ color: "var(--ink4)" }}>{job.location}</span>
            )}
          </div>
        </div>

        {/* Score ring */}
        <ScoreRing pct={pct} size={44} />
      </div>

      {/* Row 2: salary + type + freshness */}
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", paddingLeft: isSelected ? 5 : 0, transition: "padding 0.15s" }}>
        {salaryStr && (
          <span style={{
            fontSize: 9.5, padding: "2px 7px", borderRadius: 5,
            background: "var(--accent-bg)", color: "var(--accent)",
            border: "1px solid var(--accent-bdr)", fontWeight: 600,
          }}>{salaryStr}</span>
        )}
        {job.employment_type && (
          <span style={{
            fontSize: 9.5, padding: "2px 7px", borderRadius: 5,
            background: "var(--warm1)", color: "var(--ink3)",
            border: "1px solid var(--warm2)",
          }}>{job.employment_type}</span>
        )}
        {job.posted_days_ago != null && job.posted_days_ago <= 3 && (
          <span style={{
            fontSize: 9.5, padding: "2px 7px", borderRadius: 5,
            background: "var(--amber-bg)", color: "var(--amber)",
            border: "1px solid var(--amber-bdr)", fontWeight: 600,
          }}>🔥 New</span>
        )}
        {isSaved && (
          <span style={{
            fontSize: 9.5, padding: "2px 7px", borderRadius: 5,
            background: "var(--accent-bg)", color: "var(--accent)",
            border: "1px solid var(--accent-bdr)", fontWeight: 500,
          }}>✓ Saved</span>
        )}
      </div>

      {/* Row 3: skill tags + date */}
      {skills.length > 0 && (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center", paddingLeft: isSelected ? 5 : 0, transition: "padding 0.15s" }}>
          {skills.slice(0, 3).map((sk) => (
            <span key={sk} style={{
              fontSize: 9, padding: "2px 6px", borderRadius: 4,
              background: isSelected ? "var(--accent-bg)" : "var(--warm1)",
              color: isSelected ? "var(--accent)" : "var(--ink3)",
              border: `1px solid ${isSelected ? "var(--accent-bdr)" : "var(--warm2)"}`,
              transition: "all 0.15s",
            }}>
              {sk}
            </span>
          ))}
          {extraSkills > 0 && (
            <span style={{
              fontSize: 9, padding: "2px 6px", borderRadius: 4,
              background: "var(--warm1)", color: "var(--ink4)",
              border: "1px solid var(--warm2)",
            }}>+{extraSkills}</span>
          )}
          {job.posted_days_ago != null && (
            <span style={{ marginLeft: "auto", fontSize: 9, color: "var(--ink4)" }}>
              {job.posted_days_ago === 0 ? "Today" : `${job.posted_days_ago}d ago`}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

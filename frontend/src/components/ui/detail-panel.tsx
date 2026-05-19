"use client";
import { useEffect, useState, useRef } from "react";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api";
import type { ExplainResponse } from "@/lib/types";
import { ScoreRing } from "./score-ring";

export function DetailPanel() {
  const { selectedJobId, userId, recommendations, toggleSaveJob, savedJobIds, setToast } = useAppStore();
  const [explain, setExplain] = useState<ExplainResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  const selectedRec = recommendations.find((r) => r.job.job_id === selectedJobId);

  useEffect(() => {
    if (!selectedJobId) return;
    setExplain(null);
    setLoading(true);
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
    api.explain(userId, selectedJobId)
      .then((ex) => setExplain(ex))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedJobId, userId]);

  if (!selectedRec) return null;
  const { job, score } = selectedRec;
  const pct = Math.round(score * 100);
  const isSaved = savedJobIds.includes(job.job_id);

  const salaryMid = job.salary_min && job.salary_max
    ? Math.round((job.salary_min + job.salary_max) / 2)
    : null;
  const salaryStr = job.salary_min && job.salary_max
    ? `$${Math.round(job.salary_min / 1000)}k – $${Math.round(job.salary_max / 1000)}k`
    : null;

  const barPct = salaryMid
    ? Math.min(100, Math.max(0, ((salaryMid - 80000) / (300000 - 80000)) * 100))
    : 65;

  const matchedSkills = explain?.matched_skills ?? job.skillList ?? [];
  const scores = explain?.scores ?? {};
  const scoreEntries = Object.entries(scores).filter(([, v]) => typeof v === "number" && v > 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

      {/* ── Hero ── */}
      <div style={{
        padding: "22px 28px 18px",
        borderBottom: "1px solid var(--warm2)",
        background: "var(--cream)", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
          {/* Company logotype */}
          <div style={{
            width: 50, height: 50, borderRadius: 14, flexShrink: 0,
            background: "var(--accent-bg)", border: "1px solid var(--accent-bdr)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, fontWeight: 700, color: "var(--accent)",
            fontFamily: "'Instrument Serif', Georgia, serif",
            fontStyle: "normal",
            boxShadow: "0 1px 4px rgba(45,106,79,0.1)",
          }}>
            {(job.category ?? job.title ?? "?").charAt(0).toUpperCase()}
          </div>

          {/* Title block */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10.5, color: "var(--ink4)", marginBottom: 4, letterSpacing: "0.01em" }}>
              {job.category && (
                <span style={{
                  display: "inline-block", marginRight: 6, fontSize: 9.5,
                  padding: "1px 7px", borderRadius: 4,
                  background: "var(--warm1)", border: "1px solid var(--warm2)",
                  color: "var(--ink3)", fontWeight: 500,
                }}>{job.category}</span>
              )}
              {job.location && <span>{job.location}</span>}
            </div>
            <div style={{
              fontSize: 22, fontWeight: 700,
              color: "var(--ink)", lineHeight: 1.2, letterSpacing: "-0.02em",
              fontFamily: "'Geist', sans-serif",
            }}>
              {job.title}
            </div>
            {explain?.tier && (
              <div style={{ marginTop: 4, fontSize: 10, color: "var(--ink4)", fontWeight: 500, letterSpacing: "0.03em" }}>
                {explain.tier === "warm" ? "Recommended for you" : explain.tier === "hot" ? "Strong match" : "Suggested role"}
              </div>
            )}
          </div>

          {/* Score ring */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
            <ScoreRing pct={pct} size={68} />
            <span style={{
              fontSize: 9, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase",
              color: pct >= 85 ? "var(--accent)" : pct >= 70 ? "#e8a020" : "var(--ink4)",
            }}>
              {pct >= 90 ? "Excellent" : pct >= 80 ? "Great fit" : pct >= 70 ? "Good fit" : pct >= 55 ? "Possible" : "Suggested"}
            </span>
          </div>
        </div>

        {/* Meta pills */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          {job.employment_type && (
            <span style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, background: "var(--warm1)", border: "1px solid var(--warm2)", color: "var(--ink3)" }}>
              {job.employment_type}
            </span>
          )}
          {salaryStr && (
            <span style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, background: "var(--warm1)", border: "1px solid var(--warm2)", color: "var(--ink3)" }}>
              {salaryStr}
            </span>
          )}
          {job.location && (
            <span style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, background: "var(--warm1)", border: "1px solid var(--warm2)", color: "var(--ink3)" }}>
              📍 {job.location}
            </span>
          )}
          {job.posted_days_ago != null && job.posted_days_ago <= 5 && (
            <span style={{
              fontSize: 11, padding: "4px 10px", borderRadius: 6,
              background: "var(--accent-bg)", border: "1px solid var(--accent-bdr)",
              color: "var(--accent)", fontWeight: 600,
            }}>
              ● Actively hiring
            </span>
          )}
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div
        ref={bodyRef}
        style={{ flex: 1, overflowY: "auto", minHeight: 0, padding: "20px 28px", display: "flex", flexDirection: "column", gap: 16 }}
      >

        {/* Salary card */}
        {salaryMid && (
          <div style={{
            background: "var(--warm0)", border: "1px solid var(--warm2)",
            borderRadius: 14, padding: "18px 20px",
            display: "flex", alignItems: "stretch", gap: 20,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, letterSpacing: "0.14em", color: "var(--ink3)", textTransform: "uppercase", fontWeight: 600, marginBottom: 6 }}>
                Estimated Total Comp
              </div>
              <div className="font-mono" style={{ fontSize: 34, fontWeight: 700, color: "var(--ink)", lineHeight: 1, letterSpacing: "-0.03em", marginBottom: 5 }}>
                ${Math.round(salaryMid / 1000)}k
              </div>
              <div style={{ fontSize: 11, color: "var(--ink3)", marginBottom: 12 }}>
                Range: {salaryStr} · Based on your profile
              </div>
              {/* Salary bar */}
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ height: 5, background: "var(--warm2)", borderRadius: 3, position: "relative" }}>
                  <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${barPct}%`, background: "var(--accent)", borderRadius: 3 }} />
                  <div style={{
                    position: "absolute", top: "50%", left: `${barPct}%`,
                    transform: "translate(-50%, -50%)",
                    width: 11, height: 11, borderRadius: "50%",
                    background: "var(--accent)", border: "2px solid var(--cream)",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                  }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "var(--ink4)" }}>
                  <span>$80k</span>
                  <span style={{ color: "var(--accent)", fontWeight: 500 }}>You · ${Math.round(salaryMid / 1000)}k</span>
                  <span>$300k</span>
                </div>
              </div>
            </div>
            {/* Percentile badge */}
            <div style={{
              textAlign: "center", background: "var(--accent-bg)",
              border: "1px solid var(--accent-bdr)", borderRadius: 10,
              padding: "14px 16px", minWidth: 84,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            }}>
              <span className="font-mono" style={{ fontSize: 26, fontWeight: 700, color: "var(--accent)", lineHeight: 1 }}>
                {pct >= 90 ? "94" : pct >= 80 ? "82" : "71"}
                <span style={{ fontSize: 13, fontWeight: 400 }}>th</span>
              </span>
              <span style={{ fontSize: 10, color: "var(--accent)", marginTop: 5, opacity: 0.75, lineHeight: 1.4, textAlign: "center" }}>
                percentile<br />for your level
              </span>
            </div>
          </div>
        )}

        {/* Matched skills — only show if there's data */}
        {(loading || matchedSkills.length > 0) && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 9 }}>
              Matched skills
            </div>
            {loading ? (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {[70, 55, 80, 60, 75].map((w, i) => (
                  <div key={i} className="skeleton" style={{ height: 30, width: w, borderRadius: 8 }} />
                ))}
              </div>
            ) : (
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                {matchedSkills.slice(0, 8).map((sk) => (
                  <span key={sk} style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "6px 12px", borderRadius: 8,
                    background: "var(--accent-bg)", border: "1px solid var(--accent-bdr)",
                    fontSize: 11.5, fontWeight: 500, color: "var(--accent)",
                  }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent)", flexShrink: 0 }} />
                    {sk}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Score breakdown */}
        {scoreEntries.length > 0 && (
          <div style={{
            borderRadius: 14, background: "var(--warm0)",
            border: "1px solid var(--warm2)", padding: "16px 18px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 13 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: "var(--accent)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 1px 4px rgba(45,106,79,0.3)",
              }}>
                <svg viewBox="0 0 14 14" fill="none" width="14" height="14">
                  <path d="M7 1.5L8.8 5.1l4 .6-2.9 2.8.7 3.9L7 10.4l-3.6 2 .7-3.9-2.9-2.8 4-.6z" fill="white" />
                </svg>
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Match score breakdown</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {scoreEntries.map(([key, val]) => {
                const barW = Math.min(100, Math.round((val as number) * 100));
                const label = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
                return (
                  <div key={key}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: "var(--ink3)" }}>{label}</span>
                      <span className="font-mono" style={{ fontSize: 11, fontWeight: 600, color: "var(--accent)" }}>{barW}%</span>
                    </div>
                    <div style={{ height: 4, background: "var(--warm2)", borderRadius: 2 }}>
                      <div style={{ height: "100%", width: `${barW}%`, background: "var(--accent)", borderRadius: 2, opacity: 0.8 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Job description — real data from backend */}
        {job.description && (
          <div style={{
            background: "var(--warm0)", border: "1px solid var(--warm2)",
            borderRadius: 12, padding: "14px 16px",
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 8 }}>About the role</div>
            <div style={{
              fontSize: 11.5, lineHeight: 1.75, color: "var(--ink2)",
              maxHeight: 100, overflow: "hidden",
              maskImage: "linear-gradient(to bottom, black 60%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(to bottom, black 60%, transparent 100%)",
            }}>
              {job.description}
            </div>
            <button style={{
              marginTop: 8, fontSize: 11, color: "var(--accent)", fontWeight: 600,
              background: "none", border: "none", cursor: "pointer", padding: 0,
              fontFamily: "'Geist', sans-serif",
            }}>
              Read full description →
            </button>
          </div>
        )}
      </div>

      {/* ── Action bar ── */}
      <div style={{
        padding: "14px 28px", borderTop: "1px solid var(--warm2)",
        background: "var(--cream)", flexShrink: 0,
        display: "flex", gap: 8, alignItems: "center",
      }}>
        {/* Apply */}
        <button
          style={{
            flex: 1, padding: "11px 0",
            background: "var(--accent)", color: "white",
            border: "none", borderRadius: 10,
            fontSize: 13, fontWeight: 600, cursor: "pointer",
            fontFamily: "'Geist', sans-serif", letterSpacing: "0.01em",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            transition: "background 0.15s",
            boxShadow: "0 2px 8px rgba(45,106,79,0.25)",
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = "var(--accent-l)")}
          onMouseOut={(e) => (e.currentTarget.style.background = "var(--accent)")}
        >
          Apply Now
          <svg viewBox="0 0 14 14" fill="none" width="13" height="13">
            <path d="M2 7h10M8 3l4 4-4 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Save */}
        <button
          onClick={() => {
            toggleSaveJob(job.job_id);
            setToast(isSaved ? "Removed from saved" : "Saved to your list ✓");
          }}
          title={isSaved ? "Unsave" : "Save job"}
          style={{
            width: 44, height: 44, borderRadius: 10, flexShrink: 0,
            background: isSaved ? "var(--accent-bg)" : "var(--warm0)",
            border: `1.5px solid ${isSaved ? "var(--accent-bdr)" : "var(--warm2)"}`,
            color: isSaved ? "var(--accent)" : "var(--ink3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", transition: "all 0.12s",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill={isSaved ? "var(--accent)" : "none"}>
            <path d="M3 3h10v11L8 11l-5 3V3z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Share */}
        <button
          title="Share"
          style={{
            width: 44, height: 44, borderRadius: 10, flexShrink: 0,
            background: "var(--warm0)", border: "1.5px solid var(--warm2)",
            color: "var(--ink3)", display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", transition: "all 0.12s",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="12" cy="4" r="1.5" stroke="currentColor" strokeWidth="1.3" />
            <circle cx="4" cy="8" r="1.5" stroke="currentColor" strokeWidth="1.3" />
            <circle cx="12" cy="12" r="1.5" stroke="currentColor" strokeWidth="1.3" />
            <path d="M5.3 7.2l5.4-2.4M5.3 8.8l5.4 2.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}

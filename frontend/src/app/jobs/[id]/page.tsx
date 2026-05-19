"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bookmark, Sparkles, Share2 } from "lucide-react";
import { TopNav } from "@/components/ui/top-nav";
import { FitVisualization } from "@/components/ui/fit-visualization";
import { SkillBridgeGraph } from "@/components/ui/skill-bridge-graph";
import { SimilarBento } from "@/components/ui/similar-bento";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api";
import { useSkillFitAndSalary, marketVerdict } from "@/lib/hooks";
import type { Job, Recommendation } from "@/lib/types";

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const jobId = Number(id);

  const { userId, recommendations, setRecommendations, savedJobIds, toggleSaveJob, setToast } = useAppStore();
  const [job, setJob] = useState<Job | null>(null);
  const [similar, setSimilar] = useState<Recommendation[]>([]);

  const recFromList = recommendations.find((r) => r.job.job_id === jobId);
  const isSaved = savedJobIds.includes(jobId);
  const { gap, salary } = useSkillFitAndSalary(job);

  // If we landed here cold (no recs in store), pull the user's full rec list so
  // the rail can show match %, rank, and the right reranker explanation.
  useEffect(() => {
    if (recommendations.length > 0) return;
    api.recommend(userId)
      .then((res) => setRecommendations(res.recommendations))
      .catch(() => {});
  }, [userId, recommendations.length, setRecommendations]);

  useEffect(() => {
    if (recFromList) {
      setJob(recFromList.job);
    } else {
      fetch(`http://localhost:8000/jobs/batch?ids=${jobId}`, { credentials: "include" })
        .then((r) => r.json())
        .then((arr: Job[]) => {
          const j = arr[0];
          if (!j) return;
          const skillList = (j.skills ?? "")
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s && s.toLowerCase() !== "nan");
          setJob({ ...j, skillList });
        })
        .catch(() => {});
    }
    api
      .similar(jobId)
      .then((r) => setSimilar(r.recommendations.slice(0, 4)))
      .catch(() => {});
  }, [jobId, recFromList]);

  if (!job) {
    return (
      <>
        <TopNav />
        <main style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 40px" }}>
          <div style={{ color: "var(--ink-3)" }}>Loading…</div>
        </main>
      </>
    );
  }

  // Always show a match score: prefer the in-list rec, fall back to a
  // deterministic estimate from skill coverage so the rail is never empty.
  const listPct = recFromList ? Math.round(recFromList.score * 100) : null;
  const matchedCt = gap ? (gap.matched_skills ?? gap.matched ?? []).length : 0;
  const adjCt = gap ? (gap.adjacent ?? []).length : 0;
  const fallbackPct = job.skillList && job.skillList.length > 0
    ? Math.min(95, Math.round(((matchedCt + adjCt * 0.5) / job.skillList.length) * 90))
    : null;
  const pct = listPct ?? fallbackPct;
  const pctSource: "ranked" | "estimated" | null = listPct != null ? "ranked" : (fallbackPct != null ? "estimated" : null);
  const explanation = recFromList?.explanation;
  const targetSkills = job.skillList ?? [];
  const verdict = marketVerdict(job.salary_min, job.salary_max, salary?.midpoint);

  return (
    <>
      <TopNav />
      <main style={{ maxWidth: 1500, margin: "0 auto", padding: "20px 48px 80px" }}>
        <Link
          href="/"
          style={{
            color: "var(--ink-3)",
            textDecoration: "none",
            fontSize: 13,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 16,
          }}
        >
          <ArrowLeft size={14} />
          Back to discover
        </Link>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 380px", gap: 36 }}>
          {/* ─── Sticky right rail (rendered first in DOM, placed right via grid) ── */}
          <aside style={{ alignSelf: "start", position: "sticky", top: 24, gridColumn: 2, gridRow: 1 }}>
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 14,
                padding: 22,
                boxShadow: "var(--shadow-2)",
              }}
            >
              {/* Big score */}
              {pct != null && (
                <div
                  style={{
                    marginBottom: 20,
                    padding: "18px 18px 16px",
                    background: "var(--accent-bg)",
                    border: "1px solid var(--accent-bdr)",
                    borderRadius: 12,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
                    <div
                      style={{
                        fontSize: 68,
                        lineHeight: 1,
                        color: "var(--accent)",
                        letterSpacing: "-0.045em",
                        fontWeight: 700,
                      }}
                    >
                      {pct}
                      <span style={{ fontSize: 28, verticalAlign: "super", marginLeft: 2, color: "var(--accent-2)" }}>%</span>
                    </div>
                    {recFromList && (
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
                          Rank
                        </div>
                        <div className="font-mono" style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)", marginTop: 2 }}>
                          #{(recFromList.rank ?? 0) + 1}
                          <span style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 400 }}> / {recommendations.length}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--accent-2)",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      fontWeight: 700,
                    }}
                  >
                    Overall fit
                    {pctSource === "estimated" && (
                      <span style={{ fontSize: 10.5, color: "var(--ink-3)", textTransform: "none", letterSpacing: 0, marginLeft: 8, fontWeight: 500 }}>
                        (estimated from your skills — not in your top picks)
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Skill-fit mini bar */}
              {gap && targetSkills.length > 0 && (() => {
                const m = (gap.matched_skills ?? gap.matched ?? []).length;
                const adj = (gap.adjacent ?? []).length;
                const total = targetSkills.length;
                const miss = Math.max(0, total - m - adj);
                return (
                  <div style={{ marginBottom: 18, paddingBottom: 18, borderBottom: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--ink-3)", marginBottom: 6 }}>
                      <span style={{ textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>Skill coverage</span>
                      <span className="font-mono" style={{ color: "var(--ink)", fontWeight: 600 }}>{m}/{total}</span>
                    </div>
                    <div style={{ display: "flex", height: 8, borderRadius: 999, overflow: "hidden", border: "1px solid var(--border)", background: "var(--surface-2)" }}>
                      {m > 0 && <div style={{ width: `${(m/total)*100}%`, background: "var(--positive)" }} />}
                      {adj > 0 && <div style={{ width: `${(adj/total)*100}%`, background: "var(--secondary)" }} />}
                      {miss > 0 && <div style={{ width: `${(miss/total)*100}%`, background: "var(--caution-bg)" }} />}
                    </div>
                    <div style={{ display: "flex", gap: 10, marginTop: 8, fontSize: 10.5, color: "var(--ink-3)" }}>
                      <span><span style={{ display: "inline-block", width: 6, height: 6, borderRadius: 99, background: "var(--positive)", marginRight: 4 }} />{m} matched</span>
                      <span><span style={{ display: "inline-block", width: 6, height: 6, borderRadius: 99, background: "var(--secondary)", marginRight: 4 }} />{adj} adj.</span>
                      <span><span style={{ display: "inline-block", width: 6, height: 6, borderRadius: 99, background: "var(--caution)", marginRight: 4 }} />{miss} gap</span>
                    </div>
                  </div>
                );
              })()}

              {verdict && (
                <div
                  style={{
                    fontSize: 13.5,
                    padding: "11px 14px",
                    borderRadius: 9,
                    background:
                      verdict.tone === "pos" ? "var(--positive-bg)" :
                      verdict.tone === "neg" ? "var(--caution-bg)" : "var(--surface-2)",
                    color:
                      verdict.tone === "pos" ? "var(--positive)" :
                      verdict.tone === "neg" ? "var(--caution)" : "var(--ink-2)",
                    border: `1px solid ${
                      verdict.tone === "pos" ? "var(--positive)" :
                      verdict.tone === "neg" ? "var(--caution)" : "var(--border)"
                    }`,
                    marginBottom: 20,
                    fontWeight: 600,
                    lineHeight: 1.35,
                  }}
                >
                  💰 {verdict.label}
                </div>
              )}

              <button
                style={{
                  display: "block",
                  width: "100%",
                  background: "var(--accent)",
                  color: "white",
                  border: 0,
                  borderRadius: 10,
                  padding: "14px 20px",
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: "pointer",
                  marginBottom: 10,
                  boxShadow: "0 4px 12px rgba(70,90,140,0.18)",
                  letterSpacing: "-0.005em",
                }}
                onClick={() => setToast("Application started")}
              >
                Apply now →
              </button>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <button
                  onClick={() => {
                    toggleSaveJob(jobId);
                    setToast(isSaved ? "Removed from saved" : "Saved to your list");
                  }}
                  style={{
                    background: isSaved ? "var(--accent-bg)" : "var(--bg)",
                    color: isSaved ? "var(--accent-2)" : "var(--ink)",
                    border: `1px solid ${isSaved ? "var(--accent-bdr)" : "var(--border)"}`,
                    borderRadius: 9,
                    padding: "11px 14px",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 7,
                  }}
                >
                  <Bookmark size={15} fill={isSaved ? "currentColor" : "none"} />
                  {isSaved ? "Saved" : "Save"}
                </button>
                <button
                  onClick={() => setToast("Link copied")}
                  style={{
                    background: "var(--bg)",
                    color: "var(--ink)",
                    border: "1px solid var(--border)",
                    borderRadius: 9,
                    padding: "11px 14px",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 7,
                  }}
                >
                  <Share2 size={15} />
                  Share
                </button>
              </div>

              {/* Skills you bring */}
              {gap && (gap.matched_skills ?? gap.matched ?? []).length > 0 && (
                <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 8 }}>
                    Skills you bring
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {(gap.matched_skills ?? gap.matched ?? []).slice(0, 8).map((s) => (
                      <span
                        key={s}
                        style={{
                          fontSize: 11,
                          padding: "3px 8px",
                          background: "var(--positive-bg)",
                          color: "var(--positive)",
                          border: "1px solid var(--positive)",
                          borderRadius: 5,
                          fontWeight: 500,
                        }}
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick facts */}
              <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 10 }}>
                <Fact
                  label="Posted"
                  value={job.posted_days_ago != null ? `${job.posted_days_ago}d ago` : "—"}
                  badge={job.posted_days_ago != null && job.posted_days_ago <= 3 ? { text: "FRESH", tone: "pos" } : undefined}
                />
                <Fact label="Location" value={job.location ?? "—"} />
                <Fact label="Seniority" value={job.seniority ?? "—"} />
                <Fact label="Category" value={job.category ?? "—"} />
                <Fact label="Skills required" value={String(targetSkills.length)} />
              </div>

              {/* Anchor nav */}
              <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid var(--border)" }}>
                <div style={{ fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 8 }}>
                  Jump to
                </div>
                <NavLink href="#fit">Your fit</NavLink>
                <NavLink href="#bridge">Skill bridge</NavLink>
                <NavLink href="#about">About the role</NavLink>
                <NavLink href="#similar">Similar roles</NavLink>
              </div>
            </div>
          </aside>

          {/* ─── Article content (left/center, takes column 1) ───────── */}
          <article style={{ gridColumn: 1, gridRow: 1, minWidth: 0 }}>
            {/* Hero with company glyph + headline stats */}
            <header
              style={{
                marginBottom: 28,
                padding: "26px 28px",
                background: "linear-gradient(135deg, var(--accent-bg) 0%, var(--surface) 70%)",
                border: "1px solid var(--accent-bdr)",
                borderRadius: 16,
                boxShadow: "var(--shadow-2)",
                display: "grid",
                gridTemplateColumns: "64px 1fr auto",
                gap: 20,
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 14,
                  background: "var(--accent)",
                  color: "white",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 28,
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                  boxShadow: "var(--shadow-2)",
                }}
              >
                {(job.company || job.title || "?").trim().charAt(0).toUpperCase()}
              </div>
              <div>
                <div
                  style={{
                    fontSize: 11.5,
                    color: "var(--accent-2)",
                    letterSpacing: "0.06em",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}
                >
                  {[job.company, job.location, job.posted_days_ago != null ? `${job.posted_days_ago}d ago` : null].filter(Boolean).join(" · ")}
                </div>
                <h1
                  style={{
                    fontSize: 30,
                    lineHeight: 1.15,
                    letterSpacing: "-0.025em",
                    color: "var(--ink)",
                    margin: "0 0 10px",
                    fontWeight: 600,
                  }}
                >
                  {job.title}
                </h1>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {[job.employment_type, job.seniority, job.category].filter(Boolean).map((label, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: 11,
                        padding: "3px 9px",
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: 999,
                        color: "var(--ink-2)",
                        fontWeight: 500,
                      }}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
              {/* Headline stats column on hero — fills the right-side dead space */}
              <div style={{ display: "flex", gap: 18, paddingLeft: 18, borderLeft: "1px solid var(--accent-bdr)" }}>
                <HeroStat
                  label="Posted base"
                  value={job.salary_min != null && job.salary_max != null
                    ? `$${Math.round(job.salary_min/1000)}–${Math.round(job.salary_max/1000)}k`
                    : "—"}
                />
                <HeroStat
                  label="Skills required"
                  value={String(targetSkills.length)}
                />
                {salary && (
                  <HeroStat
                    label="Market mid"
                    value={`$${Math.round(salary.midpoint/1000)}k`}
                    tone={verdict?.tone}
                  />
                )}
              </div>
            </header>

            {/* Opening hook from the reranker */}
            {explanation && (
              <section
                style={{
                  background: "var(--secondary-bg)",
                  border: "1px solid var(--secondary-bdr)",
                  borderRadius: 12,
                  padding: "20px 24px",
                  marginBottom: 32,
                  display: "flex",
                  gap: 16,
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: "var(--secondary-2)",
                    color: "white",
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                  }}
                >
                  <Sparkles size={16} />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--secondary-2)",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      marginBottom: 8,
                    }}
                  >
                    Why this job matches you
                  </div>
                  <p
                    style={{ margin: 0, fontSize: 15, color: "var(--ink)", lineHeight: 1.65, fontWeight: 400 }}
                  >
                    {explanation}
                  </p>
                </div>
              </section>
            )}

            {/* Integrated fit + salary */}
            <Section
              id="fit"
              eyebrow="Skills + pay analysis"
              heading="How your skills match, and what you should be paid"
            >
              <FitVisualization
                gap={gap}
                targetSkills={targetSkills}
                predicted={salary}
                postedMin={job.salary_min}
                postedMax={job.salary_max}
              />
            </Section>

            {/* Skill bridge graph */}
            <Section
              id="bridge"
              eyebrow="Skills you'd need to learn"
              heading="Which skills connect what you know to what this role needs"
            >
              {gap ? (
                <SkillBridgeGraph gap={gap} />
              ) : (
                <div style={{ fontSize: 14, color: "var(--ink-3)" }}>Building your skill graph…</div>
              )}
            </Section>

            {/* About */}
            {job.description && (
              <Section id="about" eyebrow="Role description" heading="What the employer wrote about this job">
                <p
                  style={{
                    margin: 0,
                    fontSize: 15,
                    color: "var(--ink-2)",
                    lineHeight: 1.7,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {job.description}
                </p>
              </Section>
            )}

            {/* Similar — bento grid with direction-driven tiles */}
            {similar.length > 0 && (
              <Section
                id="similar"
                eyebrow="Other jobs to consider"
                heading="Roles like this one — some pay more, some pay less"
                hint="Each tile compares the alternative to this job. The big featured tile is the one that pays the most more."
              >
                <SimilarBento similar={similar} baseline={job} />
              </Section>
            )}
          </article>
        </div>
      </main>
    </>
  );
}

function Section({
  id,
  eyebrow,
  heading,
  hint,
  children,
}: {
  id?: string;
  eyebrow: string;
  heading: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} style={{ marginBottom: 44, scrollMarginTop: 24 }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: "var(--accent-2)",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        {eyebrow}
      </div>
      <h2
        style={{
          fontSize: 24,
          fontWeight: 600,
          letterSpacing: "-0.02em",
          color: "var(--ink)",
          lineHeight: 1.25,
          margin: "0 0 16px",
        }}
      >
        {heading}
      </h2>
      {hint && (
        <p style={{ margin: "0 0 22px", fontSize: 14.5, color: "var(--ink-2)", lineHeight: 1.55 }}>{hint}</p>
      )}
      {children}
    </section>
  );
}

function Fact({
  label,
  value,
  badge,
}: { label: string; value: string; badge?: { text: string; tone: "pos" | "neg" } }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
      <span style={{ fontSize: 12.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
        {label}
      </span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, maxWidth: "65%", justifyContent: "flex-end" }}>
        <span style={{ fontSize: 14, color: "var(--ink)", textAlign: "right", fontWeight: 500 }}>{value}</span>
        {badge && (
          <span
            style={{
              fontSize: 9,
              padding: "2px 6px",
              borderRadius: 4,
              fontWeight: 700,
              letterSpacing: "0.06em",
              background: badge.tone === "pos" ? "var(--positive-bg)" : "var(--caution-bg)",
              color: badge.tone === "pos" ? "var(--positive)" : "var(--caution)",
              border: `1px solid ${badge.tone === "pos" ? "var(--positive)" : "var(--caution)"}`,
            }}
          >
            {badge.text}
          </span>
        )}
      </span>
    </div>
  );
}

function HeroStat({ label, value, tone }: { label: string; value: string; tone?: "pos" | "neg" | "neutral" }) {
  const color = tone === "pos" ? "var(--positive)" : tone === "neg" ? "var(--caution)" : "var(--ink)";
  return (
    <div>
      <div
        className="font-mono"
        style={{ fontSize: 17, fontWeight: 600, color, letterSpacing: "-0.01em", lineHeight: 1.1 }}
      >
        {value}
      </div>
      <div style={{ fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginTop: 4, whiteSpace: "nowrap" }}>
        {label}
      </div>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      style={{
        display: "block",
        padding: "5px 0",
        fontSize: 12.5,
        color: "var(--ink-2)",
        textDecoration: "none",
        borderLeft: "2px solid transparent",
        paddingLeft: 10,
        marginLeft: -12,
        transition: "color 0.15s, border-color 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = "var(--accent)";
        e.currentTarget.style.borderLeftColor = "var(--accent)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = "var(--ink-2)";
        e.currentTarget.style.borderLeftColor = "transparent";
      }}
    >
      {children}
    </a>
  );
}

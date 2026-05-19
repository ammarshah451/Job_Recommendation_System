"use client";
import { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api";
import type { Recommendation } from "@/lib/types";

const STAGES = [
  { role: "ML Engineer II",    salary: "$120–140k", years: "0–2 yrs" },
  { role: "Senior ML Eng.",    salary: "$160–200k", years: "2–5 yrs", isCurrent: true },
  { role: "Staff ML Eng.",     salary: "$220–280k", years: "5–8 yrs" },
  { role: "Principal / Lead",  salary: "$300k+",    years: "8+ yrs" },
];

const DEMAND  = [44, 52, 51, 66, 78, 88, 100];
const MONTHS  = ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May"];

const TIPS = [
  { icon: "🎯", text: "Apply early — top roles fill within 72 hours of posting." },
  { icon: "✍️", text: "Your profile is 89% complete — add a headline to finish." },
  { icon: "⏱",  text: "Most companies review fastest Tue–Wed mornings." },
];

export function CareerSidebar() {
  const barsRef = useRef<(HTMLDivElement | null)[]>([]);
  const { selectedJobId } = useAppStore();
  const [similar, setSimilar] = useState<Recommendation[]>([]);

  // Animate demand bars on mount
  useEffect(() => {
    import("gsap").then(({ gsap }) => {
      barsRef.current.forEach((el, i) => {
        if (!el) return;
        gsap.from(el, { height: 0, duration: 0.8, delay: 0.1 + i * 0.06, ease: "back.out(1.3)" });
      });
    });
  }, []);

  // Fetch similar jobs when selection changes
  useEffect(() => {
    if (!selectedJobId) { setSimilar([]); return; }
    api.similar(selectedJobId)
      .then((res) => setSimilar(res.recommendations.slice(0, 3)))
      .catch(() => setSimilar([]));
  }, [selectedJobId]);

  return (
    <div style={{
      borderLeft: "1px solid var(--border)",
      background: "var(--warm0)",
      display: "flex", flexDirection: "column",
      overflowY: "auto",
    }}>

      {/* ── Career path ── */}
      <section style={{ padding: "18px 18px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ fontSize: 9.5, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--warm3)", fontWeight: 700, marginBottom: 14 }}>
          Your career path
        </div>
        <div style={{ position: "relative", paddingLeft: 22 }}>
          {/* Vertical connector */}
          <div style={{
            position: "absolute", left: 8, top: 10, bottom: 10,
            width: 1, background: "var(--warm2)",
          }} />
          {STAGES.map((stage) => (
            <div key={stage.role} style={{ position: "relative", paddingBottom: 14 }}>
              {/* Node */}
              <div style={{
                position: "absolute", left: -14, top: 3,
                width: 16, height: 16, borderRadius: "50%",
                background: stage.isCurrent ? "var(--accent)" : "var(--warm0)",
                border: `2px solid ${stage.isCurrent ? "var(--accent)" : "var(--warm2)"}`,
                boxShadow: stage.isCurrent ? "0 0 0 4px var(--accent-bg)" : undefined,
                animation: stage.isCurrent ? "glow-pulse 2.5s ease-in-out infinite" : undefined,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {!stage.isCurrent && (
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--warm2)" }} />
                )}
              </div>
              <div style={{ fontSize: 11.5, fontWeight: 500, color: "var(--ink)", lineHeight: 1.3 }}>{stage.role}</div>
              <div style={{ fontSize: 10, color: stage.isCurrent ? "var(--accent)" : "var(--ink3)", marginTop: 1, fontWeight: stage.isCurrent ? 600 : 400 }}>
                {stage.salary}
              </div>
              <div style={{ fontSize: 9, color: "var(--ink4)", marginTop: 1 }}>{stage.years}</div>
              {stage.isCurrent && (
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 3,
                  fontSize: 8, background: "var(--accent-bg)", color: "var(--accent)",
                  padding: "2px 6px", borderRadius: 4, fontWeight: 700, marginTop: 3,
                  border: "1px solid var(--accent-bdr)", letterSpacing: "0.04em",
                }}>YOU ARE HERE</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Market demand chart ── */}
      <section style={{ padding: "16px 18px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ fontSize: 9.5, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--warm3)", fontWeight: 700, marginBottom: 10 }}>
          ML Eng. hiring demand
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 3, marginBottom: 5 }}>
          <span className="font-mono" style={{ fontSize: 20, fontWeight: 600, color: "var(--ink)", lineHeight: 1 }}>+42%</span>
          <span style={{ fontSize: 10, fontWeight: 600, color: "var(--accent)", marginBottom: 2 }}>↑ growing</span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 48, marginBottom: 6 }}>
          {DEMAND.map((h, i) => (
            <div key={i} style={{ flex: 1, position: "relative", height: "100%" }}>
              <div
                ref={(el) => { barsRef.current[i] = el; }}
                style={{
                  position: "absolute", bottom: 0, left: 0, right: 0,
                  borderRadius: "3px 3px 0 0",
                  background: "var(--accent)",
                  opacity: i === DEMAND.length - 1 ? 1 : 0.3 + (i / DEMAND.length) * 0.55,
                  height: `${h}%`,
                }}
              />
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 0 }}>
          {MONTHS.map((m, i) => (
            <div key={m} style={{
              flex: 1, fontSize: 7.5, textAlign: "center",
              color: i === MONTHS.length - 1 ? "var(--accent)" : "var(--ink4)",
              fontWeight: i === MONTHS.length - 1 ? 600 : 400,
            }}>{m}</div>
          ))}
        </div>
        <div style={{ fontSize: 10, color: "var(--ink3)", marginTop: 7, lineHeight: 1.5 }}>
          <strong style={{ color: "var(--ink)" }}>42% more roles</strong> requiring ML skills vs. 6 months ago.
        </div>
      </section>

      {/* ── Quick wins ── */}
      <section style={{ padding: "16px 18px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ fontSize: 9.5, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--warm3)", fontWeight: 700, marginBottom: 12 }}>
          Quick wins
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {TIPS.map((tip, i) => (
            <div key={i} style={{
              display: "flex", gap: 9, alignItems: "flex-start",
              background: "var(--cream)", border: "1px solid var(--warm2)",
              borderRadius: 10, padding: "10px 11px",
            }}>
              <span style={{ fontSize: 14, flexShrink: 0, lineHeight: 1.4 }}>{tip.icon}</span>
              <span style={{ fontSize: 11, color: "var(--ink2)", lineHeight: 1.6 }}>{tip.text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Similar roles ── */}
      <section style={{ padding: "16px 18px", flex: 1 }}>
        <div style={{ fontSize: 9.5, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--warm3)", fontWeight: 700, marginBottom: 12 }}>
          Similar roles
        </div>
        {similar.length === 0 ? (
          <div style={{ fontSize: 11, color: "var(--ink4)", lineHeight: 1.6 }}>
            {selectedJobId ? "Loading similar roles…" : "Select a job to see similar roles"}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {similar.map((rec) => (
              <div key={rec.job.job_id} style={{
                display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8,
                padding: "9px 0", borderBottom: "1px solid rgba(0,0,0,0.05)", cursor: "pointer",
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 500, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {rec.job.title}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--ink3)", marginTop: 2 }}>
                    {rec.job.company} · {rec.job.location}
                  </div>
                </div>
                <span className="font-mono" style={{ fontSize: 11.5, fontWeight: 600, color: "var(--accent)", flexShrink: 0 }}>
                  {Math.round(rec.score * 100)}%
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

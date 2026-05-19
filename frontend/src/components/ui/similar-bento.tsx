"use client";
import Link from "next/link";
import { ArrowUpRight, ArrowDownRight, ArrowRight, MapPin, TrendingUp, Briefcase } from "lucide-react";
import type { Recommendation, Job } from "@/lib/types";

interface Props {
  similar: Recommendation[];
  baseline: Job;
}

function midpoint(min: number | null, max: number | null): number | null {
  if (min == null || max == null) return null;
  return (min + max) / 2;
}

function classifyDirection(a: Job, b: Job): "up" | "down" | "side" {
  const aSal = midpoint(a.salary_min, a.salary_max);
  const bSal = midpoint(b.salary_min, b.salary_max);
  if (aSal != null && bSal != null) {
    const d = aSal - bSal;
    if (d > 5000) return "up";
    if (d < -5000) return "down";
  }
  return "side";
}

function fmtDelta(a: Job, b: Job): { text: string; sign: "+" | "-" | "" } {
  const aSal = midpoint(a.salary_min, a.salary_max);
  const bSal = midpoint(b.salary_min, b.salary_max);
  if (aSal == null || bSal == null) return { text: "Similar pay", sign: "" };
  const d = aSal - bSal;
  const k = Math.round(Math.abs(d) / 1000);
  if (d > 5000) return { text: `+$${k}k more`, sign: "+" };
  if (d < -5000) return { text: `-$${k}k less`, sign: "-" };
  return { text: "Similar pay", sign: "" };
}

/** Bento layout v2: cleaner grid, more breathing room, hero tile has a real
 *  fit-vs-current comparison chart. Tiles fade-in on mount with stagger. */
export function SimilarBento({ similar, baseline }: Props) {
  if (similar.length === 0) return null;

  const sorted = [...similar].sort((a, b) => {
    const da = (midpoint(a.job.salary_min, a.job.salary_max) ?? 0) - (midpoint(baseline.salary_min, baseline.salary_max) ?? 0);
    const db = (midpoint(b.job.salary_min, b.job.salary_max) ?? 0) - (midpoint(baseline.salary_min, baseline.salary_max) ?? 0);
    return db - da;
  });
  const hero = sorted[0];
  const others = sorted.slice(1, 4);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1.55fr) minmax(0, 1fr) minmax(0, 1fr)",
        gridTemplateRows: "auto auto",
        gap: 18,
      }}
    >
      <HeroTile rec={hero} baseline={baseline} />
      {others[0] && <SatelliteTile rec={others[0]} baseline={baseline} />}
      {others[1] && <SatelliteTile rec={others[1]} baseline={baseline} />}
      {others[2] && (
        <div style={{ gridColumn: "2 / span 2" }}>
          <WideTile rec={others[2]} baseline={baseline} />
        </div>
      )}
    </div>
  );
}

function directionStyle(dir: "up" | "down" | "side") {
  return dir === "up"
    ? { color: "var(--positive)", bg: "var(--positive-bg)", grad: "linear-gradient(135deg, oklch(0.92 0.07 165) 0%, oklch(0.97 0.025 165) 70%)", Icon: ArrowUpRight }
    : dir === "down"
      ? { color: "var(--caution)", bg: "var(--caution-bg)", grad: "linear-gradient(135deg, oklch(0.93 0.06 40) 0%, oklch(0.97 0.02 40) 70%)", Icon: ArrowDownRight }
      : { color: "var(--accent-2)", bg: "var(--accent-bg)", grad: "linear-gradient(135deg, oklch(0.92 0.04 255) 0%, oklch(0.97 0.018 255) 70%)", Icon: ArrowRight };
}

function HeroTile({ rec, baseline }: { rec: Recommendation; baseline: Job }) {
  const dir = classifyDirection(rec.job, baseline);
  const { color, grad, Icon } = directionStyle(dir);
  const delta = fmtDelta(rec.job, baseline);
  const label = dir === "up" ? "Pays more" : dir === "down" ? "Pays less" : "Similar pay";

  const aSkills = (rec.job.skillList ?? []).length;
  const bSkills = (baseline.skillList ?? []).length;
  const skillDelta = aSkills - bSkills;

  const aSalMid = midpoint(rec.job.salary_min, rec.job.salary_max) ?? 0;
  const bSalMid = midpoint(baseline.salary_min, baseline.salary_max) ?? 0;
  const maxSal = Math.max(aSalMid, bSalMid, 1);

  return (
    <Link
      href={`/jobs/${rec.job.job_id}`}
      className="tile-enter"
      style={{
        display: "block",
        position: "relative",
        gridRow: "span 2",
        background: grad,
        border: `1px solid ${color}55`,
        borderRadius: 16,
        padding: 24,
        textDecoration: "none",
        color: "inherit",
        boxShadow: "var(--shadow-2)",
        overflow: "hidden",
        minHeight: 320,
        transition: "transform 0.22s cubic-bezier(0.22,1,0.36,1), box-shadow 0.22s, border-color 0.22s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow = "var(--shadow-3)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "var(--shadow-2)";
      }}
    >
      {/* Decorative corner glow */}
      <div
        style={{
          position: "absolute",
          top: -50,
          right: -50,
          width: 180,
          height: 180,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${color}33 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      {/* Eyebrow + direction icon */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, position: "relative" }}>
        <div>
          <div style={{ fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, marginBottom: 4 }}>
            Featured alternative
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color }}>
            <TrendingUp size={14} />
            {label} · <span className="font-mono">{delta.text}</span>
          </div>
        </div>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 13,
            background: color,
            color: "white",
            display: "grid",
            placeItems: "center",
            boxShadow: "0 6px 16px rgba(0,0,0,0.15)",
          }}
        >
          <Icon size={22} strokeWidth={2.4} />
        </div>
      </div>

      {/* Title */}
      <h4
        style={{
          margin: "0 0 8px",
          fontSize: 22,
          fontWeight: 700,
          color: "var(--ink)",
          letterSpacing: "-0.02em",
          lineHeight: 1.2,
          paddingRight: 12,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {rec.job.title}
      </h4>
      <div style={{ fontSize: 13, color: "var(--ink-2)", display: "flex", alignItems: "center", gap: 10, marginBottom: 22, flexWrap: "wrap" }}>
        {rec.job.location && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <MapPin size={12} /> {rec.job.location}
          </span>
        )}
        {rec.job.category && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <Briefcase size={12} /> {rec.job.category}
          </span>
        )}
      </div>

      {/* Mini-chart: salary comparison bar */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 10 }}>
          Salary comparison
        </div>
        <BarRow label="This job" value={bSalMid} max={maxSal} color="var(--ink-3)" />
        <BarRow label={rec.job.title.slice(0, 18) + (rec.job.title.length > 18 ? "…" : "")} value={aSalMid} max={maxSal} color={color} highlight />
      </div>

      {/* Stat strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 14,
          paddingTop: 16,
          borderTop: `1px solid ${color}33`,
        }}
      >
        <HeroStat
          label="Salary range"
          value={
            rec.job.salary_min != null && rec.job.salary_max != null
              ? `$${Math.round(rec.job.salary_min / 1000)}–${Math.round(rec.job.salary_max / 1000)}k`
              : "—"
          }
        />
        <HeroStat
          label="Skills required"
          value={`${aSkills}${skillDelta !== 0 ? ` (${skillDelta > 0 ? "+" : ""}${skillDelta})` : ""}`}
          tone={skillDelta < 0 ? "pos" : skillDelta > 0 ? "neg" : "neutral"}
        />
        <HeroStat label="Seniority" value={rec.job.seniority ?? "—"} />
      </div>

      {/* Footer link cue */}
      <div style={{ position: "absolute", bottom: 16, right: 18, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color }}>
        See this role <ArrowUpRight size={14} />
      </div>
    </Link>
  );
}

function SatelliteTile({ rec, baseline }: { rec: Recommendation; baseline: Job }) {
  const dir = classifyDirection(rec.job, baseline);
  const { color, Icon } = directionStyle(dir);
  const delta = fmtDelta(rec.job, baseline);
  const label = dir === "up" ? "Pays more" : dir === "down" ? "Pays less" : "Similar pay";

  return (
    <Link
      href={`/jobs/${rec.job.job_id}`}
      className="tile-enter"
      style={{
        display: "block",
        position: "relative",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderLeft: `4px solid ${color}`,
        borderRadius: 14,
        padding: 18,
        textDecoration: "none",
        color: "inherit",
        boxShadow: "var(--shadow-1)",
        overflow: "hidden",
        minHeight: 150,
        transition: "transform 0.22s cubic-bezier(0.22,1,0.36,1), box-shadow 0.22s, border-color 0.22s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "var(--shadow-2)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "var(--shadow-1)";
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          <Icon size={12} />
          {label}
        </span>
        <span className="font-mono" style={{ fontSize: 13, fontWeight: 700, color, letterSpacing: "-0.01em" }}>
          {delta.text}
        </span>
      </div>

      <h4
        style={{
          margin: "0 0 6px",
          fontSize: 15,
          fontWeight: 600,
          color: "var(--ink)",
          letterSpacing: "-0.015em",
          lineHeight: 1.3,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {rec.job.title}
      </h4>

      <div style={{ fontSize: 12, color: "var(--ink-3)", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        {rec.job.location && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <MapPin size={11} /> {rec.job.location}
          </span>
        )}
        {rec.job.salary_min != null && rec.job.salary_max != null && (
          <span className="font-mono" style={{ color: "var(--ink-2)", fontWeight: 500 }}>
            ${Math.round(rec.job.salary_min / 1000)}–{Math.round(rec.job.salary_max / 1000)}k
          </span>
        )}
      </div>
    </Link>
  );
}

function WideTile({ rec, baseline }: { rec: Recommendation; baseline: Job }) {
  const dir = classifyDirection(rec.job, baseline);
  const { color, Icon } = directionStyle(dir);
  const delta = fmtDelta(rec.job, baseline);
  const label = dir === "up" ? "Pays more" : dir === "down" ? "Pays less" : "Similar pay";

  return (
    <Link
      href={`/jobs/${rec.job.job_id}`}
      className="tile-enter"
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto auto",
        gap: 18,
        alignItems: "center",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderLeft: `4px solid ${color}`,
        borderRadius: 14,
        padding: "16px 22px",
        textDecoration: "none",
        color: "inherit",
        boxShadow: "var(--shadow-1)",
        transition: "transform 0.22s cubic-bezier(0.22,1,0.36,1), box-shadow 0.22s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "var(--shadow-2)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "var(--shadow-1)";
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: color,
          color: "white",
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={16} strokeWidth={2.4} />
      </div>
      <div style={{ minWidth: 0 }}>
        <h4 style={{ margin: "0 0 2px", fontSize: 14.5, fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.01em", lineHeight: 1.25, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {rec.job.title}
        </h4>
        <div style={{ fontSize: 12, color: "var(--ink-3)" }}>
          {[label, rec.job.location, rec.job.category].filter(Boolean).join(" · ")}
        </div>
      </div>
      <span className="font-mono" style={{ fontSize: 14, fontWeight: 700, color, letterSpacing: "-0.01em" }}>
        {delta.text}
      </span>
      {rec.job.salary_min != null && rec.job.salary_max != null && (
        <span className="font-mono" style={{ fontSize: 13, color: "var(--ink-2)", fontWeight: 500, whiteSpace: "nowrap" }}>
          ${Math.round(rec.job.salary_min / 1000)}–{Math.round(rec.job.salary_max / 1000)}k
        </span>
      )}
    </Link>
  );
}

function BarRow({ label, value, max, color, highlight }: { label: string; value: number; max: number; color: string; highlight?: boolean }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginBottom: 4 }}>
        <span style={{ color: highlight ? "var(--ink)" : "var(--ink-3)", fontWeight: highlight ? 600 : 500 }}>{label}</span>
        <span className="font-mono" style={{ color: highlight ? color : "var(--ink-3)", fontWeight: 600 }}>
          ${Math.round(value / 1000)}k
        </span>
      </div>
      <div style={{ height: 8, background: "var(--surface-2)", borderRadius: 999, overflow: "hidden", border: "1px solid var(--border)" }}>
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: highlight ? color : "var(--ink-4)",
            borderRadius: 999,
            transition: "width 800ms cubic-bezier(0.22,1,0.36,1)",
          }}
        />
      </div>
    </div>
  );
}

function HeroStat({ label, value, tone }: { label: string; value: string; tone?: "pos" | "neg" | "neutral" }) {
  const color = tone === "pos" ? "var(--positive)" : tone === "neg" ? "var(--caution)" : "var(--ink)";
  return (
    <div>
      <div style={{ fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 5 }}>
        {label}
      </div>
      <div className="font-mono" style={{ fontSize: 14, fontWeight: 600, color, lineHeight: 1.1, letterSpacing: "-0.01em" }}>
        {value}
      </div>
    </div>
  );
}

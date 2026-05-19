"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell, Search, Bookmark, Briefcase, Sparkles, Command } from "lucide-react";
import { useAppStore } from "@/lib/store";

const tabs = [
  { href: "/", label: "Discover", icon: Sparkles },
  { href: "/saved", label: "Saved", icon: Bookmark },
  { href: "/applied", label: "Applied", icon: Briefcase },
] as const;

export function TopNav({ active = "/" }: { active?: string }) {
  const savedCount = useAppStore((s) => s.savedJobIds.length);
  const recommendations = useAppStore((s) => s.recommendations);
  const setCmdPaletteOpen = useAppStore((s) => s.setCmdPaletteOpen);

  const topMatch = recommendations[0];
  const topPct = topMatch ? Math.round(topMatch.score * 100) : null;
  const matchCount = recommendations.length;

  // Detect mac vs other for cmd key hint
  const [isMac, setIsMac] = useState(false);
  useEffect(() => {
    setIsMac(typeof navigator !== "undefined" && /Mac/.test(navigator.platform));
  }, []);

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        backdropFilter: "saturate(140%) blur(12px)",
        background: "linear-gradient(180deg, oklch(0.98 0.012 85 / 0.92) 0%, oklch(0.96 0.012 85 / 0.85) 100%)",
        borderBottom: "1px solid var(--border)",
        boxShadow: "0 1px 0 rgba(0,0,0,0.02), 0 8px 24px -16px rgba(0,0,0,0.08)",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr auto",
          alignItems: "center",
          gap: 24,
          padding: "12px 40px",
          maxWidth: 1600,
          margin: "0 auto",
        }}
      >
        {/* Logo + tabs */}
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <Link
            href="/"
            style={{ display: "flex", alignItems: "center", gap: 11, textDecoration: "none", color: "var(--ink)" }}
          >
            <div style={{ position: "relative" }}>
              {/* Glow blob behind the mark */}
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  inset: -8,
                  background: "radial-gradient(circle, oklch(0.55 0.10 255 / 0.35) 0%, transparent 70%)",
                  filter: "blur(8px)",
                  borderRadius: "50%",
                  pointerEvents: "none",
                }}
              />
              <div
                style={{
                  position: "relative",
                  width: 38,
                  height: 38,
                  borderRadius: 11,
                  background: "linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 55%, oklch(0.42 0.10 280) 100%)",
                  display: "grid",
                  placeItems: "center",
                  color: "white",
                  fontWeight: 800,
                  fontSize: 18,
                  letterSpacing: "-0.03em",
                  boxShadow: "0 6px 18px rgba(70,90,140,0.42), inset 0 1px 0 rgba(255,255,255,0.28), inset 0 -1px 0 rgba(0,0,0,0.18)",
                  overflow: "hidden",
                }}
              >
                {/* Diagonal shimmer */}
                <span
                  aria-hidden
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(115deg, transparent 35%, rgba(255,255,255,0.22) 50%, transparent 65%)",
                    animation: "nexus-shimmer 5s linear infinite",
                  }}
                />
                <span style={{ position: "relative", zIndex: 1 }}>N</span>
                <span
                  aria-hidden
                  style={{
                    position: "absolute",
                    top: -3,
                    right: -3,
                    width: 11,
                    height: 11,
                    borderRadius: "50%",
                    background: "var(--positive)",
                    border: "2px solid var(--surface)",
                    boxShadow: "0 0 0 0 var(--positive)",
                    animation: "nexus-pulse 2.4s ease-out infinite",
                  }}
                />
              </div>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16.5, letterSpacing: "-0.015em", lineHeight: 1 }}>
                NexusHire
              </div>
              <div style={{ fontSize: 9.5, color: "var(--ink-3)", letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 600, marginTop: 3 }}>
                AI job matching
              </div>
            </div>
          </Link>

          <div style={{ display: "flex", gap: 2, marginLeft: 14, padding: 3, background: "var(--surface-2)", borderRadius: 10, border: "1px solid var(--border)" }}>
            {tabs.map(({ href, label, icon: Icon }) => {
              const isActive = href === active;
              return (
                <Link
                  key={href}
                  href={href}
                  style={{
                    textDecoration: "none",
                    color: isActive ? "var(--ink)" : "var(--ink-2)",
                    fontSize: 13,
                    fontWeight: 600,
                    padding: "7px 13px",
                    borderRadius: 7,
                    background: isActive ? "var(--surface)" : "transparent",
                    boxShadow: isActive ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    transition: "all 0.15s",
                  }}
                >
                  <Icon size={13} />
                  {label}
                  {label === "Saved" && savedCount > 0 && (
                    <span
                      className="font-mono"
                      style={{
                        fontSize: 10,
                        background: "var(--accent)",
                        color: "white",
                        padding: "1px 6px",
                        borderRadius: 5,
                        fontWeight: 700,
                      }}
                    >
                      {savedCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Center: live signal strip — fills the middle with real data */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <button
            type="button"
            onClick={() => setCmdPaletteOpen(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 14,
              padding: "8px 14px 8px 12px",
              borderRadius: 999,
              border: "1px solid var(--border)",
              background: "var(--surface)",
              cursor: "pointer",
              color: "var(--ink-2)",
              fontSize: 13,
              boxShadow: "var(--shadow-1)",
              transition: "border-color 0.15s, box-shadow 0.15s",
              maxWidth: 580,
              width: "100%",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--accent-bdr)";
              e.currentTarget.style.boxShadow = "var(--shadow-2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.boxShadow = "var(--shadow-1)";
            }}
          >
            <Search size={15} color="var(--ink-3)" />
            <span style={{ flex: 1, textAlign: "left", color: "var(--ink-3)" }}>
              Search jobs, skills, companies…
            </span>
            {matchCount > 0 && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 10, paddingLeft: 12, marginLeft: 4, borderLeft: "1px solid var(--border)" }}>
                <Stat label="Matches" value={String(matchCount)} tone="accent" />
                {topPct != null && <Stat label="Top fit" value={`${topPct}%`} tone="positive" />}
              </span>
            )}
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
                padding: "3px 7px",
                borderRadius: 5,
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                fontSize: 10.5,
                color: "var(--ink-3)",
                fontWeight: 600,
                fontFamily: "Geist Mono, monospace",
                marginLeft: 4,
              }}
            >
              {isMac ? <Command size={10} /> : "Ctrl"} K
            </span>
          </button>
        </div>

        {/* Right cluster */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            aria-label="Notifications"
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "var(--surface)",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
              color: "var(--ink-2)",
              position: "relative",
              boxShadow: "var(--shadow-1)",
            }}
          >
            <Bell size={16} />
            <span
              style={{
                position: "absolute",
                top: 8,
                right: 9,
                fontSize: 8.5,
                fontFamily: "Geist Mono, monospace",
                fontWeight: 700,
                color: "white",
                background: "var(--caution)",
                borderRadius: 999,
                padding: "1px 4px",
                border: "1.5px solid var(--surface)",
                lineHeight: 1,
              }}
            >
              3
            </span>
          </button>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 9,
              padding: "5px 12px 5px 5px",
              borderRadius: 999,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow-1)",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
                color: "white",
                display: "grid",
                placeItems: "center",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "-0.01em",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18)",
              }}
            >
              A
            </div>
            <div style={{ lineHeight: 1.15 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>Ammar</div>
              <div style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.04em" }}>Free plan</div>
            </div>
          </div>
        </div>
      </div>

      {/* Trending skills/categories strip — live signal under the nav */}
      {recommendations.length > 0 && <TrendingStrip />}

      {/* Bottom gradient accent line — subtle multi-hue strip */}
      <div
        aria-hidden
        style={{
          height: 2,
          background:
            "linear-gradient(90deg, transparent 0%, oklch(0.55 0.10 255 / 0.6) 20%, oklch(0.55 0.13 80 / 0.5) 50%, oklch(0.55 0.09 165 / 0.6) 80%, transparent 100%)",
          opacity: 0.55,
        }}
      />

      {/* Animations */}
      <style jsx>{`
        @keyframes nexus-pulse {
          0% { box-shadow: 0 0 0 0 oklch(0.55 0.09 165 / 0.55); }
          70% { box-shadow: 0 0 0 8px oklch(0.55 0.09 165 / 0); }
          100% { box-shadow: 0 0 0 0 oklch(0.55 0.09 165 / 0); }
        }
        @keyframes nexus-shimmer {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(120%); }
        }
      `}</style>
    </nav>
  );
}

function TrendingStrip() {
  const recommendations = useAppStore((s) => s.recommendations);

  // Compute top-3 most-required skills across the current rec set, and the
  // freshest job. Both derive from real data.
  const skillCounts = new Map<string, number>();
  let freshest: { title: string; days: number } | null = null;
  for (const r of recommendations) {
    for (const s of r.job.skillList ?? []) {
      skillCounts.set(s, (skillCounts.get(s) ?? 0) + 1);
    }
    if (r.job.posted_days_ago != null && (freshest == null || r.job.posted_days_ago < freshest.days)) {
      freshest = { title: r.job.title, days: r.job.posted_days_ago };
    }
  }
  const trending = [...skillCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([s, n]) => ({ skill: s, count: n }));

  if (trending.length === 0) return null;

  return (
    <div
      style={{
        background: "linear-gradient(90deg, oklch(0.94 0.02 250 / 0.5) 0%, oklch(0.96 0.012 85 / 0.3) 100%)",
        borderTop: "1px solid var(--border)",
        padding: "8px 40px",
        display: "flex",
        alignItems: "center",
        gap: 18,
        fontSize: 12,
        color: "var(--ink-3)",
        maxWidth: 1600,
        margin: "0 auto",
        overflow: "hidden",
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--accent-2)", fontWeight: 700, fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.12em", whiteSpace: "nowrap" }}>
        <span
          aria-hidden
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "var(--positive)",
            boxShadow: "0 0 6px var(--positive)",
            animation: "nexus-pulse 2.4s ease-out infinite",
          }}
        />
        Trending in your matches
      </span>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flex: 1, minWidth: 0, overflow: "hidden" }}>
        {trending.map(({ skill, count }) => (
          <span
            key={skill}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "3px 9px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 999,
              fontSize: 11.5,
              color: "var(--ink-2)",
              whiteSpace: "nowrap",
              fontWeight: 500,
            }}
          >
            {skill}
            <span className="font-mono" style={{ color: "var(--ink-3)", fontSize: 10, fontWeight: 600 }}>
              ×{count}
            </span>
          </span>
        ))}
      </div>
      {freshest && (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--ink-3)", fontSize: 11.5, whiteSpace: "nowrap" }}>
          Freshest: <span style={{ color: "var(--ink)", fontWeight: 500 }}>{freshest.title.length > 36 ? freshest.title.slice(0, 36) + "…" : freshest.title}</span>
          <span style={{ color: "var(--positive)", fontWeight: 600 }}>{freshest.days}d</span>
        </span>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "accent" | "positive" }) {
  const color = tone === "positive" ? "var(--positive)" : "var(--accent-2)";
  return (
    <span style={{ display: "inline-flex", alignItems: "baseline", gap: 4 }}>
      <span className="font-mono" style={{ fontSize: 13, fontWeight: 700, color, letterSpacing: "-0.01em" }}>
        {value}
      </span>
      <span style={{ fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
        {label}
      </span>
    </span>
  );
}

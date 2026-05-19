"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useAppStore } from "@/lib/store";

interface PaletteItem {
  id: string | number;
  label: string;
  sub?: string;
  icon: string;
  action: () => void;
}

export function CmdPalette() {
  const { cmdPaletteOpen, setCmdPaletteOpen, recommendations, selectJob, toggleFilter, setToast } =
    useAppStore();
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Open on Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdPaletteOpen(true);
      }
      if (e.key === "Escape") setCmdPaletteOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setCmdPaletteOpen]);

  useEffect(() => {
    if (cmdPaletteOpen) {
      setQuery("");
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [cmdPaletteOpen]);

  const close = useCallback(() => setCmdPaletteOpen(false), [setCmdPaletteOpen]);

  const jobItems: PaletteItem[] = recommendations
    .filter((r) => {
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        r.job.title.toLowerCase().includes(q) ||
        (r.job.company ?? "").toLowerCase().includes(q) ||
        (r.job.skillList ?? []).some((s) => s.toLowerCase().includes(q))
      );
    })
    .slice(0, 5)
    .map((r) => ({
      id: r.job.job_id,
      label: r.job.title,
      sub: `${r.job.company} · ${Math.round(r.score * 100)}% match`,
      icon: "💼",
      action: () => { selectJob(r.job.job_id); close(); },
    }));

  const actionItems: PaletteItem[] = [
    {
      id: "filter-remote",
      label: "Filter: Remote only",
      icon: "🌐",
      action: () => { toggleFilter("Remote"); close(); },
    },
    {
      id: "filter-salary",
      label: "Filter: $100k+",
      icon: "💰",
      action: () => { toggleFilter("$100k+"); close(); },
    },
    {
      id: "filter-new",
      label: "Show new today",
      icon: "✨",
      action: () => { toggleFilter("New today"); close(); },
    },
    {
      id: "top-match",
      label: "Jump to top match",
      sub: recommendations[0] ? `${recommendations[0].job.title} at ${recommendations[0].job.company}` : undefined,
      icon: "🎯",
      action: () => {
        if (recommendations[0]) { selectJob(recommendations[0].job.job_id); }
        close();
      },
    },
  ].filter((a) => !query || a.label.toLowerCase().includes(query.toLowerCase()));

  const allItems = [...jobItems, ...actionItems];

  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  if (!cmdPaletteOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, allItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      allItems[activeIdx]?.action();
    }
  };

  return (
    <div
      onClick={close}
      style={{
        position: "fixed", inset: 0, zIndex: 10000,
        background: "rgba(28,24,20,0.45)",
        backdropFilter: "blur(4px)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        paddingTop: "14vh",
        animation: "fade-in 0.15s ease-out",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 560, maxWidth: "90vw",
          background: "var(--cream)",
          borderRadius: 16,
          border: "1px solid var(--warm2)",
          boxShadow: "0 8px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.1)",
          overflow: "hidden",
          animation: "toast-in 0.18s ease-out",
        }}
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "14px 16px",
            borderBottom: "1px solid var(--warm2)",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: "var(--ink3)", flexShrink: 0 }}>
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search jobs, companies, skills…"
            style={{
              flex: 1, border: "none", outline: "none", background: "transparent",
              fontSize: 15, color: "var(--ink)", fontFamily: "'Geist', sans-serif",
            }}
          />
          <kbd
            style={{
              fontSize: 10, padding: "3px 7px", borderRadius: 5,
              background: "var(--warm1)", color: "var(--ink3)",
              border: "1px solid var(--warm2)", fontFamily: "'Geist Mono', monospace",
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 360, overflowY: "auto", padding: "6px 0" }}>
          {jobItems.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "var(--ink4)", padding: "6px 16px 4px", textTransform: "uppercase" }}>
                Jobs
              </div>
              {jobItems.map((item, idx) => (
                <PaletteRow key={item.id} item={item} active={idx === activeIdx} onClick={item.action} onHover={() => setActiveIdx(idx)} />
              ))}
            </div>
          )}
          {actionItems.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "var(--ink4)", padding: "10px 16px 4px", textTransform: "uppercase" }}>
                Actions
              </div>
              {actionItems.map((item, idx) => (
                <PaletteRow key={item.id} item={item} active={jobItems.length + idx === activeIdx} onClick={item.action} onHover={() => setActiveIdx(jobItems.length + idx)} />
              ))}
            </div>
          )}
          {allItems.length === 0 && (
            <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--ink3)", fontSize: 13 }}>
              No results for "{query}"
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div
          style={{
            padding: "8px 16px",
            borderTop: "1px solid var(--warm2)",
            display: "flex", gap: 16, alignItems: "center",
          }}
        >
          {[["↑↓", "navigate"], ["↵", "select"], ["esc", "close"]].map(([key, label]) => (
            <div key={key} style={{ display: "flex", gap: 5, alignItems: "center" }}>
              <kbd style={{ fontSize: 9.5, padding: "2px 6px", borderRadius: 4, background: "var(--warm1)", border: "1px solid var(--warm2)", color: "var(--ink3)", fontFamily: "'Geist Mono', monospace" }}>{key}</kbd>
              <span style={{ fontSize: 10, color: "var(--ink4)" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PaletteRow({
  item,
  active,
  onClick,
  onHover,
}: {
  item: { icon: string; label: string; sub?: string };
  active: boolean;
  onClick: () => void;
  onHover: () => void;
}) {
  return (
    <div
      onClick={onClick}
      onMouseEnter={onHover}
      style={{
        display: "flex", alignItems: "center", gap: 11,
        padding: "9px 16px", cursor: "pointer",
        background: active ? "var(--accent-bg)" : "transparent",
        transition: "background 0.08s",
      }}
    >
      <span style={{ fontSize: 15, width: 22, textAlign: "center", flexShrink: 0 }}>{item.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: "var(--ink)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</div>
        {item.sub && <div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 1 }}>{item.sub}</div>}
      </div>
      {active && (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ color: "var(--accent)", flexShrink: 0 }}>
          <path d="M2 6h8M6 2l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );
}

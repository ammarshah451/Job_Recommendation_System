"use client";
import { useAppStore } from "@/lib/store";

const FILTERS = ["All", "Remote", "Full-time", "$100k+", "New today"];

export function FilterChips() {
  const { activeFilters, toggleFilter } = useAppStore();
  return (
    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
      {FILTERS.map((f) => {
        const active = activeFilters.includes(f);
        return (
          <button
            key={f}
            onClick={() => toggleFilter(f)}
            style={{
              fontSize: 10.5, padding: "4px 11px", borderRadius: 20,
              fontWeight: 500, cursor: "pointer",
              border: `1px solid ${active ? "var(--ink)" : "var(--warm2)"}`,
              background: active ? "var(--ink)" : "transparent",
              color: active ? "var(--cream)" : "var(--ink3)",
              fontFamily: "'Geist', sans-serif",
              transition: "all 0.12s",
            }}
            onMouseOver={(e) => {
              if (!active) {
                e.currentTarget.style.borderColor = "var(--warm3)";
                e.currentTarget.style.color = "var(--ink)";
              }
            }}
            onMouseOut={(e) => {
              if (!active) {
                e.currentTarget.style.borderColor = "var(--warm2)";
                e.currentTarget.style.color = "var(--ink3)";
              }
            }}
          >
            {f}
          </button>
        );
      })}
    </div>
  );
}

"use client";
import { useState } from "react";
import { Search, Sparkles, X } from "lucide-react";
import { useAppStore } from "@/lib/store";

type Chip = { key: string; value: string };

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [chips, setChips] = useState<Chip[]>([]);
  const setCmdPaletteOpen = useAppStore((s) => s.setCmdPaletteOpen);

  function removeChip(idx: number) {
    setChips((prev) => prev.filter((_, i) => i !== idx));
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "6px 8px 6px 16px",
          boxShadow: "var(--shadow-1)",
        }}
      >
        <Search size={18} style={{ color: "var(--ink-3)", flexShrink: 0 }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Describe the role you want — e.g., senior ML, remote, no on-call, $150k+"
          style={{
            flex: 1,
            border: 0,
            outline: 0,
            background: "transparent",
            fontFamily: "inherit",
            fontSize: 14.5,
            color: "var(--ink)",
            padding: "10px 0",
          }}
          onKeyDown={(e) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              setCmdPaletteOpen(true);
            }
          }}
        />
        <kbd
          style={{
            fontFamily: "Geist Mono, monospace",
            fontSize: 11,
            color: "var(--ink-3)",
            border: "1px solid var(--border)",
            padding: "3px 7px",
            borderRadius: 6,
            background: "var(--surface-2)",
          }}
        >
          ⌘K
        </kbd>
        <button
          style={{
            background: "var(--secondary)",
            color: "var(--secondary-2)",
            border: "1px solid var(--secondary-bdr)",
            borderRadius: 8,
            padding: "8px 14px",
            fontFamily: "inherit",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Sparkles size={13} />
          Ask AI
        </button>
      </div>

      {chips.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
          {chips.map((chip, i) => (
            <span
              key={i}
              style={{
                fontSize: 12.5,
                padding: "6px 11px",
                borderRadius: 999,
                background: "var(--secondary-bg)",
                color: "var(--secondary-2)",
                border: "1px solid var(--secondary-bdr)",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontWeight: 500,
              }}
            >
              <span style={{ color: "var(--ink-3)", fontWeight: 400 }}>{chip.key}</span>
              {chip.value}
              <button
                onClick={() => removeChip(i)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--ink-3)",
                  padding: 0,
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

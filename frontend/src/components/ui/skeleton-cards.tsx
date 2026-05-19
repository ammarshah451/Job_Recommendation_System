"use client";

export function SkeletonCards({ count = 4 }: { count?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7, padding: "0 0 20px" }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            background: "#ffffff",
            border: "1.5px solid var(--warm2)",
            borderRadius: 11,
            padding: "11px 12px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            marginBottom: 6,
            opacity: 1 - i * 0.18,
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          }}
        >
          {/* Row 1: logo + title */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="skeleton" style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0 }} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
              <div className="skeleton" style={{ height: 13, width: "60%", borderRadius: 5 }} />
              <div className="skeleton" style={{ height: 10, width: "40%", borderRadius: 5 }} />
            </div>
            <div className="skeleton" style={{ width: 44, height: 44, borderRadius: "50%", flexShrink: 0 }} />
          </div>
          {/* Row 2: pills */}
          <div style={{ display: "flex", gap: 5 }}>
            {[52, 68, 46].map((w, j) => (
              <div key={j} className="skeleton" style={{ height: 20, width: w, borderRadius: 20 }} />
            ))}
          </div>
          {/* Row 3: skill tags */}
          <div style={{ display: "flex", gap: 4 }}>
            {[48, 60, 54, 42].map((w, j) => (
              <div key={j} className="skeleton" style={{ height: 18, width: w, borderRadius: 5 }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

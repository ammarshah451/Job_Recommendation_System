"use client";
import { useEffect } from "react";
import { useAppStore } from "@/lib/store";

export function Toast() {
  const { toastMessage, setToast } = useAppStore();

  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toastMessage, setToast]);

  if (!toastMessage) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 28,
        right: 28,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: "var(--ink)",
        color: "var(--cream)",
        padding: "12px 18px",
        borderRadius: 12,
        fontSize: 13,
        fontWeight: 500,
        boxShadow: "0 8px 32px rgba(0,0,0,0.22)",
        animation: "toast-in 0.22s ease-out",
        fontFamily: "'Geist', sans-serif",
      }}
    >
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: "var(--accent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
          <path d="M2 5.5l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {toastMessage}
    </div>
  );
}

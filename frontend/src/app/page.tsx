"use client";
import { useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api";
import { TopNav } from "@/components/ui/top-nav";
import { SearchBar } from "@/components/ui/search-bar";
import { JobCardV2 } from "@/components/ui/job-card-v2";
import { FeaturedJob } from "@/components/ui/featured-job";
import { SkeletonCards } from "@/components/ui/skeleton-cards";
import { CmdPalette } from "@/components/ui/cmd-palette";
import { Toast } from "@/components/ui/toast";

export default function DiscoverPage() {
  const { userId, recommendations, setRecommendations, setLoading, isLoading } = useAppStore();

  useEffect(() => {
    setLoading(true);
    api
      .recommend(userId)
      .then((res) => setRecommendations(res.recommendations))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId, setRecommendations, setLoading]);

  const matchCount = recommendations.length;
  const [featured, ...rest] = recommendations;

  return (
    <>
      <TopNav active="/" />

      <main
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "32px 40px 80px",
        }}
      >
        <section style={{ padding: "20px 0 18px" }}>
          <h1
            style={{
              fontSize: 36,
              fontWeight: 600,
              letterSpacing: "-0.025em",
              margin: "0 0 10px",
              color: "var(--ink)",
              lineHeight: 1.1,
            }}
          >
            Good morning, Ammar. <br />
            <span style={{ color: "var(--accent)" }}>
              {isLoading ? "Finding roles" : `${matchCount} ${matchCount === 1 ? "role" : "roles"}`}
            </span>{" "}
            worth your attention today.
          </h1>
          <p
            style={{
              margin: 0,
              color: "var(--ink-2)",
              fontSize: 15,
              maxWidth: 640,
              lineHeight: 1.55,
            }}
          >
            Each match comes with the model&apos;s reasoning, an independent salary estimate, and the
            skills bridging you to the role. No employer pays for placement.
          </p>

          <div style={{ marginTop: 24 }}>
            <SearchBar />
          </div>
        </section>

        {isLoading ? (
          <div style={{ marginTop: 24 }}>
            <SkeletonCards count={6} />
          </div>
        ) : (
          <>
            {featured && (
              <>
                <SectionHead
                  title="Your best job match today"
                  count={`${Math.round(featured.score * 100)}% match`}
                  right="Highest score across your matches"
                />
                <FeaturedJob rec={featured} />
              </>
            )}

            {rest.length > 0 && (
              <>
                <SectionHead
                  title="More jobs ranked for you"
                  count={`${rest.length} jobs`}
                  right="Sorted by match score · highest first"
                />
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {rest.map((rec) => (
                    <JobCardV2 key={rec.job.job_id} rec={rec} />
                  ))}
                </div>
              </>
            )}

            {matchCount === 0 && (
              <div
                style={{
                  padding: "48px 24px",
                  textAlign: "center",
                  color: "var(--ink-3)",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-2)", marginBottom: 6 }}>
                  No matches loaded
                </div>
                <div style={{ fontSize: 13 }}>Start the backend at localhost:8000 and refresh.</div>
              </div>
            )}
          </>
        )}
      </main>

      <CmdPalette />
      <Toast />
    </>
  );
}

function SectionHead({ title, count, right }: { title: string; count?: string; right?: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        margin: "26px 0 14px",
      }}
    >
      <h2
        style={{
          margin: 0,
          fontSize: 15,
          fontWeight: 600,
          color: "var(--ink)",
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        {title}
        {count && (
          <span
            style={{
              fontFamily: "Geist Mono, monospace",
              fontSize: 11,
              color: "var(--accent-2)",
              background: "var(--accent-bg)",
              padding: "2px 8px",
              borderRadius: 5,
              fontWeight: 500,
              border: "1px solid var(--accent-bdr)",
            }}
          >
            {count}
          </span>
        )}
      </h2>
      {right && <div style={{ fontSize: 12.5, color: "var(--ink-3)" }}>{right}</div>}
    </div>
  );
}

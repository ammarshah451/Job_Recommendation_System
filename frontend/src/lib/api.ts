import type {
  RecommendationResponse,
  RawRecommendation,
  Recommendation,
  Job,
  ExplainResponse,
  SkillGapResponse,
  SalaryResponse,
} from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

/** Parse the skills string from backend (comma-separated) into an array */
function parseSkills(raw: string | null): string[] {
  if (!raw || raw.trim().toLowerCase() === "nan") return [];
  return raw.split(",").map((s) => s.trim()).filter((s) => s && s.toLowerCase() !== "nan");
}

/**
 * Map backend seniority levels to readable employment type labels.
 * The dataset uses category for job domain, seniority for experience level.
 * We display seniority as-is since it's the most meaningful available field.
 */
function deriveEmploymentType(job: Job): string {
  if (!job.seniority) return "Full-time";
  const s = job.seniority.toLowerCase();
  if (s === "senior" || s === "sr") return "Senior";
  if (s === "junior" || s === "jr") return "Junior";
  if (s === "mid" || s === "mid-level") return "Mid-level";
  if (s === "lead" || s === "staff") return "Lead";
  if (s === "director" || s === "vp" || s === "principal") return "Director+";
  if (s === "intern") return "Intern";
  // Title-case and return as-is for any other value
  return job.seniority.charAt(0).toUpperCase() + job.seniority.slice(1);
}

/**
 * Normalize raw scores into a display-friendly 0–1 range.
 * The LLM reranker assigns discrete scores like 0.1, 0.15, 0.2 — all very small.
 * We scale so the top job always shows near 90–95% and others scale proportionally,
 * while preserving the relative ranking order exactly.
 */
/**
 * Normalize raw scores for display. LLM reranker emits discrete values (0.1, 0.15, 0.2)
 * that are meaningless as raw percentages. Strategy:
 * 1. Score-based scaling first (preserves score differences)
 * 2. Rank-based tie-breaking (spreads jobs with identical scores)
 * Result: top job ~90-93%, natural decay down the list.
 */
function normalizeScores(raws: RawRecommendation[]): number[] {
  if (raws.length === 0) return [];
  const rawScores = raws.map((r) => r.score);
  const maxScore = Math.max(...rawScores);
  const minScore = Math.min(...rawScores);

  return rawScores.map((s, i) => {
    // Base: score-proportional component (0.55–0.93)
    const scoreComponent = maxScore === minScore
      ? 0.93
      : 0.55 + ((s - minScore) / (maxScore - minScore)) * 0.38;
    // Rank decay: each position adds a small penalty so ties spread out
    const rankPenalty = i * 0.025;
    return Math.max(0.40, scoreComponent - rankPenalty);
  });
}

/** Enrich raw recommendations with full job data from /jobs/batch */
async function enrichRecommendations(raws: RawRecommendation[]): Promise<Recommendation[]> {
  if (raws.length === 0) return [];
  // Dedupe defensively. The pipeline returns unique ids today, but if upstream changes
  // ever produce a dup it would surface as a React duplicate-key warning.
  const seen = new Set<number>();
  raws = raws.filter((r) => (seen.has(r.job_id) ? false : (seen.add(r.job_id), true)));
  const ids = raws.map((r) => r.job_id).join(",");
  let jobs: Job[] = [];
  try {
    jobs = await get<Job[]>(`/jobs/batch?ids=${ids}`);
  } catch {
    jobs = raws.map((r) => ({
      job_id: r.job_id, title: `Job #${r.job_id}`,
      category: null, seniority: null, location: null,
      skills: null, salary_min: null, salary_max: null,
      description: null, posted_days_ago: null,
    }));
  }
  const normalizedScores = normalizeScores(raws);
  const jobMap = new Map(jobs.map((j) => [j.job_id, j]));
  return raws.map((r, i) => {
    const job = jobMap.get(r.job_id) ?? {
      job_id: r.job_id, title: `Job #${r.job_id}`,
      category: null, seniority: null, location: null,
      skills: null, salary_min: null, salary_max: null,
      description: null, posted_days_ago: null,
    };
    return {
      job: {
        ...job,
        employment_type: deriveEmploymentType(job),
        skillList: parseSkills(job.skills),
      },
      score: normalizedScores[i],
      rank: i,
      explanation: r.explanation,
    };
  });
}

function enrichJob(job: Job): Job {
  return {
    ...job,
    employment_type: deriveEmploymentType(job),
    skillList: parseSkills(job.skills),
  };
}

export const api = {
  recommend: async (userId: string): Promise<{ recommendations: Recommendation[] }> => {
    const raw = await get<RecommendationResponse>(`/recommend/multi-stage/${userId}`);
    const enriched = await enrichRecommendations(raw.recommendations);
    return { recommendations: enriched };
  },

  explain: (userId: string, jobId: string | number) =>
    get<ExplainResponse>(`/explain/${userId}/${jobId}`),

  /** Skill-gap: backend takes comma-separated user_skills and target_skills strings. */
  skillGap: (userSkills: string[], targetSkills: string[]) =>
    post<SkillGapResponse>("/skill-gap", {
      user_skills: userSkills.join(","),
      target_skills: targetSkills.join(","),
    }),

  /** Salary prediction: predict market range for {category, seniority, location, skills}. */
  salary: (input: { category?: string; seniority?: string; location?: string; skills: string[] }) =>
    post<SalaryResponse>("/salary/predict", {
      category: input.category ?? "",
      seniority: input.seniority ?? "",
      location: input.location ?? "",
      skills: input.skills.join(","),
    }),

  /** Skills inferred from a user's training-history jobs. Needs backend endpoint. */
  userSkills: (userId: string) =>
    get<{ skills: string[] }>(`/users/${userId}/skills`),

  similar: async (jobId: string | number): Promise<{ recommendations: Recommendation[] }> => {
    const jobs = await get<Job[]>(`/similar-jobs/${jobId}`);
    const seen = new Set<number>();
    const deduped = jobs.filter((j) => (seen.has(j.job_id) ? false : (seen.add(j.job_id), true)));
    const recs: Recommendation[] = deduped.map((job, i) => ({
      job: enrichJob(job),
      score: 1 - i * 0.05,
      rank: i,
    }));
    return { recommendations: recs };
  },
};

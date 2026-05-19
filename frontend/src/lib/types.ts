/** Matches api/schemas.py JobSummary */
export interface Job {
  job_id: number;
  title: string;
  category: string | null;
  seniority: string | null;
  location: string | null;
  /** Raw comma-separated skills string from backend */
  skills: string | null;
  salary_min: number | null;
  salary_max: number | null;
  description: string | null;
  posted_days_ago: number | null;
  // Derived client-side
  company?: string;
  employment_type?: string;
  skillList?: string[];
}

/** A recommendation enriched with full job data */
export interface Recommendation {
  job: Job;
  score: number;
  rank: number;
  explanation?: string | null;
}

export interface RawRecommendation {
  job_id: number;
  score: number;
  explanation?: string | null;
  stage_scores?: Record<string, number>;
}

export interface RecommendationResponse {
  user_id: number | null;
  model: string;
  recommendations: RawRecommendation[];
}

export interface ExplainResponse {
  tier: string;
  weights: Record<string, number>;
  scores: Record<string, number>;
  matched_skills: string[];
  job_title: string;
}

export interface SkillGapResponse {
  matched: string[];
  missing: string[];
  adjacent: string[];
  match_rate: number;
  adjacent_rate: number;
  // aliases used by components
  matched_skills?: string[];
  missing_skills?: string[];
}

export interface SalaryResponse {
  salary_min: number;
  salary_max: number;
  midpoint: number;
}

export interface AiInsight {
  message: string;
  matched_count: number;
}

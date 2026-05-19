"use client";
import { useEffect, useState } from "react";
import { api } from "./api";
import { useAppStore } from "./store";
import type { Job, SkillGapResponse, SalaryResponse } from "./types";

/** Cache user-skills per session so we don't refetch on every card. */
let _userSkillsCache: { userId: string; skills: string[] } | null = null;
let _userSkillsInflight: Promise<string[]> | null = null;

export function getUserSkills(userId: string): Promise<string[]> {
  if (_userSkillsCache?.userId === userId) {
    return Promise.resolve(_userSkillsCache.skills);
  }
  if (_userSkillsInflight) return _userSkillsInflight;
  _userSkillsInflight = api
    .userSkills(userId)
    .then((r) => {
      const skills = r.skills ?? [];
      _userSkillsCache = { userId, skills };
      _userSkillsInflight = null;
      return skills;
    })
    .catch(() => {
      _userSkillsInflight = null;
      return [];
    });
  return _userSkillsInflight;
}

/** Fetch skill-fit + predicted salary for a single job. */
export function useSkillFitAndSalary(job: Job | null | undefined) {
  const userId = useAppStore((s) => s.userId);
  const [gap, setGap] = useState<SkillGapResponse | null>(null);
  const [salary, setSalary] = useState<SalaryResponse | null>(null);

  useEffect(() => {
    if (!job) return;
    let cancelled = false;

    const targetSkills = job.skillList ?? [];

    (async () => {
      const userSkills = await getUserSkills(userId);
      if (cancelled) return;

      // Skill-gap: only meaningful when the role lists required skills
      if (targetSkills.length > 0) {
        api
          .skillGap(userSkills, targetSkills)
          .then((res) => !cancelled && setGap(res))
          .catch(() => {});
      }

      // Salary always runs — uses category/seniority/location + best-available skills
      const skillsForSalary =
        userSkills.length > 0 ? userSkills : targetSkills;
      api
        .salary({
          category: job.category ?? "",
          seniority: job.seniority ?? "",
          location: job.location ?? "",
          skills: skillsForSalary,
        })
        .then((res) => !cancelled && setSalary(res))
        .catch(() => {});
    })();

    return () => {
      cancelled = true;
    };
  }, [job, userId]);

  return { gap, salary };
}

/** Compute "above market / at market / below market" verdict comparing
 * posted vs predicted midpoints. Returns null if either side is missing. */
export function marketVerdict(
  postedMin: number | null | undefined,
  postedMax: number | null | undefined,
  predictedMidpoint: number | null | undefined
): { tone: "pos" | "neg" | "neutral"; label: string } | null {
  if (postedMin == null || postedMax == null || predictedMidpoint == null) return null;
  const postedMid = (postedMin + postedMax) / 2;
  const pctDiff = ((postedMid - predictedMidpoint) / predictedMidpoint) * 100;
  if (pctDiff > 5) return { tone: "pos", label: `+${Math.round(pctDiff)}% above market for you` };
  if (pctDiff < -5) return { tone: "neg", label: `${Math.round(pctDiff)}% below market for you` };
  return { tone: "neutral", label: "At market for your stack" };
}

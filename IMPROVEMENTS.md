# NexusHire — Deferred Improvements

Items intentionally postponed during the v3 build. Each entry includes context and a recommended approach so the next iteration can pick them up cleanly.

---

## 1. Live job-listing data ingestion

**Status:** deferred — currently using synthetic CSV.

**Why this matters:** A job recsys is only as useful as its corpus. Real listings would make NexusHire usable end-to-end and demoable to non-technical viewers.

**Recommended path (in priority order):**

| Source | Type | Cost | Notes |
|---|---|---|---|
| **Adzuna API** | Aggregator REST API | Free tier (~1M postings) | `https://api.adzuna.com/v1/api/jobs/{country}/search`. Two env vars: `ADZUNA_APP_ID`, `ADZUNA_KEY`. Best single source. |
| **Greenhouse boards** | Per-company ATS feed | Free, public | `https://boards-api.greenhouse.io/v1/boards/{company}/jobs`. Curate ~50 named companies (Anthropic, Stripe, Notion, Figma, …). High-prestige listings, no scraping. |
| **Lever boards** | Per-company ATS feed | Free, public | `https://api.lever.co/v0/postings/{company}`. Same pattern as Greenhouse. |
| **Ashby boards** | Per-company ATS feed | Free, public | Same pattern. Many YC companies use this. |
| **The Muse API** | Aggregator REST API | Free | Smaller corpus, curated, has company profiles. |
| **USAJobs API** | Aggregator REST API | Free, official | US government roles only. |
| **LinkUp / JobsPikr / Lightcast** | Commercial feed | $1k–$50k/mo | Cleaned, deduped, geocoded. What VC-funded job-tech companies use. |

**Do NOT scrape LinkedIn / Indeed / Glassdoor.** Anti-bot measures + ToS issues + active litigation (*hiQ Labs v. LinkedIn*). Not worth the legal risk for a portfolio project.

**Implementation sketch:**
1. `src/ingest/adzuna.py` — daily script: hit Adzuna, dedupe by external_id, upsert into the jobs table/CSV.
2. `src/ingest/greenhouse.py` — read a `data/companies.yaml` curated list, fan-out to `boards-api.greenhouse.io/v1/boards/{slug}/jobs`, normalize.
3. Cron via GitHub Actions or a simple `apscheduler` thread in the FastAPI app.
4. After each ingest: rebuild content embeddings + FAISS index incrementally (FAISS supports adding vectors without full rebuild).

---

## 2. Backend `/explain` returns 404 without CORS headers

When `/explain/{user_id}/{job_id}` raises an `HTTPException(404)` (e.g., a user has no train-history with the job), FastAPI's default error handler returns the response *without* running the CORS middleware, so the browser sees the failure as a CORS error rather than a 404. This blocks downstream calls (e.g., `/skill-gap`) that were chained in `useEffect`.

**Fix:** add a custom exception handler that re-attaches CORS headers, or switch error responses to 200 with an error body. Reference: <https://github.com/fastapi/fastapi/issues/775>.

---

## 3. Stage-score breakdown not surfaced per-recommendation

The pipeline computes per-stage scores (two-tower retrieval / LambdaMART / LLM rerank) but `/recommend/multi-stage/{user_id}` only returns the final blended score. The data exists in `PipelineStages` but isn't included in the response.

**Fix:** include `stage_scores: dict` in each `Recommendation` returned by the endpoint. Frontend already has the field on the type — just unused.

User explicitly didn't want this surfaced in the UI ("don't add how we ranked it"), so this is purely for API completeness / debugging, not a UX feature.

---

## 4. Old components still in `src/components/ui/`

The following legacy components are no longer imported anywhere after the v3 rewrite but remain in the repo:

- `aurora-background.tsx`, `aurora-hero.tsx`, `ai-strip.tsx`, `bento-stats.tsx`
- `career-sidebar.tsx`, `culture-strip.tsx`, `detail-panel.tsx`, `filter-chips.tsx`
- `floating-dock.tsx`, `glare-card.tsx`, `magic-card.tsx`, `match-ring.tsx`
- `salary-heatmap.tsx`, `score-ring.tsx`, `job-card.tsx` (old version — `job-card-v2.tsx` is the new one)

**Action:** verify nothing references them with `grep -r "from \"@/components/ui/<name>\"" src/`, then delete.

---

## 5. Dev-mode floating "N" portal

Bottom-left circle visible during `npm run dev` is `<nextjs-portal>`, Next 16's dev overlay (error toast / build status). Not a real UI element. Production builds don't render it. Nothing to do.

---

## 6. Resume parser — improvements beyond v1

The current resume parser (planned for v3) will extract skills via the existing `SkillOntology` from PDF/DOCX text. Future improvements:

- **Section parsing**: separate experience / education / projects so the recsys can weight recent roles higher.
- **Embedding-based matching**: embed the resume and use it directly as a query vector against the two-tower index, in addition to skill extraction.
- **Cover-letter / portfolio-link extraction** for richer profiles.
- Use **LLM extraction** (e.g., Claude Haiku) for sections the ontology can't recognize.

---

## 7. Mobile responsiveness

The current v3 layouts use fixed 3-column grids and 1280px max-widths. No mobile breakpoints yet. Before any public launch, add:

- Single-column stack on `< 768px`.
- Featured card right-rail moves below main content on `< 1024px`.
- TopNav collapses to hamburger + sheet on mobile.

---

## 8. Saved/Applied/Trajectory pages

Routes exist in TopNav but only `/` and `/jobs/[id]` are implemented. Stubs needed:

- `/saved` — grid of jobs from `savedJobIds`, fetch their summaries via `/jobs/batch`.
- `/applied` — needs an `applications` table on the backend + corresponding UI.
- `/trajectory` — career path visualization driven by collab + content embeddings (the original concept from the v1 right-rail).

---

## 9. Auth via Supabase (planned integration)

User decision: defer auth until Supabase integration. **No hand-rolled auth in the codebase.**

**Why Supabase Auth:** email verification, password reset, OAuth (Google/GitHub/Apple/…), magic links, MFA, rotating refresh tokens, rate limiting, and an admin UI — all free up to 50k monthly active users. Otherwise we'd have to build each manually.

**Cookie compatibility:** Supabase Auth stores the JWT in an HttpOnly cookie via the official `@supabase/ssr` Next.js helper, so the same security model the frontend already assumes (cookies, `credentials: "include"`) carries over without rework.

**Setup plan (when we're ready):**

1. **Create Supabase project** at supabase.com (free tier). Note the project URL and `anon` key for the frontend, plus the `service_role` key for the backend (server-side only).
2. **Database schema** — Supabase manages `auth.users` itself. Add a public `profiles` table 1:1 with `auth.users.id`:
   ```sql
   create table public.profiles (
     id            uuid references auth.users(id) on delete cascade primary key,
     name          text,
     resume_text   text,
     skills        text[],            -- normalized skill list
     motivation    text,
     interests     text[],
     career_goals  text,
     onboarded     boolean default false,
     created_at    timestamptz default now()
   );
   alter table public.profiles enable row level security;
   create policy "users read their own profile"
     on profiles for select using (auth.uid() = id);
   create policy "users update their own profile"
     on profiles for update using (auth.uid() = id);
   ```
3. **Frontend** — install `@supabase/supabase-js` + `@supabase/ssr`. Replace the `userId` field in Zustand with the logged-in user's `id` from `supabase.auth.getUser()`. Add `/login`, `/signup`, `/onboard` routes; use `signInWithOAuth({ provider: 'google' })` for the OAuth path.
4. **Backend** — install `pyjwt` + `httpx`. Add a `current_user` FastAPI dependency that:
   - Reads the cookie named `sb-<project-ref>-auth-token`,
   - Verifies the JWT against Supabase's JWKS (`{SUPABASE_URL}/auth/v1/jwks`),
   - Returns the `sub` claim (which is the user UUID).
   Use it as `Annotated[str, Depends(current_user)]` on every endpoint that needs auth.
5. **Resume upload** — store the binary file in **Supabase Storage** (bucket `resumes`, RLS so users only see their own). Persist the file path + parsed skill list in `profiles`. The parsing pipeline (`src/nlp/resume_ner.py`) stays unchanged.
6. **Recommendation wiring** — when the user is logged in:
   - If they have history rows in `data.train` (synthetic mapping for now): use `/recommend/multi-stage/{user_id}`.
   - If they're brand new (only the profile, no history): use `/recommend/new-user` with `resume=<text>` and `skills=<csv>` from the `profiles` row.

**What the deletion looks like in the codebase later:** the `userId` constant in `src/lib/store.ts` becomes derived from the Supabase session; the `GET /users/{id}/skills` endpoint either points at `profiles.skills` or stays as a history-derived fallback for demo users.


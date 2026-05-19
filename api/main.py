"""FastAPI app exposing the full recommendation system.

Artifacts are loaded lazily on the first request via the AppState singleton. This
keeps uvicorn startup fast and test code can inject its own state."""
from __future__ import annotations
from dotenv import load_dotenv
load_dotenv()
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any
import pandas as pd
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from api.schemas import (
    JobSummary, Recommendation, RecommendationResponse, NewUserRequest,
    ExplainResponse, PipelineInspectResponse, QueryRequest, ParsedQueryResponse,
    SalaryRequest, SalaryResponse, SkillGapRequest, SkillGapResponse,
)
from config.settings import load_settings, Settings
from src.data.preprocessing import DataPreprocessor
from src.models.content_based import ContentBasedRecommender
from src.models.collaborative import CollaborativeRecommender
from src.models.popularity import PopularityRecommender
from src.models.hybrid import HybridRecommender, hybrid_config_from_settings
from src.models.two_tower import TwoTowerTrainer
from src.retrieval.faiss_index import FaissJobIndex
from src.models.ltr_ranker import LTRRanker, LTRConfig, SignalProvider
from src.models.llm_reranker import LLMReranker, LLMConfig
from src.models.salary_predictor import SalaryPredictor
from src.models.skill_gap import SkillGapAnalyzer
from src.ontology.skill_ontology import SkillOntology
from src.nlp.query_understanding import QueryUnderstanding
from src.pipeline.multi_stage import MultiStagePipeline, PipelineStages


class AppState:
    def __init__(self, cfg: Settings):
        self.cfg = cfg
        self.data = None
        self.content: ContentBasedRecommender | None = None
        self.collab: CollaborativeRecommender | None = None
        self.popularity: PopularityRecommender | None = None
        self.hybrid: HybridRecommender | None = None
        self.two_tower: TwoTowerTrainer | None = None
        self.faiss: FaissJobIndex | None = None
        self.ltr: LTRRanker | None = None
        self.llm: LLMReranker | None = None
        self.salary: SalaryPredictor | None = None
        self.ontology: SkillOntology | None = None
        self.query_parser: QueryUnderstanding | None = None
        self.gap: SkillGapAnalyzer | None = None
        self.pipeline: MultiStagePipeline | None = None

    def ensure_loaded(self) -> None:
        if self.data is not None:
            return
        self.data = DataPreprocessor(self.cfg).load()
        root = self.cfg.path("artifacts")
        self.content = ContentBasedRecommender().load(root / "content_based")
        self.collab = CollaborativeRecommender().load(root / "collaborative")
        self.popularity = PopularityRecommender().load(root / "popularity")
        self.hybrid = HybridRecommender(
            self.content, self.collab, self.popularity,
            hybrid_config_from_settings(self.cfg.models),
        ).fit(self.data.jobs, self.data.users, self.data.train)
        self.two_tower = TwoTowerTrainer(self.cfg.models["two_tower"]).load(root / "two_tower")
        self.faiss = FaissJobIndex(
            embedding_dim=self.cfg.models["two_tower"]["embedding_dim"],
            index_type=self.cfg.faiss["index_type"],
            nlist=self.cfg.faiss["nlist"], nprobe=self.cfg.faiss["nprobe"],
        ).load(root / "faiss")
        sp = SignalProvider(self.two_tower, self.content, self.collab, self.popularity)
        self.ltr = LTRRanker(LTRConfig(**{k: self.cfg.models["ltr"][k] for k in
                                          ("objective", "n_estimators", "learning_rate", "max_depth")}), sp) \
            .load(root / "ltr", self.data.users, self.data.jobs)
        self.llm = LLMReranker(LLMConfig(
            model=self.cfg.models["llm"]["model"],
            rerank_top_k=self.cfg.models["llm"]["rerank_top_k"],
            output_top_n=self.cfg.models["llm"]["output_top_n"],
            max_tokens=self.cfg.models["llm"]["max_tokens"],
        ))
        self.ontology = SkillOntology.load(root / "ontology") if (root / "ontology" / "ontology.json").exists() \
            else SkillOntology()
        try:
            self.salary = SalaryPredictor().load(root / "salary")
        except FileNotFoundError:
            self.salary = None
        self.query_parser = QueryUnderstanding(ontology=self.ontology)
        self.gap = SkillGapAnalyzer(self.ontology)
        history = self.data.train.groupby("user_id")["job_id"].apply(lambda s: {int(x) for x in s}).to_dict()
        self.pipeline = MultiStagePipeline(
            PipelineStages(two_tower=self.two_tower, faiss=self.faiss, content=self.content,
                           collab=self.collab, popularity=self.popularity, ltr=self.ltr, llm=self.llm),
            self.data.users, self.data.jobs, user_history=history,
            n_retrieve=self.cfg.models["llm"]["rerank_top_k"] * 5,
            n_rank=self.cfg.models["llm"]["rerank_top_k"],
            n_final=self.cfg.models["llm"]["output_top_n"],
        )


_STATE: AppState | None = None
import threading
_STATE_LOCK = threading.Lock()


def get_state() -> AppState:
    global _STATE
    with _STATE_LOCK:
        if _STATE is None:
            _STATE = AppState(load_settings())
        _STATE.ensure_loaded()
    return _STATE


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Warm-load on startup. Pays the ~15s cost once during boot instead of on
    # the first request — also eliminates the race where a concurrent first
    # request hit a half-initialized AppState and 500'd.
    import logging
    log = logging.getLogger("uvicorn.error")
    log.info("Warming up recommendation pipeline...")
    try:
        get_state()
        log.info("Pipeline warm — ready to serve requests")
    except Exception as e:
        log.error(f"Pipeline warm-up failed: {e}")
    yield


app = FastAPI(title="Hybrid Job Recommender", version="1.0", lifespan=lifespan)

_ALLOWED_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_exception_with_cors(request: Request, exc: HTTPException):
    """FastAPI's default exception handler skips CORSMiddleware, so a 4xx from any
    endpoint surfaces in the browser as a CORS error rather than the actual status.
    Re-attach the CORS headers manually so the frontend can read the real error."""
    origin = request.headers.get("origin")
    headers = {}
    if origin in _ALLOWED_ORIGINS:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
        headers["Vary"] = "Origin"
    return JSONResponse(
        {"detail": exc.detail}, status_code=exc.status_code, headers=headers
    )


def _str(val) -> str | None:
    """Convert a value to string, returning None for NaN/empty/null."""
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return None
    s = str(val).strip()
    return s if s and s.lower() != "nan" else None

def _job_summary(row: pd.Series) -> JobSummary:
    return JobSummary(
        job_id=int(row["job_id"]),
        title=_str(row.get("title")) or "",
        category=_str(row.get("category")),
        seniority=_str(row.get("seniority")),
        location=_str(row.get("location")),
        skills=_str(row.get("skills")),
        salary_min=float(row["salary_min"]) if pd.notna(row.get("salary_min")) else None,
        salary_max=float(row["salary_max"]) if pd.notna(row.get("salary_max")) else None,
        description=_str(row.get("description")),
        posted_days_ago=int(row["posted_days_ago"]) if pd.notna(row.get("posted_days_ago")) else None,
    )


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/recommend/{user_id}", response_model=RecommendationResponse)
def recommend(user_id: int, k: int = 10, model: str = "hybrid"):
    s = get_state()
    if model == "hybrid":
        recs = s.hybrid.recommend(user_id, k=k)
    elif model == "content":
        if user_id not in s.content._user_index:
            raise HTTPException(404, "user not found in content model")
        recs = s.content.recommend(user_id, k=k)
    elif model == "collab":
        recs = s.collab.recommend(user_id, k=k)
    elif model == "popularity":
        recs = s.popularity.recommend(k=k)
    else:
        raise HTTPException(400, f"unknown model: {model}")
    return RecommendationResponse(
        user_id=user_id, model=model,
        recommendations=[Recommendation(job_id=j, score=sc) for j, sc in recs],
    )


@app.post("/recommend/new-user", response_model=RecommendationResponse)
def recommend_new_user(req: NewUserRequest):
    s = get_state()
    recs = s.hybrid.recommend_for_new_user(resume=req.resume, skills=req.skills, k=req.k)
    return RecommendationResponse(
        recommendations=[Recommendation(job_id=j, score=sc) for j, sc in recs],
        model="hybrid_cold_start",
    )


@app.get("/jobs/batch", response_model=list[JobSummary])
def jobs_batch(ids: str):
    """Return job summaries for a comma-separated list of job_ids."""
    s = get_state()
    id_list = [int(x) for x in ids.split(",") if x.strip()]
    existing = [i for i in id_list if i in s.data.jobs["job_id"].values]
    if not existing:
        return []
    rows = s.data.jobs.set_index("job_id").loc[existing].reset_index()
    return [_job_summary(r) for _, r in rows.iterrows()]


@app.get("/users/{user_id}/skills", response_model=dict)
def user_skills(user_id: int):
    """Return the union of skills attributed to a user.

    Source order: (1) the user's row in the canonical users table, if present;
    (2) skills aggregated from the jobs they interacted with in train history.
    Used by the frontend skill-fit feature before Supabase Auth + uploaded resumes
    are in place."""
    s = get_state()

    # 1. Direct skills column
    row = s.data.users.loc[s.data.users["user_id"] == user_id]
    if not row.empty:
        raw = _str(row.iloc[0].get("skills"))
        if raw:
            skills = sorted({k.strip().lower() for k in raw.split(",") if k.strip()})
            if skills:
                return {"skills": skills, "source": "profile"}

    # 2. Fall back to history-union
    seen_jobs = s.data.train.loc[s.data.train["user_id"] == user_id, "job_id"].unique()
    if len(seen_jobs) == 0:
        return {"skills": [], "source": "empty"}
    rows = s.data.jobs.loc[s.data.jobs["job_id"].isin(seen_jobs), "skills"]
    bag: set[str] = set()
    for raw in rows:
        clean = _str(raw)
        if clean:
            bag.update(k.strip().lower() for k in clean.split(",") if k.strip())
    return {"skills": sorted(bag), "source": "history"}


@app.get("/similar-jobs/{job_id}", response_model=list[JobSummary])
def similar_jobs(job_id: int, k: int = 10):
    s = get_state()
    ids = [j for j, _ in s.content.similar_jobs(job_id, k=k)]
    rows = s.data.jobs.set_index("job_id").loc[ids].reset_index()
    return [_job_summary(r) for _, r in rows.iterrows()]


@app.get("/explain/{user_id}/{job_id}", response_model=ExplainResponse)
def explain(user_id: int, job_id: int):
    s = get_state()
    out = s.hybrid.explain(user_id, job_id)
    return ExplainResponse(**out)


@app.get("/recommend/multi-stage/{user_id}", response_model=RecommendationResponse)
def multi_stage(user_id: int, exclude_seen: bool = True):
    s = get_state()
    recs = s.pipeline.recommend(user_id, exclude_seen=exclude_seen)
    return RecommendationResponse(
        user_id=user_id, model="multi_stage",
        recommendations=[Recommendation(job_id=r.job_id, score=r.score,
                                        explanation=r.explanation, stage_scores=r.stage_scores)
                         for r in recs],
    )


@app.get("/pipeline/inspect/{user_id}", response_model=PipelineInspectResponse)
def inspect(user_id: int):
    s = get_state()
    return PipelineInspectResponse(**s.pipeline.inspect(user_id))


@app.post("/query/parse", response_model=ParsedQueryResponse)
def parse_query(req: QueryRequest):
    s = get_state()
    p = s.query_parser.parse(req.query)
    return ParsedQueryResponse(skills=p.skills, seniority=p.seniority, category=p.category,
                               location=p.location, min_salary=p.min_salary, remote=p.remote)


@app.post("/salary/predict", response_model=SalaryResponse)
def predict_salary(req: SalaryRequest):
    s = get_state()
    if s.salary is None:
        raise HTTPException(503, "salary model not available")
    out = s.salary.predict(category=req.category, seniority=req.seniority,
                           location=req.location, skills=req.skills)
    return SalaryResponse(salary_min=out.salary_min, salary_max=out.salary_max, midpoint=out.midpoint)


@app.post("/skill-gap", response_model=SkillGapResponse)
def skill_gap(req: SkillGapRequest):
    s = get_state()
    from src.features.structured_features import parse_skills
    r = s.gap.analyze(parse_skills(req.user_skills), parse_skills(req.target_skills))
    return SkillGapResponse(matched=r.matched, missing=r.missing, adjacent=r.adjacent,
                            match_rate=r.match_rate, adjacent_rate=r.adjacent_rate)

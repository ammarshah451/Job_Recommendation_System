# Job Recommendation System

Production-grade hybrid job recommender covering the full **retrieval → ranking → re-ranking** stack. Built as a portfolio project demonstrating state-of-the-art techniques across classical, neural, and LLM-powered recommendation.

## Architecture

```
User request
    │
    ▼
Stage 1 — RETRIEVAL
    Two-Tower neural network → FAISS IVFFlat ANN        ~500 candidates
    (+ content-based / iALS / popularity fallback)
    │
    ▼
Stage 2 — RANKING
    LambdaMART (XGBoost rank:pairwise)                  top-50 ranked
    16 engineered cross-features including:
      · Two-Tower score · iALS CF score
      · Content-based similarity (long-term + short-term user profile)
      · BERT4Rec sequential score · Bilateral (reciprocal) fit
      · Hybrid combiner score · Salary alignment
      · Category/seniority/location match · Apply-rate signal
    │
    ▼
Stage 3 — DIVERSITY
    MMR rerank (λ=0.7) over two-tower job embeddings    top-20 diverse
    │
    ▼
Stage 4 — RE-RANKING  (optional, eval-sampled)
    Groq LLM (llama-3.1-8b-instant) with 3-key rotation → top-10 + explanations
    Bilateral fit surfaced in prompt · Graceful fallback to LTR scores
    │
    ▼
    Top-K recommendations with per-stage scores + natural-language explanations
```

## Model Stack

### Retrieval
| Component | Detail |
|-----------|--------|
| **Two-Tower** | PyTorch, in-batch softmax, 25 epochs, 128-dim embeddings |
| **FAISS** | IVFFlat index, 123k jobs, nlist=100, nprobe=10 |
| **Reciprocal / Bilateral** | Inverse job→user tower; sigmoid product scores two-sided fit |

### Ranking
| Component | Detail |
|-----------|--------|
| **iALS CF** | `implicit` library, 64 factors, α=40, binary implicit feedback (Hu/Koren/Volinsky 2008) |
| **Content-based** | MiniLM-L6-v2 (384-dim); dual long-term + short-term user profile (PinnerSAGE KDD 2020) |
| **BERT4Rec** | Bidirectional transformer for sequential interaction modelling |
| **LambdaMART** | XGBoost `rank:pairwise`, 500 rounds, 50 random + 5 hard negatives per positive (Facebook KDD 2020) |
| **Salary Predictor** | Gradient boosting on 368k jobs (LinkedIn + UK Train_rev1); wired as LTR feature |

### Classical Baselines
| Component | Detail |
|-----------|--------|
| **Popularity** | Recency-decayed global + per-category scores (halflife=30 days) |
| **Hybrid combiner** | Tiered warm/lukewarm/cold weighting of content + iALS + popularity; consumed as LTR feature |

### Domain
| Component | Detail |
|-----------|--------|
| **Resume NER** | regex + optional spaCy; extracts skills and experience years |
| **Skill Ontology** | ESCO-inspired; alias normalisation, relatedness scoring, gap analysis |
| **Career Path** | Transition predictor from apply sequences |
| **Query Understanding** | Groq LLM → structured filters (category, seniority, location, salary range) |

## Data

Set `data.source: real` in `config/config.yaml` and place the following Kaggle files in `data/raw/`:

| File | Source | Used for |
|------|--------|----------|
| `postings.csv` | LinkedIn Job Postings | 123,849 jobs |
| `Resume.csv` | Resume Dataset | 2,484 users |
| `Train_rev1.csv` | UK Job Salaries | 244,768 salary labels |

On first run the adapter builds canonical `jobs.csv / users.csv / interactions.csv` under `data/processed/real/` and synthesizes 30 interactions per user with category/skill-correlated signal.

## Setup

```bash
python -m venv venv
source venv/Scripts/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm
```

Groq API keys (LLM reranker + query understanding):
```bash
export GROQ_API_KEY=gsk_...
export GROQ_API_KEY_2=gsk_...     # optional rotation keys
export GROQ_API_KEY_3=gsk_...
```

## Train

```bash
# Full pipeline — all models + LLM eval on 200 sampled users
python -m src.models.train --eval-with-llm --checkpoint-dir /path/to/checkpoints

# Without LLM eval (faster)
python -m src.models.train

# Skip BERT4Rec (fastest)
python -m src.models.train --no-tier2
```

Artifacts saved to `models_artifacts/`. Pass `--checkpoint-dir` to a persistent path (e.g. Google Drive on Colab) to survive disconnects — each component is checkpointed immediately after fit.

**Approximate training time on T4 GPU:** ~80 min total
- MiniLM encoding: ~10 min · Two-Tower: ~1 min · LTR feature build: ~45 min · XGB 500 rounds: ~8 min · Eval: ~60 min

## Serve

```bash
uvicorn api.main:app --reload
```

Key endpoints:

| Endpoint | Description |
|----------|-------------|
| `GET /recommend/multi-stage/{user_id}` | Full pipeline with per-stage scores + LLM explanations |
| `GET /recommend/{user_id}?model=hybrid` | Classical recommender (hybrid/content/collab/popularity) |
| `POST /recommend/new-user` | Cold-start via resume text + skills |
| `GET /pipeline/inspect/{user_id}` | Per-stage candidate breakdown for debugging |
| `GET /similar-jobs/{job_id}` | Job-to-job similarity |
| `GET /explain/{user_id}/{job_id}` | Signal-level match explanation |
| `POST /query/parse` | Free-form search → structured filters |
| `POST /salary/predict` | Salary range prediction |
| `POST /skill-gap` | Gap analysis with ontology-aware adjacent-skill suggestions |

## Evaluate

```bash
pytest tests/ -v   # 78 tests
```

Metrics: Precision@K · Recall@K · NDCG@K · MAP · Coverage · Intra-list Diversity  
Split: per-user 80/20; evaluated on the full production cascade (FAISS → bilateral → LTR → MMR).

## Repository Layout

```
config/            Typed config + YAML loader
src/
  data/            Real-data adapter + preprocessing + train/test split
  features/        Text (MiniLM), structured (hash-bucket location), ranking features
  models/          iALS, Two-Tower, Reciprocal, BERT4Rec, LambdaMART, Salary, LLM reranker
  retrieval/       FAISS IVFFlat wrapper
  pipeline/        Multi-stage orchestration (retrieval → ranking → MMR → LLM)
  evaluation/      Metrics + Evaluator + cold-start analysis
  nlp/             Resume NER + Groq query understanding
  ontology/        Skill ontology (normalisation, relatedness, gap analysis)
  utils/           Logger (UTF-8 safe) + MLflow no-op wrapper
api/               FastAPI app + schemas
app/               Streamlit UI
frontend/          Next.js job feed UI (NexusHire)
tests/             pytest suite (78 tests)
docs/plans/        Architecture + implementation plan
```

## Notable Design Decisions

- **iALS over SVD** — implicit ALS on binary interactions avoids treating arbitrary view/save/apply integers as cardinal ratings; confidence scaling (α=40) handles interaction-strength signal correctly.
- **Hash-bucket location encoding** — replaces 10k+ dim one-hot (≈7 GB) with 256 hash buckets + state/country one-hots (Facebook KDD 2020), cutting peak memory from ~10 GB to ~2 GB.
- **Dual user profile (long-term + short-term)** — concatenated 768-dim vector; short-term captures session intent (PinnerSAGE KDD 2020 pattern).
- **Bilateral / reciprocal scoring** — sigmoid product of forward (user→job) and inverse (job→user) tower scores models two-sided marketplace fit; wired as an LTR feature and surfaced in LLM prompts.
- **LambdaMART negative sampling** — 50 random + 5 hard same-category negatives per positive gives the ranker a realistic signal distribution (all-positives training is incoherent for pairwise objectives).
- **LLM eval on sample, not full set** — Groq free-tier limits make full-set LLM eval impractical; 200-user random sample gives ±0.02 NDCG CI at a fraction of the cost.
- **Groq 3-key rotation** — round-robin on 401/403/429; exhaustion triggers graceful pass-through so training never hard-fails on rate limits.
- **MLflow with `MLFLOW_DISABLE=1` escape hatch** — tracking is a no-op when the env var is set; tests and Colab runs don't depend on a running MLflow server.

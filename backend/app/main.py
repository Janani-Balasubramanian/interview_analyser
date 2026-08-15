from fastapi import FastAPI
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from .core.config import settings
from .core.database import engine, Base
from .routers import auth, interviews, dashboard
from .models.models import Question, DomainTrack, ExperienceTier

# Create all DB tables on startup
Base.metadata.create_all(bind=engine)


def _seed_questions():
    """Insert sample questions the first time the app starts."""
    from .core.database import SessionLocal
    db = SessionLocal()
    try:
        if db.query(Question).count() > 0:
            return

        questions = [
            # ── Software Engineering · Tier 1 ─────────────────────────────
            Question(
                domain=DomainTrack.SOFTWARE_ENGINEERING, tier=ExperienceTier.TIER1,
                difficulty=1,
                question_text="Explain the difference between a stack and a queue. When would you use each?",
                ideal_answer_outline="Stack: LIFO, use for recursion/undo. Queue: FIFO, use for BFS/task scheduling.",
                tags=["data-structures", "fundamentals"],
            ),
            Question(
                domain=DomainTrack.SOFTWARE_ENGINEERING, tier=ExperienceTier.TIER1,
                difficulty=2,
                question_text="What is the time complexity of binary search? Explain how it works.",
                ideal_answer_outline="O(log n). Divide and conquer on a sorted array.",
                tags=["algorithms", "search"],
            ),
            Question(
                domain=DomainTrack.SOFTWARE_ENGINEERING, tier=ExperienceTier.TIER1,
                difficulty=2,
                question_text="Describe the difference between REST and GraphQL.",
                ideal_answer_outline="REST: resource-based, multiple endpoints. GraphQL: single endpoint, client specifies data.",
                tags=["api", "web"],
            ),
            Question(
                domain=DomainTrack.SOFTWARE_ENGINEERING, tier=ExperienceTier.TIER1,
                difficulty=2,
                question_text="What is the difference between SQL and NoSQL databases? Give a use case for each.",
                ideal_answer_outline="SQL: relational, ACID, structured. NoSQL: flexible schema, horizontal scaling.",
                tags=["databases", "fundamentals"],
            ),
            Question(
                domain=DomainTrack.SOFTWARE_ENGINEERING, tier=ExperienceTier.TIER1,
                difficulty=1,
                question_text="Explain what happens when you type a URL in a browser and press Enter.",
                ideal_answer_outline="DNS → TCP handshake → TLS → HTTP request → server processing → HTML parsing → rendering.",
                tags=["networking", "web", "fundamentals"],
            ),

            # ── Software Engineering · Tier 2 ─────────────────────────────
            Question(
                domain=DomainTrack.SOFTWARE_ENGINEERING, tier=ExperienceTier.TIER2,
                difficulty=3,
                question_text="How would you design a URL shortener like bit.ly? Discuss scaling considerations.",
                ideal_answer_outline="Hash function, base62 encoding, distributed DB, caching, rate limiting, analytics.",
                tags=["system-design", "scalability"],
            ),
            Question(
                domain=DomainTrack.SOFTWARE_ENGINEERING, tier=ExperienceTier.TIER2,
                difficulty=3,
                question_text="Explain CAP theorem and give examples of systems that prioritise CP vs AP.",
                ideal_answer_outline="Consistency, Availability, Partition tolerance. CP: MongoDB. AP: Cassandra.",
                tags=["distributed-systems"],
            ),

            # ── Software Engineering · Tier 3 ─────────────────────────────
            Question(
                domain=DomainTrack.SOFTWARE_ENGINEERING, tier=ExperienceTier.TIER3,
                difficulty=5,
                question_text=(
                    "You are asked to migrate a monolithic e-commerce platform to microservices. "
                    "Walk me through your approach, migration strategy, and how you'd handle data consistency."
                ),
                ideal_answer_outline="Strangler fig, DDD, saga pattern, event sourcing, API gateway, service mesh.",
                tags=["microservices", "system-design", "architecture"],
            ),
            Question(
                domain=DomainTrack.SOFTWARE_ENGINEERING, tier=ExperienceTier.TIER3,
                difficulty=5,
                question_text=(
                    "How would you design a real-time collaborative document editor (like Google Docs)? "
                    "Focus on conflict resolution and consistency."
                ),
                ideal_answer_outline="OT or CRDT, WebSockets, optimistic UI, event sourcing.",
                tags=["system-design", "real-time", "distributed"],
            ),
            Question(
                domain=DomainTrack.SOFTWARE_ENGINEERING, tier=ExperienceTier.TIER3,
                difficulty=4,
                question_text="Describe your approach to zero-downtime deployments for a high-traffic production system.",
                ideal_answer_outline="Blue/green or canary, feature flags, health checks, rollback strategy, DB migration strategy.",
                tags=["devops", "deployment", "reliability"],
            ),

            # ── Data Analytics · Tier 1 ───────────────────────────────────
            Question(
                domain=DomainTrack.DATA_ANALYTICS, tier=ExperienceTier.TIER1,
                difficulty=1,
                question_text="What is the difference between supervised and unsupervised learning? Give examples.",
                ideal_answer_outline="Supervised: labeled data (classification, regression). Unsupervised: clustering, dimensionality reduction.",
                tags=["ml-basics"],
            ),

            # ── Data Analytics · Tier 2 ───────────────────────────────────
            Question(
                domain=DomainTrack.DATA_ANALYTICS, tier=ExperienceTier.TIER2,
                difficulty=3,
                question_text="How do you handle missing data in a dataset? Discuss different strategies and trade-offs.",
                ideal_answer_outline="Deletion, mean/median imputation, model-based, multiple imputation. Depends on MCAR/MAR/MNAR.",
                tags=["data-preprocessing"],
            ),

            # ── Data Analytics · Tier 3 ───────────────────────────────────
            Question(
                domain=DomainTrack.DATA_ANALYTICS, tier=ExperienceTier.TIER3,
                difficulty=5,
                question_text=(
                    "How would you design an ML platform for a company with hundreds of data scientists "
                    "and thousands of model versions in production?"
                ),
                ideal_answer_outline="MLflow/Kubeflow, model registry, feature store, A/B infra, model monitoring, drift detection, CI/CD for ML.",
                tags=["mlops", "platform", "scalability"],
            ),
            Question(
                domain=DomainTrack.DATA_ANALYTICS, tier=ExperienceTier.TIER3,
                difficulty=4,
                question_text="Describe a time a model performed well in staging but poorly in production. How did you diagnose and fix it?",
                ideal_answer_outline="Training-serving skew, data drift, concept drift, feature pipeline mismatches, shadow mode testing.",
                tags=["mlops", "debugging", "production"],
            ),

            # ── HR / Behavioral · Tier 1 ──────────────────────────────────
            Question(
                domain=DomainTrack.HR_BEHAVIORAL, tier=ExperienceTier.TIER1,
                difficulty=1,
                question_text="Tell me about a time you faced a conflict in a team. How did you resolve it?",
                ideal_answer_outline="STAR method: Situation, Task, Action, Result. Focus on communication and outcome.",
                tags=["behavioral", "conflict"],
            ),
            Question(
                domain=DomainTrack.HR_BEHAVIORAL, tier=ExperienceTier.TIER1,
                difficulty=1,
                question_text="Why are you interested in this role, and what makes you a strong candidate?",
                ideal_answer_outline="Alignment of skills and role requirements, genuine motivation, specific relevant experience.",
                tags=["behavioral", "motivation"],
            ),
            Question(
                domain=DomainTrack.HR_BEHAVIORAL, tier=ExperienceTier.TIER1,
                difficulty=1,
                question_text="Describe a time when you had to learn a new skill quickly. How did you approach it?",
                ideal_answer_outline="STAR: identify gap, learning strategy (courses/mentorship/hands-on), time management, measurable outcome.",
                tags=["behavioral", "growth"],
            ),

            # ── HR / Behavioral · Tier 2 ──────────────────────────────────
            Question(
                domain=DomainTrack.HR_BEHAVIORAL, tier=ExperienceTier.TIER2,
                difficulty=2,
                question_text="Describe a situation where you had to lead a project with tight deadlines. What was the outcome?",
                ideal_answer_outline="STAR: prioritisation, delegation, stakeholder communication, measurable results.",
                tags=["leadership", "project-management"],
            ),

            # ── HR / Behavioral · Tier 3 ──────────────────────────────────
            Question(
                domain=DomainTrack.HR_BEHAVIORAL, tier=ExperienceTier.TIER3,
                difficulty=3,
                question_text="Tell me about a time you influenced a major organisational decision without formal authority.",
                ideal_answer_outline="Stakeholder mapping, data-driven persuasion, coalition building, executive communication.",
                tags=["leadership", "influence", "executive"],
            ),
            Question(
                domain=DomainTrack.HR_BEHAVIORAL, tier=ExperienceTier.TIER3,
                difficulty=4,
                question_text="Describe how you've built and scaled an engineering team from scratch.",
                ideal_answer_outline="Hiring bar, culture add, mentorship programmes, engineering ladders, OKRs, psychological safety.",
                tags=["leadership", "team-building", "management"],
            ),

            # ── Product Management · Tier 1 ───────────────────────────────
            Question(
                domain=DomainTrack.PRODUCT_MANAGEMENT, tier=ExperienceTier.TIER1,
                difficulty=2,
                question_text="What is a product roadmap and how would you build one for a new mobile app?",
                ideal_answer_outline="Vision, goals, user research, feature backlog, prioritisation framework, timelines, stakeholder alignment.",
                tags=["product", "roadmap", "fundamentals"],
            ),

            # ── Product Management · Tier 2 ───────────────────────────────
            Question(
                domain=DomainTrack.PRODUCT_MANAGEMENT, tier=ExperienceTier.TIER2,
                difficulty=3,
                question_text="How would you prioritise features for a new mobile app with limited engineering resources?",
                ideal_answer_outline="RICE / MoSCoW / Value vs Effort matrix. User research, business goals, technical feasibility.",
                tags=["prioritisation", "product"],
            ),

            # ── Product Management · Tier 3 ───────────────────────────────
            Question(
                domain=DomainTrack.PRODUCT_MANAGEMENT, tier=ExperienceTier.TIER3,
                difficulty=5,
                question_text=(
                    "How have you used data to make a counterintuitive product decision that went against "
                    "stakeholder intuition? What was the result?"
                ),
                ideal_answer_outline="Experimentation culture, A/B testing, data storytelling, managing up, signal vs noise.",
                tags=["product", "data-driven", "leadership"],
            ),

            # ── Business Analytics · Tier 1 ───────────────────────────────
            Question(
                domain=DomainTrack.BUSINESS_ANALYTICS, tier=ExperienceTier.TIER1,
                difficulty=2,
                question_text="What KPIs would you track for an e-commerce business and why?",
                ideal_answer_outline="Conversion rate, AOV, CAC, LTV, cart abandonment, retention. Link to business goals.",
                tags=["kpi", "metrics"],
            ),

            # ── Business Analytics · Tier 2 ───────────────────────────────
            Question(
                domain=DomainTrack.BUSINESS_ANALYTICS, tier=ExperienceTier.TIER2,
                difficulty=3,
                question_text="Walk me through how you would conduct an A/B test for a checkout page redesign. What pitfalls would you avoid?",
                ideal_answer_outline="Hypothesis, sample size, random assignment, metric selection, significance, novelty effect, network effects.",
                tags=["experimentation", "statistics", "analytics"],
            ),

            # ── Business Analytics · Tier 3 ───────────────────────────────
            Question(
                domain=DomainTrack.BUSINESS_ANALYTICS, tier=ExperienceTier.TIER3,
                difficulty=5,
                question_text="Walk me through how you'd build a company-wide forecasting model integrating marketing, sales, and operations data.",
                ideal_answer_outline="Data integration, time-series modelling, uncertainty quantification, scenario planning, model governance.",
                tags=["forecasting", "strategy", "analytics"],
            ),

            # ── Marketing · Tier 1 ────────────────────────────────────────
            Question(
                domain=DomainTrack.MARKETING, tier=ExperienceTier.TIER1,
                difficulty=1,
                question_text="Explain the difference between SEO and SEM. When would you invest more in one over the other?",
                ideal_answer_outline="SEO: organic, long-term. SEM: paid, immediate. Depends on budget, timeline, competition.",
                tags=["digital-marketing"],
            ),

            # ── Marketing · Tier 2 ────────────────────────────────────────
            Question(
                domain=DomainTrack.MARKETING, tier=ExperienceTier.TIER2,
                difficulty=3,
                question_text="You have a limited budget for a product launch. How would you allocate it across digital channels and measure success?",
                ideal_answer_outline="Channel mix, CPL/CPA benchmarks, funnel metrics, A/B testing, attribution, ROAS, cohort analysis.",
                tags=["digital-marketing", "strategy", "analytics"],
            ),

            # ── Marketing · Tier 3 ────────────────────────────────────────
            Question(
                domain=DomainTrack.MARKETING, tier=ExperienceTier.TIER3,
                difficulty=4,
                question_text="Describe how you would build a multi-channel attribution model for a business spending $10M+ on marketing annually.",
                ideal_answer_outline="Last-touch vs data-driven attribution, Markov chains, Shapley values, incrementality testing, media mix modelling.",
                tags=["attribution", "marketing-analytics", "strategy"],
            ),
        ]

        db.add_all(questions)
        db.commit()
        print(f"[startup] Seeded {len(questions)} sample questions.")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    _seed_questions()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

# CORS — allow dev ports + any FRONTEND_URL env var (set to Netlify URL in prod)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(interviews.router, prefix=settings.API_V1_STR)
app.include_router(dashboard.router, prefix=settings.API_V1_STR)


@app.get("/")
def root():
    return {
        "message": "AI Interview Performance Analyzer API",
        "version": settings.VERSION,
        "docs": f"{settings.API_V1_STR}/openapi.json",
        "swagger": "/docs",
    }


@app.get("/health")
def health():
    return {"status": "healthy"}

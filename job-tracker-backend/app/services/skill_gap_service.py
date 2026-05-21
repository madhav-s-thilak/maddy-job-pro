"""
Skill gap analysis engine.

Aggregates missing skills across ALL tracked jobs for a user,
weights them by frequency and estimated market importance,
and generates a prioritised weekly learning roadmap.

No random values. No hallucinated advice.
Roadmap weeks are derived from the real skill list + domain heuristics.
"""
import logging
from collections import Counter
from typing import Any, Dict, List, Optional

from app.services.scoring_service import score_resume_against_job
from app.services.skill_extractor import extract_skills

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Market importance weights (higher = more valuable on the job market)
# Sourced from common JD analysis patterns — keeps the roadmap impactful.
# ---------------------------------------------------------------------------
_IMPORTANCE: Dict[str, int] = {
    # Infrastructure / DevOps
    "kubernetes": 10, "docker": 9, "aws": 9, "gcp": 8, "azure": 8,
    "ci/cd": 8, "terraform": 7, "github actions": 7,
    # AI / ML
    "machine learning": 10, "pytorch": 9, "tensorflow": 8,
    "llm": 9, "rag": 8, "langchain": 7, "nlp": 8,
    "deep learning": 9, "transformers": 8,
    # Backend
    "fastapi": 8, "django": 7, "postgresql": 8, "redis": 7,
    "graphql": 7, "grpc": 6,
    # Languages
    "python": 9, "typescript": 8, "go": 8, "rust": 7,
    # Frontend
    "react": 8, "next.js": 8,
    # Soft skills
    "communication": 6, "leadership": 6, "system design": 9,
}


def _weighted_priority(skill: str, frequency: int, total_jobs: int) -> float:
    importance = _IMPORTANCE.get(skill, 5)
    freq_ratio = frequency / max(total_jobs, 1)
    return round(importance * freq_ratio, 3)


# ---------------------------------------------------------------------------
# Learning week generator (rule-based, not LLM)
# ---------------------------------------------------------------------------

_ROADMAP_TEMPLATES: Dict[str, List[str]] = {
    "docker": [
        "Docker fundamentals — containers, images, Dockerfile",
        "Docker Compose for multi-service local dev",
        "Optimise Dockerfile layers; push to Docker Hub",
    ],
    "kubernetes": [
        "Kubernetes core concepts — Pods, Deployments, Services",
        "Deploy a FastAPI app on Minikube / kind",
        "Helm charts, ConfigMaps, rolling updates",
        "Production patterns: HPA, resource limits, health probes",
    ],
    "aws": [
        "AWS core services — EC2, S3, IAM, VPC",
        "Deploy a backend app on EC2 / ECS",
        "Serverless with Lambda + API Gateway",
        "RDS, Secrets Manager, CloudWatch monitoring",
    ],
    "machine learning": [
        "ML fundamentals — supervised vs. unsupervised, loss functions",
        "scikit-learn pipelines for classification / regression",
        "Model evaluation, cross-validation, hyperparameter tuning",
        "Deploy a model as a FastAPI endpoint",
    ],
    "pytorch": [
        "PyTorch tensors and autograd basics",
        "Build and train an MLP on a standard dataset",
        "CNN or RNN for a domain-relevant task",
        "Model serialisation, ONNX export, inference optimisation",
    ],
    "react": [
        "React fundamentals — components, props, state, hooks",
        "React Router, context API, custom hooks",
        "API integration with Axios / React Query",
        "Production build, deployment to Vercel / Netlify",
    ],
    "system design": [
        "Distributed systems basics — CAP theorem, consistency models",
        "Design a URL shortener (classic interview problem)",
        "Design a notification system or rate limiter",
        "Caching strategies, message queues, CDN patterns",
    ],
    "typescript": [
        "TypeScript types, interfaces, generics",
        "Migrate a JavaScript project to TypeScript",
        "Advanced patterns — mapped types, conditional types",
    ],
    "ci/cd": [
        "GitHub Actions basics — triggers, jobs, steps",
        "Build, test, and lint on every PR",
        "Deploy to Render / Vercel via CD pipeline",
    ],
    "graphql": [
        "GraphQL schema, queries, mutations, resolvers",
        "Build a GraphQL API with Strawberry (Python) or Apollo (Node)",
        "Subscriptions and caching with Apollo Client",
    ],
}

_GENERIC_WEEKS = [
    "Core concepts — official docs + 2 tutorial videos",
    "Build a small project applying the skill end-to-end",
    "Write a blog post or README documenting what you built",
]


def _roadmap_for_skill(skill: str) -> List[Dict[str, str]]:
    weeks = _ROADMAP_TEMPLATES.get(skill, _GENERIC_WEEKS)
    return [{"week": i + 1, "focus": w} for i, w in enumerate(weeks)]


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def analyze_skill_gaps(
    resume_text: str,
    jobs: List[Any],                # list of Job schema objects from sheets_service
) -> Dict[str, Any]:
    """
    Aggregate skill gaps across all user jobs and build a learning roadmap.

    Algorithm:
      1. For each job with a JD, extract its required skills
      2. Diff against resume skills to find missing skills per job
      3. Aggregate missing skills by frequency
      4. Weight by market importance
      5. Return top-N with roadmap
    """
    if not resume_text:
        return {
            "total_jobs_analyzed": 0,
            "resume_skills": [],
            "gap_summary": [],
            "top_skills_to_learn": [],
            "learning_roadmap": [],
            "insight": "Paste your resume to analyse skill gaps across your tracked jobs.",
        }

    resume_skills = extract_skills(resume_text)
    jobs_with_jd = [j for j in jobs if j.job_description and j.job_description.strip()]

    if not jobs_with_jd:
        return {
            "total_jobs_analyzed": 0,
            "resume_skills": resume_skills[:20],
            "gap_summary": [],
            "top_skills_to_learn": [],
            "learning_roadmap": [],
            "insight": "Add job descriptions to your tracked jobs to enable gap analysis.",
        }

    # Aggregate missing skills
    missing_counter: Counter = Counter()
    job_gap_details: List[Dict] = []

    for job in jobs_with_jd:
        score = score_resume_against_job(
            resume_text, job.job_description, job.company, job.role
        )
        for skill in score["missing_skills"]:
            missing_counter[skill] += 1
        job_gap_details.append({
            "company": job.company,
            "role": job.role,
            "match_score": score["match_score"],
            "missing": score["missing_skills"][:5],
        })

    total = len(jobs_with_jd)

    # Build prioritised skill list
    gap_summary = [
        {
            "skill": skill,
            "frequency": count,
            "pct_of_jobs": round(count / total * 100),
            "priority_score": _weighted_priority(skill, count, total),
        }
        for skill, count in missing_counter.most_common(20)
    ]
    gap_summary.sort(key=lambda x: x["priority_score"], reverse=True)

    top_skills = [g["skill"] for g in gap_summary[:6]]

    # Build roadmap (week 1 = highest priority skill)
    roadmap: List[Dict] = []
    week_offset = 1
    for skill in top_skills[:4]:
        weeks = _roadmap_for_skill(skill)
        for w in weeks:
            roadmap.append({
                "week": week_offset,
                "skill": skill,
                "focus": w["focus"],
            })
            week_offset += 1

    insight = _generate_insight(gap_summary, resume_skills, total)

    return {
        "total_jobs_analyzed": total,
        "resume_skills": resume_skills[:20],
        "gap_summary": gap_summary[:12],
        "top_skills_to_learn": top_skills,
        "learning_roadmap": roadmap,
        "job_details": job_gap_details[:10],
        "insight": insight,
    }


def _generate_insight(gap_summary: List[Dict], resume_skills: List[str], total: int) -> str:
    if not gap_summary:
        return f"Excellent — no recurring skill gaps detected across {total} jobs."
    top = gap_summary[0]
    pct = top["pct_of_jobs"]
    skill = top["skill"]
    if pct >= 70:
        return (
            f"'{skill}' is missing from {pct}% of your target roles. "
            "Addressing this one skill will significantly expand your eligible pool."
        )
    if pct >= 40:
        return (
            f"'{skill}' appears in most target JDs but not your resume. "
            "A focused 2-3 week project would close this gap."
        )
    return (
        f"Your skill profile is broadly aligned. Filling niche gaps like "
        f"'{skill}' will give you an edge in competitive roles."
    )

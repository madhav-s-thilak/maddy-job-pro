"""
AI Intelligence API — semantic scoring and job ranking.

Endpoints:
  POST /intelligence/score       Score a resume against one job description
  POST /intelligence/rank-jobs   Rank all tracked jobs by resume similarity
"""
import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.embedding_service import rank_by_similarity
from app.services.scoring_service import score_resume_against_job
from app.services.sheets_service import sheets_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/intelligence", tags=["intelligence"])


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class ScoreRequest(BaseModel):
    resume_text: str
    job_description: str
    job_company: Optional[str] = ""
    job_role: Optional[str] = ""


class RankJobsRequest(BaseModel):
    resume_text: str
    user: Optional[str] = None
    top_n: Optional[int] = 10


class ScoreResponse(BaseModel):
    match_score: int
    grade: str
    semantic_score: float
    skill_score: float
    keyword_score: float
    strong_matches: List[str]
    missing_skills: List[str]
    resume_skills: List[str]
    jd_skills: List[str]
    recommendations: List[str]
    summary: str


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/score", response_model=ScoreResponse)
async def score_job_match(request: ScoreRequest):
    """
    Score resume compatibility against a single job description.

    All scoring is deterministic — no LLM calls, no random values.
    Returns a weighted composite of semantic similarity, skill overlap,
    and keyword density alongside actionable recruiter recommendations.
    """
    try:
        result = score_resume_against_job(
            resume_text=request.resume_text,
            job_description=request.job_description,
            job_company=request.job_company or "",
            job_role=request.job_role or "",
        )
        return result
    except Exception as exc:
        logger.exception("Error in /intelligence/score")
        raise HTTPException(status_code=500, detail=f"Scoring error: {exc}")


@router.post("/rank-jobs")
async def rank_jobs_by_resume(request: RankJobsRequest) -> Dict[str, Any]:
    """
    Rank all tracked jobs for *user* by semantic similarity to the resume.

    Only jobs that have a non-empty job_description are considered.
    Each result includes a full recruiter score breakdown.
    """
    try:
        jobs = sheets_service.get_all_jobs(request.user)

        jobs_with_jd = [j for j in jobs if j.job_description and j.job_description.strip()]
        if not jobs_with_jd:
            return {
                "ranked_jobs": [],
                "total": 0,
                "message": "No jobs with descriptions found. Add job descriptions to enable AI ranking.",
            }

        # Step 1: Fast semantic pre-ranking (TF-IDF cosine)
        jd_texts = [j.job_description for j in jobs_with_jd]
        ranked_indices = rank_by_similarity(request.resume_text, jd_texts)

        # Step 2: Full recruiter score for top N only (avoids over-scoring)
        top_n = min(request.top_n or 10, len(ranked_indices))
        results: List[Dict[str, Any]] = []

        for idx, _ in ranked_indices[:top_n]:
            job = jobs_with_jd[idx]
            score_data = score_resume_against_job(
                resume_text=request.resume_text,
                job_description=job.job_description,
                job_company=job.company,
                job_role=job.role,
            )
            results.append({
                "row_id": job.row_id,
                "company": job.company,
                "role": job.role,
                "location": job.location or "",
                "status": job.status,
                "salary": job.salary or "",
                "jd_link": job.jd_link or "",
                "match_score": score_data["match_score"],
                "grade": score_data["grade"],
                "strong_matches": score_data["strong_matches"][:5],
                "missing_skills": score_data["missing_skills"][:5],
                "recommendations": score_data["recommendations"][:2],
                "summary": score_data["summary"],
            })

        # Final sort by composite score descending
        results.sort(key=lambda x: x["match_score"], reverse=True)

        return {"ranked_jobs": results, "total": len(results)}

    except Exception as exc:
        logger.exception("Error in /intelligence/rank-jobs")
        raise HTTPException(status_code=500, detail=f"Ranking error: {exc}")

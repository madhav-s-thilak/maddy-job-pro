"""ATS simulation endpoints."""
import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.ats_service import simulate_ats

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ats", tags=["ats"])


class ATSRequest(BaseModel):
    resume_text: str
    job_description: str
    job_role: Optional[str] = ""
    job_company: Optional[str] = ""


class ATSResponse(BaseModel):
    ats_score: int
    formatting_risk: str
    keyword_coverage: int
    sections_found: List[str]
    section_score: int
    readability_score: int
    missing_keywords: List[str]
    covered_keywords: List[str]
    strong_matches: List[str]
    missing_skills: List[str]
    recommendations: List[str]


@router.post("/simulate", response_model=ATSResponse)
async def run_ats_simulation(request: ATSRequest):
    """
    Simulate how an ATS would parse and score the resume against a job description.
    Fully deterministic — no LLM involved.
    """
    try:
        result = simulate_ats(
            resume_text=request.resume_text,
            job_description=request.job_description,
            job_role=request.job_role or "",
            job_company=request.job_company or "",
        )
        return result
    except Exception as exc:
        logger.exception("Error in /ats/simulate")
        raise HTTPException(status_code=500, detail=f"ATS simulation error: {exc}")

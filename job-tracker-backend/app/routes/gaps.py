"""Skill gap analysis endpoints."""
import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.skill_gap_service import analyze_skill_gaps
from app.services.sheets_service import sheets_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/gaps", tags=["gaps"])


class GapRequest(BaseModel):
    resume_text: str
    user: Optional[str] = None


@router.post("/analyze")
async def get_skill_gaps(request: GapRequest) -> Dict[str, Any]:
    """
    Aggregate skill gaps across all tracked jobs for a user and return
    a prioritised learning roadmap.
    """
    try:
        jobs = sheets_service.get_all_jobs(request.user)
        result = analyze_skill_gaps(resume_text=request.resume_text, jobs=jobs)
        return result
    except Exception as exc:
        logger.exception("Error in /gaps/analyze")
        raise HTTPException(status_code=500, detail=f"Gap analysis error: {exc}")

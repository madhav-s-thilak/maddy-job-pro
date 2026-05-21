"""Portfolio / GitHub critic endpoints."""
import logging
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.portfolio_service import analyze_github_portfolio

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/portfolio", tags=["portfolio"])


class PortfolioRequest(BaseModel):
    github_url: str
    portfolio_url: Optional[str] = ""


@router.post("/analyze")
async def analyze_portfolio(request: PortfolioRequest) -> Dict[str, Any]:
    """
    Analyse a GitHub profile and return recruiter-style portfolio critique.
    Uses the public GitHub API — no auth token required for basic analysis.
    """
    try:
        result = await analyze_github_portfolio(request.github_url)
        if result.get("error"):
            raise HTTPException(status_code=400, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Error in /portfolio/analyze")
        raise HTTPException(status_code=500, detail=f"Portfolio analysis error: {exc}")

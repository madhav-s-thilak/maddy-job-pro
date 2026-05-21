"""Resume compiler endpoints."""
import logging
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.resume_compiler import resume_compiler

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/compiler", tags=["compiler"])


class CompileRequest(BaseModel):
    master_resume: str
    job_description: str
    job_role: Optional[str] = ""
    job_company: Optional[str] = ""


@router.post("/compile")
async def compile_resume(request: CompileRequest) -> Dict[str, Any]:
    """
    Generate a role-specific optimised resume from the master resume.
    Uses Groq to tailor phrasing without inventing any experience.
    """
    try:
        result = resume_compiler.compile_resume(
            master_resume=request.master_resume,
            job_description=request.job_description,
            job_role=request.job_role or "",
            job_company=request.job_company or "",
        )
        if result.get("error"):
            raise HTTPException(status_code=400, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Error in /compiler/compile")
        raise HTTPException(status_code=500, detail=f"Compiler error: {exc}")

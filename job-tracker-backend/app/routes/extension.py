"""
Browser extension job ingestion endpoint.

Architecture is ready for a Chrome/Firefox extension to POST jobs directly.
The endpoint validates, deduplicates, and saves imported jobs to the tracker.

Extension integration checklist:
  1. Extension sends POST /extension/ingest with the job payload
  2. Backend checks for duplicates by (company, role, user) tuple
  3. Valid new jobs are saved via sheets_service
  4. Response includes row_id and duplicate status for the extension to display
"""
import hmac
import logging
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel

from app.config import settings
from app.models.schemas import JobCreate, UserEnum
from app.services.sheets_service import sheets_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/extension", tags=["extension"])

# Extension API version — bump when breaking changes land
_EXTENSION_API_VERSION = "1.0"

# Google Sheets rejects cells over 50,000 characters; stay well under it.
_MAX_DESCRIPTION_CHARS = 40000


def _key_matches(provided: Optional[str]) -> bool:
    """True when no key is configured, or the provided key equals it."""
    expected = settings.EXTENSION_API_KEY
    if not expected:
        return True
    if not provided:
        return False
    return hmac.compare_digest(provided.encode("utf-8"), expected.encode("utf-8"))


def require_extension_key(x_extension_key: Optional[str] = Header(default=None)):
    if not _key_matches(x_extension_key):
        raise HTTPException(status_code=401, detail="Invalid or missing extension API key")


class ExtensionJobPayload(BaseModel):
    # Required
    user: UserEnum
    company: str
    role: str
    # Optional — may not be parseable from every site
    job_description: Optional[str] = ""
    jd_link: Optional[str] = ""
    location: Optional[str] = ""
    salary: Optional[str] = ""
    # Extension metadata
    source_site: Optional[str] = ""   # "linkedin" | "wellfound" | "greenhouse" | etc.
    extension_version: Optional[str] = ""


class ExtensionIngestResponse(BaseModel):
    status: str          # "saved" | "duplicate" | "error"
    row_id: Optional[int] = None
    message: str
    api_version: str


@router.post(
    "/ingest",
    response_model=ExtensionIngestResponse,
    dependencies=[Depends(require_extension_key)],
)
async def ingest_job(payload: ExtensionJobPayload):
    """
    Ingest a job sent from the browser extension.

    Deduplication: checks if (company, role, user) already exists.
    If duplicate → returns status="duplicate" with existing row_id.
    """
    try:
        if not payload.company.strip() or not payload.role.strip():
            raise HTTPException(
                status_code=422,
                detail="company and role are required fields",
            )

        # Duplicate check — load existing jobs and compare
        existing_jobs = sheets_service.get_all_jobs(payload.user.value)
        for job in existing_jobs:
            if (
                job.company.lower().strip() == payload.company.lower().strip()
                and job.role.lower().strip() == payload.role.lower().strip()
            ):
                return ExtensionIngestResponse(
                    status="duplicate",
                    row_id=job.row_id,
                    message=f"Job already tracked (row {job.row_id})",
                    api_version=_EXTENSION_API_VERSION,
                )

        # Save new job
        job_data = JobCreate(
            user=payload.user,
            company=payload.company.strip(),
            role=payload.role.strip(),
            job_description=(payload.job_description or "")[:_MAX_DESCRIPTION_CHARS],
            jd_link=payload.jd_link or "",
            location=payload.location or "",
            salary=payload.salary or "",
            status="Not Applied",
            notes=f"Imported via extension from {payload.source_site}" if payload.source_site else "Imported via extension",
        )
        saved = sheets_service.create_job(job_data)

        return ExtensionIngestResponse(
            status="saved",
            row_id=saved.row_id,
            message=f"Job saved successfully (row {saved.row_id})",
            api_version=_EXTENSION_API_VERSION,
        )

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Error in /extension/ingest")
        raise HTTPException(status_code=500, detail=f"Ingestion error: {exc}")


@router.get("/ping")
async def extension_ping(x_extension_key: Optional[str] = Header(default=None)):
    """
    Health check for extensions to verify backend connectivity.

    Never rejects: reports whether a key is required and whether the one sent
    is accepted, so the extension can show a precise setup hint.
    """
    return {
        "status": "ok",
        "api_version": _EXTENSION_API_VERSION,
        "auth_required": bool(settings.EXTENSION_API_KEY),
        "authorized": _key_matches(x_extension_key),
    }

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
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.models.schemas import JobCreate, UserEnum
from app.services.sheets_service import sheets_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/extension", tags=["extension"])

# Extension API version — bump when breaking changes land
_EXTENSION_API_VERSION = "1.0"


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


@router.post("/ingest", response_model=ExtensionIngestResponse)
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
            job_description=payload.job_description or "",
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
async def extension_ping():
    """Health check for extensions to verify backend connectivity."""
    return {"status": "ok", "api_version": _EXTENSION_API_VERSION}

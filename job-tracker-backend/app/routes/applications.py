from fastapi import APIRouter, HTTPException
from app.models.schemas import Job, NotesUpdate
from app.services.sheets_service import sheets_service
from pydantic import BaseModel

router = APIRouter(prefix="/applications", tags=["applications"])

class MarkAppliedRequest(BaseModel):
    row_id: int
    resume_version: str = ""

@router.post("/mark-applied", response_model=Job)
async def mark_as_applied(request: MarkAppliedRequest):
    """Mark a job as applied with optional resume version"""
    try:
        updated_job = sheets_service.mark_as_applied(
            request.row_id, 
            request.resume_version
        )
        if not updated_job:
            raise HTTPException(status_code=404, detail="Job not found")
        return updated_job
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error marking as applied: {str(e)}")

@router.put("/notes")
async def update_notes(notes_update: NotesUpdate):
    """Update notes for a specific job"""
    try:
        success = sheets_service.update_notes(notes_update.row_id, notes_update.notes)
        if not success:
            raise HTTPException(status_code=404, detail="Job not found")
        return {"message": "Notes updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating notes: {str(e)}")

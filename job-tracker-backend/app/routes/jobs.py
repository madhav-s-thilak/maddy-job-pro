from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from app.models.schemas import (
    Job, JobCreate, JobUpdate, JobExtractionRequest, 
    JobExtractionResponse, UserEnum
)
from app.services.sheets_service import sheets_service
from app.services.job_extractor import job_extractor
from app.services.serpapi_service import serpapi_service

router = APIRouter(prefix="/jobs", tags=["jobs"])

@router.get("/search")
async def search_jobs(query: str = Query(..., description="Job title, keywords, etc."), location: str = Query("Remote", description="Location")):
    """Search for live jobs using SerpAPI"""
    try:
        results = serpapi_service.search_jobs(query=query, location=location)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=List[Job])
async def get_jobs(
    user: Optional[str] = Query(None, description="Filter by user (Madhav or Veena)"),
    status: Optional[str] = Query(None, description="Filter by status"),
    search: Optional[str] = Query(None, description="Search in company or role")
):
    """Get all jobs with optional filters"""
    try:
        jobs = sheets_service.get_all_jobs(user)
        
        # Apply additional filters
        if status:
            jobs = [j for j in jobs if j.status == status]
        
        if search:
            search_lower = search.lower()
            jobs = [
                j for j in jobs 
                if search_lower in j.company.lower() or search_lower in j.role.lower()
            ]
        
        return jobs
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching jobs: {str(e)}")

@router.post("/", response_model=Job)
async def create_job(job: JobCreate):
    """Create a new job entry"""
    try:
        return sheets_service.create_job(job)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating job: {str(e)}")

@router.put("/{row_id}", response_model=Job)
async def update_job(row_id: int, job_update: JobUpdate):
    """Update an existing job"""
    try:
        updated_job = sheets_service.update_job(row_id, job_update)
        if not updated_job:
            raise HTTPException(status_code=404, detail="Job not found")
        return updated_job
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating job: {str(e)}")

@router.delete("/{row_id}")
async def delete_job(row_id: int):
    """Delete a job entry"""
    try:
        success = sheets_service.delete_job(row_id)
        if not success:
            raise HTTPException(status_code=404, detail="Job not found")
        return {"message": "Job deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting job: {str(e)}")

@router.post("/extract", response_model=JobExtractionResponse)
async def extract_job_from_url(request: JobExtractionRequest):
    """Extract job details from a URL and optionally save to database"""
    try:
        # Extract job details
        extracted = await job_extractor.extract_from_url(request.job_url)
        
        if not extracted["extracted_successfully"]:
            raise HTTPException(
                status_code=400, 
                detail=f"Failed to extract job details: {extracted.get('error', 'Unknown error')}"
            )
        
        # Create job entry in database
        job_data = JobCreate(
            user=request.user,
            company=extracted["company"],
            role=extracted["role"],
            location=extracted["location"],
            salary=extracted["salary"],
            job_description=extracted["job_description"],
            jd_link=request.job_url,
            status="Not Applied"
        )
        
        sheets_service.create_job(job_data)
        
        return JobExtractionResponse(**extracted)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error extracting job: {str(e)}")

@router.get("/analytics")
async def get_analytics(user: Optional[str] = Query(None)):
    """Get analytics data"""
    try:
        analytics = sheets_service.get_analytics(user)
        return analytics
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting analytics: {str(e)}")

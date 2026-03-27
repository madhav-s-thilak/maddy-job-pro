from fastapi import APIRouter, HTTPException
from app.models.schemas import ResumeOptimizeRequest, ResumeOptimizeResponse, HREmailGenerateRequest, HREmailGenerateResponse
from app.services.groq_service import groq_service

router = APIRouter(prefix="/resume", tags=["resume"])

@router.post("/optimize", response_model=ResumeOptimizeResponse)
async def optimize_resume(request: ResumeOptimizeRequest):
    """Optimize resume based on job description using AI"""
    try:
        optimized_resume, changes_summary = groq_service.optimize_resume(
            request.job_description,
            request.current_resume
        )

        return ResumeOptimizeResponse(
            optimized_resume=optimized_resume,
            changes_summary=changes_summary
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error optimizing resume: {str(e)}")

@router.post("/generate-email", response_model=HREmailGenerateResponse)
async def generate_hr_email(request: HREmailGenerateRequest):
    """Generate a humanized email to HR with job description and resume"""
    try:
        email_body, email_subject = groq_service.generate_hr_email(
            request.job_description,
            request.resume_content,
            request.applicant_name
        )

        return HREmailGenerateResponse(
            email_body=email_body,
            email_subject=email_subject
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating email: {str(e)}")

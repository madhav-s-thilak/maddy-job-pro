from pydantic import BaseModel, HttpUrl
from typing import Optional, List
from datetime import datetime
from enum import Enum

class UserEnum(str, Enum):
    MADHAV = "Madhav"
    VEENA = "Veena"

class StatusEnum(str, Enum):
    NOT_APPLIED = "Not Applied"
    APPLIED = "Applied"
    INTERVIEW = "Interview"
    OFFER = "Offer"
    REJECTED = "Rejected"
    WITHDRAWN = "Withdrawn"

class JobBase(BaseModel):
    user: UserEnum
    company: str
    role: str
    job_description: Optional[str] = ""
    jd_link: Optional[str] = ""
    location: Optional[str] = ""
    salary: Optional[str] = ""
    status: StatusEnum = StatusEnum.NOT_APPLIED
    date_applied: Optional[str] = ""
    resume_version: Optional[str] = ""
    notes: Optional[str] = ""

class JobCreate(JobBase):
    pass

class JobUpdate(BaseModel):
    user: Optional[UserEnum] = None
    company: Optional[str] = None
    role: Optional[str] = None
    job_description: Optional[str] = None
    jd_link: Optional[str] = None
    location: Optional[str] = None
    salary: Optional[str] = None
    status: Optional[StatusEnum] = None
    date_applied: Optional[str] = None
    resume_version: Optional[str] = None
    notes: Optional[str] = None

class Job(JobBase):
    row_id: int
    
    class Config:
        from_attributes = True

class ApplicationCreate(BaseModel):
    user: UserEnum
    company: str
    role: str
    jd_link: Optional[str] = ""
    resume_version: Optional[str] = ""
    notes: Optional[str] = ""

class NotesUpdate(BaseModel):
    row_id: int
    notes: str

class ResumeOptimizeRequest(BaseModel):
    job_description: str
    current_resume: str

class ResumeOptimizeResponse(BaseModel):
    optimized_resume: str
    changes_summary: str

class JobSearchRequest(BaseModel):
    keywords: str
    location: Optional[str] = ""
    num_results: int = 10

class JobExtractionRequest(BaseModel):
    job_url: str
    user: UserEnum

class JobExtractionResponse(BaseModel):
    company: str
    role: str
    location: str
    salary: str
    job_description: str
    extracted_successfully: bool

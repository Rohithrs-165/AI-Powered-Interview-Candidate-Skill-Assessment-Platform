from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.schemas import JobOpening, CandidateApplication

router = APIRouter()

class JobCreateRequest(BaseModel):
    job_title: str
    job_description: str
    required_skills: str # Comma-separated or JSON string
    experience_min: Optional[float] = 0.0
    experience_max: Optional[float] = 5.0
    department: Optional[str] = "Engineering"
    location: Optional[str] = "Remote / Hybrid"

class JobUpdateRequest(BaseModel):
    status: Optional[str] = None # 'active', 'closed'
    job_title: Optional[str] = None
    job_description: Optional[str] = None

@router.post("", status_code=status.HTTP_201_CREATED)
def create_job_opening(req: JobCreateRequest, db: Session = Depends(get_db)):
    job = JobOpening(
        job_title=req.job_title,
        job_description=req.job_description,
        required_skills=req.required_skills,
        experience_min=req.experience_min,
        experience_max=req.experience_max,
        department=req.department,
        location=req.location,
        status="active"
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return {
        "status": "success",
        "job": {
            "job_id": job.job_id,
            "job_title": job.job_title,
            "job_description": job.job_description,
            "required_skills": job.required_skills,
            "experience_min": job.experience_min,
            "experience_max": job.experience_max,
            "department": job.department,
            "location": job.location,
            "status": job.status,
            "created_at": job.created_at
        }
    }

@router.get("")
def list_job_openings(status_filter: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(JobOpening)
    if status_filter:
        query = query.filter(JobOpening.status == status_filter)
    jobs = query.order_by(JobOpening.created_at.desc()).all()

    # If no jobs exist yet, seed a default opening for seamless onboarding
    if not jobs:
        default_job = JobOpening(
            job_title="Full Stack AI Engineer",
            job_description="Join Neurova AI to build high-throughput adaptive assessment engines using FastAPI, Next.js, and Gemini AI.",
            required_skills="Python, FastAPI, Next.js, PostgreSQL, Machine Learning, System Design",
            experience_min=1.0,
            experience_max=4.0,
            department="AI & Platform Engineering",
            location="San Francisco / Remote",
            status="active"
        )
        db.add(default_job)
        db.commit()
        db.refresh(default_job)
        jobs = [default_job]

    return [
        {
            "job_id": j.job_id,
            "job_title": j.job_title,
            "job_description": j.job_description,
            "required_skills": j.required_skills,
            "experience_min": j.experience_min,
            "experience_max": j.experience_max,
            "department": j.department,
            "location": j.location,
            "status": j.status,
            "applicants_count": db.query(CandidateApplication).filter(CandidateApplication.job_id == j.job_id).count(),
            "created_at": j.created_at
        }
        for j in jobs
    ]

@router.get("/{job_id}")
def get_job_opening(job_id: str, db: Session = Depends(get_db)):
    job = db.query(JobOpening).filter(JobOpening.job_id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job opening not found.")
    return {
        "job_id": job.job_id,
        "job_title": job.job_title,
        "job_description": job.job_description,
        "required_skills": job.required_skills,
        "experience_min": job.experience_min,
        "experience_max": job.experience_max,
        "department": job.department,
        "location": job.location,
        "status": job.status,
        "created_at": job.created_at
    }

@router.patch("/{job_id}")
def update_job_opening(job_id: str, req: JobUpdateRequest, db: Session = Depends(get_db)):
    job = db.query(JobOpening).filter(JobOpening.job_id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job opening not found.")

    if req.status:
        job.status = req.status
    if req.job_title:
        job.job_title = req.job_title
    if req.job_description:
        job.job_description = req.job_description

    job.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(job)
    return {"status": "success", "job_id": job.job_id, "job_status": job.status}

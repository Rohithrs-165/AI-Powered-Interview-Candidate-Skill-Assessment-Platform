from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.schemas import Candidate, JobOpening, CandidateApplication, ResumeAnalysis, Resume, AssessmentSession
from app.services.matching_service import matching_service
from app.services.email_service import email_service

router = APIRouter()

class ApplicationSubmitRequest(BaseModel):
    candidate_id: str
    job_id: str

@router.post("/apply", status_code=status.HTTP_201_CREATED)
def apply_for_job(req: ApplicationSubmitRequest, db: Session = Depends(get_db)):
    candidate = db.query(Candidate).filter(Candidate.candidate_id == req.candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found.")

    if candidate.is_disqualified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Application Denied: Candidate has been disqualified due to proctoring malpractice."
        )

    job = db.query(JobOpening).filter(JobOpening.job_id == req.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job opening not found.")

    # Check for existing application
    existing_app = db.query(CandidateApplication).filter(
        CandidateApplication.candidate_id == req.candidate_id,
        CandidateApplication.job_id == req.job_id
    ).first()

    if existing_app:
        return {
            "status": "exists",
            "application_id": existing_app.application_id,
            "application_status": existing_app.application_status,
            "match_score": existing_app.match_score,
            "match_status": existing_app.match_status,
            "match_reasoning": existing_app.match_reasoning
        }

    # Fetch resume analysis & full resume text if available
    analysis = db.query(ResumeAnalysis).filter(ResumeAnalysis.candidate_id == req.candidate_id).first()
    skills_text = analysis.skills if analysis and analysis.skills else "Python, FastAPI, Next.js, PostgreSQL"
    summary_text = analysis.summary if analysis and analysis.summary else "Full Stack Software Engineer"

    # Fix: Resume table does not have created_at, fetch first matching resume
    resume = db.query(Resume).filter(Resume.candidate_id == req.candidate_id).first()
    resume_text = resume.extracted_text if resume and resume.extracted_text else ""

    candidate_data = {
        "full_name": candidate.full_name,
        "current_role": candidate.current_role or "Software Engineer",
        "experience_years": candidate.experience_years or 2.0,
        "skills": skills_text,
        "summary": summary_text,
        "resume_text": resume_text
    }

    job_data = {
        "job_title": job.job_title,
        "job_description": job.job_description,
        "required_skills": job.required_skills,
        "experience_min": job.experience_min,
        "experience_max": job.experience_max
    }

    # Execute AI Matching
    match_result = matching_service.match_candidate_to_job(candidate_data, job_data)
    match_score = match_result.get("match_score", 75.0)
    is_shortlisted = match_score >= 50.0
    match_status = "shortlisted" if is_shortlisted else "not_shortlisted"
    app_status = "shortlisted" if is_shortlisted else "not_shortlisted"

    # Create Application Record
    app = CandidateApplication(
        candidate_id=candidate.candidate_id,
        job_id=job.job_id,
        match_score=match_score,
        match_status=match_status,
        match_reasoning=match_result.get("reasoning", ""),
        matched_skills=",".join(match_result.get("matched_skills", [])),
        missing_skills=",".join(match_result.get("missing_skills", [])),
        application_status=app_status
    )
    db.add(app)
    db.commit()
    db.refresh(app)

    # Real-Time Non-Blocking Background Email Triggers
    import threading
    if is_shortlisted:
        threading.Thread(
            target=email_service.send_shortlist_email,
            args=(candidate.email, candidate.full_name, job.job_title),
            daemon=True
        ).start()
    else:
        threading.Thread(
            target=email_service.send_initial_rejection_email,
            args=(candidate.email, candidate.full_name, job.job_title, match_result.get("reasoning", "")),
            daemon=True
        ).start()

    return {
        "status": "success",
        "application_id": app.application_id,
        "application_status": app.application_status,
        "match_score": app.match_score,
        "match_status": app.match_status,
        "match_reasoning": app.match_reasoning,
        "matched_skills": match_result.get("matched_skills", []),
        "missing_skills": match_result.get("missing_skills", [])
    }

@router.get("/my-applications/{candidate_id}")
def get_candidate_applications(candidate_id: str, db: Session = Depends(get_db)):
    apps = db.query(CandidateApplication).filter(CandidateApplication.candidate_id == candidate_id).all()
    results = []
    for a in apps:
        job = db.query(JobOpening).filter(JobOpening.job_id == a.job_id).first()
        results.append({
            "application_id": a.application_id,
            "job_id": a.job_id,
            "job_title": job.job_title if job else "Software Engineer",
            "department": job.department if job else "Engineering",
            "application_status": a.application_status,
            "match_score": a.match_score,
            "match_status": a.match_status,
            "match_reasoning": a.match_reasoning,
            "created_at": a.created_at
        })
    return results

@router.get("/job/{job_id}")
def get_job_applications(job_id: str, db: Session = Depends(get_db)):
    apps = db.query(CandidateApplication).filter(CandidateApplication.job_id == job_id).all()
    results = []
    for a in apps:
        cand = db.query(Candidate).filter(Candidate.candidate_id == a.candidate_id).first()
        results.append({
            "application_id": a.application_id,
            "candidate_id": a.candidate_id,
            "candidate_name": cand.full_name if cand else "Unknown",
            "candidate_email": cand.email if cand else "",
            "current_role": cand.current_role if cand else "",
            "experience_years": cand.experience_years if cand else 0.0,
            "application_status": a.application_status,
            "match_score": a.match_score,
            "match_status": a.match_status,
            "created_at": a.created_at
        })
    return results

@router.delete("/{application_id}")
def delete_application(application_id: str, db: Session = Depends(get_db)):
    app = db.query(CandidateApplication).filter(CandidateApplication.application_id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")

    # Cleanly remove any linked assessment session
    session = db.query(AssessmentSession).filter(AssessmentSession.application_id == app.application_id).first()
    if session:
        db.delete(session)

    db.delete(app)
    db.commit()

    return {
        "status": "success",
        "message": "Application removed successfully.",
        "application_id": application_id
    }


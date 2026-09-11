import json
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.schemas import CandidateApplication, AssessmentSession, Candidate, JobOpening, MalpracticeLog, HRDashboard, Interview
from app.services.assessment_engine import assessment_engine

router = APIRouter()

class MalpracticeTerminationRequest(BaseModel):
    violation_count: int = 4
    reason: Optional[str] = "Exceeded maximum allowed proctoring violations (>3 attempts)"

class AssessmentStartRequest(BaseModel):
    application_id: Optional[str] = None
    candidate_id: Optional[str] = None

class AssessmentSubmitRequest(BaseModel):
    answers: Dict[str, Any] # {"aptitude": {...}, "verbal": {...}, "role_mcqs": {...}, "coding": "code string"}

@router.post("/start")
def start_assessment(req: AssessmentStartRequest, db: Session = Depends(get_db)):
    app = None
    if req.application_id:
        app = db.query(CandidateApplication).filter(CandidateApplication.application_id == req.application_id).first()
        if not app:
            raise HTTPException(status_code=404, detail="Application not found.")
    elif req.candidate_id:
        app = db.query(CandidateApplication).filter(
            CandidateApplication.candidate_id == req.candidate_id,
            CandidateApplication.match_status == "shortlisted"
        ).first()
        if not app:
            app = db.query(CandidateApplication).filter(
                CandidateApplication.candidate_id == req.candidate_id
            ).first()
        if not app:
            raise HTTPException(status_code=404, detail="No application found for candidate.")
    else:
        app = db.query(CandidateApplication).filter(CandidateApplication.match_status == "shortlisted").first()
        if not app:
            raise HTTPException(status_code=404, detail="No active application found.")

    if app.match_status != "shortlisted":
        raise HTTPException(
            status_code=403, 
            detail="Assessment is locked. Only shortlisted candidates can access the 55-minute skill assessment."
        )

    # GUARD: Malpractice Disqualification Check
    cand = db.query(Candidate).filter(Candidate.candidate_id == app.candidate_id).first()
    has_malpractice = (
        (cand and cand.is_disqualified) or
        db.query(MalpracticeLog).filter(MalpracticeLog.candidate_id == app.candidate_id).first() is not None or
        db.query(Interview).filter(Interview.candidate_id == app.candidate_id, Interview.status == "malpractice").first() is not None or
        db.query(AssessmentSession).filter(AssessmentSession.candidate_id == app.candidate_id, AssessmentSession.status == "malpractice").first() is not None
    )
    if has_malpractice:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Candidate has been disqualified due to proctoring malpractice. You cannot take or retake this assessment."
        )

    # Check for existing session
    session = db.query(AssessmentSession).filter(AssessmentSession.application_id == app.application_id).first()
    now_utc = datetime.now(timezone.utc)

    job = db.query(JobOpening).filter(JobOpening.job_id == app.job_id).first()
    job_title = job.job_title if job else "Software Engineer"

    if not session:
        session = AssessmentSession(
            application_id=app.application_id,
            candidate_id=app.candidate_id,
            job_id=app.job_id,
            status="in_progress",
            current_section="aptitude",
            started_at=now_utc,
            expires_at=now_utc + timedelta(minutes=55)
        )
        db.add(session)
        app.application_status = "assessment"
        db.commit()
        db.refresh(session)
    elif session.status == "not_started":
        session.status = "in_progress"
        session.started_at = now_utc
        session.expires_at = now_utc + timedelta(minutes=55)
        app.application_status = "assessment"
        db.commit()

    payload = assessment_engine.get_assessment_payload(job_title)

    # Calculate remaining seconds safely with timezone awareness
    remaining_seconds = 55 * 60
    if session.expires_at:
        exp = session.expires_at
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        remaining_seconds = max(0, int((exp - now_utc).total_seconds()))

    is_completed = (session.status in ["completed", "malpractice", "disqualified"])
    is_malpractice = (session.status in ["malpractice", "disqualified"])
    eval_dict = None
    if session.status == "completed":
        eval_dict = {
            "aptitude_score": session.aptitude_score,
            "verbal_score": session.verbal_score,
            "role_mcqs_score": session.role_mcqs_score,
            "coding_score": session.coding_score,
            "total_score": session.total_score
        }

    return {
        "status": "malpractice" if is_malpractice else "success",
        "session_id": session.session_id,
        "application_id": app.application_id,
        "assessment_status": session.status,
        "is_completed": is_completed,
        "is_malpractice": is_malpractice,
        "evaluations": eval_dict,
        "total_duration_minutes": 55,
        "remaining_seconds": 0 if is_completed else remaining_seconds,
        "sections": payload["sections"],
        "saved_answers": json.loads(session.answers_payload) if session.answers_payload else None
    }

@router.get("/{session_id}")
def get_assessment_status(session_id: str, db: Session = Depends(get_db)):
    session = db.query(AssessmentSession).filter(AssessmentSession.session_id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Assessment session not found.")

    job = db.query(JobOpening).filter(JobOpening.job_id == session.job_id).first()
    job_title = job.job_title if job else "Software Engineer"
    payload = assessment_engine.get_assessment_payload(job_title)

    now_utc = datetime.now(timezone.utc)
    remaining_seconds = 55 * 60
    if session.expires_at:
        exp = session.expires_at
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        remaining_seconds = max(0, int((exp - now_utc).total_seconds()))

    return {
        "session_id": session.session_id,
        "status": session.status,
        "started_at": session.started_at,
        "expires_at": session.expires_at,
        "remaining_seconds": remaining_seconds,
        "scores": {
            "aptitude": session.aptitude_score,
            "verbal": session.verbal_score,
            "role_mcqs": session.role_mcqs_score,
            "coding": session.coding_score,
            "total": session.total_score
        } if session.status == "completed" else None,
        "sections": payload["sections"]
    }

@router.post("/{session_id}/submit")
def submit_assessment(session_id: str, req: AssessmentSubmitRequest, db: Session = Depends(get_db)):
    session = db.query(AssessmentSession).filter(AssessmentSession.session_id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Assessment session not found.")

    if session.status == "completed":
        return {
            "status": "already_completed",
            "session_id": session.session_id,
            "is_completed": True,
            "evaluations": {
                "aptitude_score": session.aptitude_score,
                "verbal_score": session.verbal_score,
                "role_mcqs_score": session.role_mcqs_score,
                "coding_score": session.coding_score,
                "total_score": session.total_score
            },
            "message": "Assessment has already been completed and locked. It cannot be edited or resubmitted."
        }

    # Evaluate all 4 sections
    eval_results = assessment_engine.evaluate_submission(req.answers)

    session.status = "completed"
    session.completed_at = datetime.now(timezone.utc)
    session.aptitude_score = eval_results["aptitude_score"]
    session.verbal_score = eval_results["verbal_score"]
    session.role_mcqs_score = eval_results["role_mcqs_score"]
    session.coding_score = eval_results["coding_score"]
    session.total_score = eval_results["total_score"]
    session.coding_submission = req.answers.get("coding", "")
    session.answers_payload = json.dumps(req.answers)

    # Progress application status to 'interview'
    app = db.query(CandidateApplication).filter(CandidateApplication.application_id == session.application_id).first()
    if app:
        app.application_status = "interview"

    db.commit()
    db.refresh(session)

    return {
        "status": "completed",
        "session_id": session.session_id,
        "evaluations": eval_results,
        "next_stage": "interview",
        "message": "Assessment completed successfully. You may now proceed to the 18-question adaptive interview."
    }

@router.post("/{session_id}/terminate-malpractice")
def terminate_for_malpractice(session_id: str, req: Optional[MalpracticeTerminationRequest] = None, db: Session = Depends(get_db)):
    """
    Terminates assessment session when candidate exceeds 3 malpractice attempts (fullscreen/tab violations).
    Marks the session and candidate application as 'malpractice' / disqualified.
    """
    session = db.query(AssessmentSession).filter(AssessmentSession.session_id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Assessment session not found.")

    now_utc = datetime.now(timezone.utc)
    session.status = "malpractice"
    session.completed_at = now_utc
    session.total_score = 0.0

    # Disqualify application
    app = db.query(CandidateApplication).filter(CandidateApplication.application_id == session.application_id).first()
    if app:
        app.application_status = "malpractice"
        app.match_reasoning = "Disqualified: Exceeded 3 proctoring malpractice attempts during skill assessment."

    # Ensure interview record exists to satisfy foreign key
    interview = db.query(Interview).filter(Interview.candidate_id == session.candidate_id).first()
    if not interview:
        interview = Interview(
            candidate_id=session.candidate_id,
            job_id=session.job_id,
            interview_mode="text",
            status="terminated"
        )
        db.add(interview)
        db.flush()

    candidate = db.query(Candidate).filter(Candidate.candidate_id == session.candidate_id).first()
    if candidate:
        candidate.is_disqualified = True
        candidate.disqualification_reason = "Disqualified: Exceeded 3 proctoring malpractice attempts during skill assessment."
    cand_name = candidate.full_name if candidate else "Candidate"

    # Log malpractice incident
    v_count = req.violation_count if req else 4
    reason_str = req.reason if req and req.reason else "Exceeded maximum allowed proctoring violations (>3 attempts)"
    mlog = MalpracticeLog(
        interview_id=interview.interview_id,
        candidate_id=session.candidate_id,
        candidate_name=cand_name,
        violation_type=f"Assessment Malpractice Disqualification: {reason_str} ({v_count} attempts)",
        severity="high",
        details="Candidate exceeded 3 proctoring violation attempts during 55-minute skill assessment (fullscreen exit / tab switch).",
        snapshot_base64=None,
        created_at=now_utc
    )
    db.add(mlog)

    # Sync report & HR Dashboard record if report exists
    from app.models.schemas import Report
    report = db.query(Report).filter(Report.candidate_id == session.candidate_id).first()
    if report:
        report.malpractice_count = (report.malpractice_count or 0) + 1
        report.integrity_score = max(0.0, (report.integrity_score or 100.0) - 30.0)
        hr_entry = db.query(HRDashboard).filter(HRDashboard.report_id == report.report_id).first()
        if hr_entry:
            hr_entry.has_malpractice_flag = True

    db.commit()
    db.refresh(session)

    return {
        "status": "malpractice_terminated",
        "session_id": session.session_id,
        "is_completed": True,
        "is_malpractice": True,
        "message": "Assessment terminated due to exceeding 3 malpractice violations. Candidate marked as Malpractice."
    }

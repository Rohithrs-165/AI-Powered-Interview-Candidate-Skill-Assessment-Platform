from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.schemas import Report, SkillAssessment, Interview, Candidate, CandidatePortal
from app.api.v1.interviews import get_interview_summary

router = APIRouter()

@router.get("/{report_id}")
def get_report_details(report_id: str, db: Session = Depends(get_db)):
    report = db.query(Report).filter(Report.report_id == report_id).first()
    if not report:
        # Fallback to lookup by interview_id or candidate_id directly
        return get_interview_summary(report_id, db)

    return get_interview_summary(report.interview_id, db)



@router.get("/candidate/{candidate_id}/latest")
def get_candidate_latest_report(candidate_id: str, db: Session = Depends(get_db)):
    report = db.query(Report).filter(Report.candidate_id == candidate_id).order_by(Report.report_id.desc()).first()
    if not report:
        raise HTTPException(status_code=404, detail="No report found for candidate.")
    return get_report_details(report.report_id, db)

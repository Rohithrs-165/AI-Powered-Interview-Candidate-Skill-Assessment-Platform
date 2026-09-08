"""
Enterprise Demo Data Seeder for Neurova AI Platform
Seeds active job openings, diverse candidates across all pipeline stages,
assessments, 18-question interviews, evaluations, reports, malpractice logs, and HR reviews.
Provides an immediate, complete presentation state for internship evaluation.
"""
import os
import sys
from datetime import datetime, timezone, timedelta

# Ensure backend path is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal, Base, engine
from app.models.schemas import (
    Candidate, Authentication, Resume, ResumeAnalysis,
    JobOpening, CandidateApplication, AssessmentSession,
    Interview, Question, Answer, Evaluation,
    InterviewCompletion, SkillAssessment, Report,
    HRDashboard, FinalHRReview, MalpracticeLog
)
from app.core.security import get_password_hash

def seed_demo_data():
    db = SessionLocal()
    try:
        print("\n" + "=" * 80)
        print("[SEEDING] Seeding Neurova AI Two-Portal Platform Demo Data...")
        print("=" * 80)

        # 1. Job Openings
        jobs_data = [
            {
                "title": "Full Stack AI Engineer",
                "desc": "Architect next-generation AI agent platforms with FastAPI, Next.js, and PyTorch. Build low-latency speech, OCR, and multi-tenant pipelines.",
                "skills": "Python, FastAPI, Next.js, TypeScript, PostgreSQL, PyTorch, LangChain, WebSockets",
                "min_exp": 1.0, "max_exp": 4.0, "dept": "AI & Engineering", "loc": "San Francisco, CA / Remote"
            },
            {
                "title": "Senior Backend Python Architect",
                "desc": "Scale high-throughput asynchronous microservices, PostgreSQL indexing, Redis caching, and real-time Kafka / Celery data pipelines.",
                "skills": "Python, FastAPI, AsyncIO, PostgreSQL, Redis, Docker, Kubernetes, System Design, SQL",
                "min_exp": 3.0, "max_exp": 8.0, "dept": "Core Platform", "loc": "New York, NY / Hybrid"
            },
            {
                "title": "DevOps & Cloud Infrastructure Lead",
                "desc": "Lead cloud reliability, Terraform infrastructure-as-code, multi-region Kubernetes clusters, and zero-downtime CI/CD pipelines.",
                "skills": "Docker, Kubernetes, AWS, Terraform, CI/CD, Prometheus, Grafana, Linux, Helm",
                "min_exp": 2.0, "max_exp": 6.0, "dept": "Cloud Infrastructure", "loc": "Austin, TX / Remote"
            },
            {
                "title": "Senior Frontend Engineer (React / Next.js)",
                "desc": "Craft high-performance reactive web interfaces, WebRTC video/audio proctoring streams, and interactive Tailwind design systems.",
                "skills": "React, Next.js, TypeScript, Tailwind CSS, WebRTC, Redux, HTML5 Canvas, REST APIs",
                "min_exp": 1.5, "max_exp": 5.0, "dept": "Frontend Engineering", "loc": "Remote"
            }
        ]

        jobs_map = {}
        for jd in jobs_data:
            existing = db.query(JobOpening).filter(JobOpening.job_title == jd["title"]).first()
            if not existing:
                existing = JobOpening(
                    job_title=jd["title"],
                    job_description=jd["desc"],
                    required_skills=jd["skills"],
                    experience_min=jd["min_exp"],
                    experience_max=jd["max_exp"],
                    department=jd["dept"],
                    location=jd["loc"],
                    status="active"
                )
                db.add(existing)
                db.commit()
                db.refresh(existing)
            jobs_map[jd["title"]] = existing
            print(f"  [JOB] Active Opening: {existing.job_title} (ID: {existing.job_id[:8]}...)")

        # 2. Candidates & Pipeline Scenarios
        pw_hash = get_password_hash("Password123!")

        candidates_data = [
            {
                "name": "Rohith R S",
                "email": "rohith.rs@neurova.ai",
                "role": "Full Stack AI Engineer",
                "exp": 3.5,
                "education": "B.E. Computer Science & Engineering",
                "phone": "+91 98765 43210",
                "target_job": "Full Stack AI Engineer",
                "match_score": 98.0,
                "match_status": "shortlisted",
                "app_status": "selected",
                "assessment_scores": {"apt": 100.0, "verb": 100.0, "role": 100.0, "code": 95.0, "total": 98.75},
                "interview_score": 95.4,
                "integrity_score": 100.0,
                "final_decision": "selected",
                "hr_comment": "Exceptional technical depth across Python ASGI, Next.js hydration, and multi-tenant distributed architecture. Unanimously approved for senior offer.",
                "malpractice": []
            },
            {
                "name": "Elena Rostova",
                "email": "elena.rostova@techmail.io",
                "role": "Senior Backend Architect",
                "exp": 5.0,
                "education": "M.S. in Software Systems",
                "phone": "+1 (555) 234-5678",
                "target_job": "Senior Backend Python Architect",
                "match_score": 94.0,
                "match_status": "shortlisted",
                "app_status": "hr_review",
                "assessment_scores": {"apt": 90.0, "verb": 100.0, "role": 90.0, "code": 90.0, "total": 92.5},
                "interview_score": 91.2,
                "integrity_score": 100.0,
                "final_decision": "pending",
                "hr_comment": "Strong mastery of distributed transactions and database optimization. Awaiting final compensation committee signoff.",
                "malpractice": []
            },
            {
                "name": "Marcus Chen",
                "email": "marcus.chen@clouddev.org",
                "role": "DevOps & Cloud Engineer",
                "exp": 4.0,
                "education": "B.S. in Information Technology",
                "phone": "+1 (555) 345-6789",
                "target_job": "DevOps & Cloud Infrastructure Lead",
                "match_score": 86.0,
                "match_status": "shortlisted",
                "app_status": "hr_review",
                "assessment_scores": {"apt": 80.0, "verb": 80.0, "role": 85.0, "code": 85.0, "total": 82.5},
                "interview_score": 82.0,
                "integrity_score": 70.0, # 2 violations
                "final_decision": "pending",
                "hr_comment": "High technical competence in Kubernetes, but two malpractice events logged (camera multi-face and browser unfocus). Candidate scheduled for secondary proctored check.",
                "malpractice": [
                    {
                        "type": "window_blur",
                        "severity": "medium",
                        "details": "Browser window tab lost focus for 14 seconds during adaptive technical question #11.",
                        "date_offset_days": 1
                    },
                    {
                        "type": "multiple_faces",
                        "severity": "high",
                        "details": "Secondary face detected in background near candidate frame for 8 seconds.",
                        "date_offset_days": 0
                    }
                ]
            },
            {
                "name": "Sarah Jenkins",
                "email": "sarah.jenkins@webcraft.com",
                "role": "Frontend React Engineer",
                "exp": 2.5,
                "education": "B.S. in Computer Engineering",
                "phone": "+1 (555) 456-7890",
                "target_job": "Senior Frontend Engineer (React / Next.js)",
                "match_score": 89.0,
                "match_status": "shortlisted",
                "app_status": "assessment",
                "assessment_scores": {"apt": 90.0, "verb": 80.0, "role": 95.0, "code": 90.0, "total": 88.75},
                "interview_score": None,
                "integrity_score": 100.0,
                "final_decision": "pending",
                "hr_comment": "Assessment successfully passed with 88.75%. 18-Question Interview invitation dispatched.",
                "malpractice": []
            },
            {
                "name": "David Kim",
                "email": "david.kim@datasys.io",
                "role": "Associate Junior Developer",
                "exp": 0.8,
                "education": "B.A. in Mathematics",
                "phone": "+1 (555) 567-8901",
                "target_job": "Full Stack AI Engineer",
                "match_score": 42.0,
                "match_status": "not_shortlisted",
                "app_status": "rejected",
                "assessment_scores": None,
                "interview_score": None,
                "integrity_score": 100.0,
                "final_decision": "rejected",
                "hr_comment": "Insufficient hands-on experience in full-stack Python/Next.js production systems. Encouraged to reapply next cycle.",
                "malpractice": []
            }
        ]

        now = datetime.now(timezone.utc)

        for c_data in candidates_data:
            cand = db.query(Candidate).filter(Candidate.email == c_data["email"]).first()
            if not cand:
                cand = Candidate(
                    full_name=c_data["name"],
                    email=c_data["email"],
                    password_hash=pw_hash,
                    phone=c_data["phone"],
                    current_role=c_data["role"],
                    experience_years=c_data["exp"],
                    education=c_data["education"]
                )
                db.add(cand)
                db.commit()
                db.refresh(cand)
            else:
                cand.full_name = c_data["name"]
                cand.current_role = c_data["role"]
                cand.experience_years = c_data["exp"]
                cand.education = c_data["education"]
                db.commit()

            target_job = jobs_map[c_data["target_job"]]

            # Application
            app = db.query(CandidateApplication).filter(
                CandidateApplication.candidate_id == cand.candidate_id,
                CandidateApplication.job_id == target_job.job_id
            ).first()

            if not app:
                app = CandidateApplication(
                    candidate_id=cand.candidate_id,
                    job_id=target_job.job_id,
                    match_score=c_data["match_score"],
                    match_status=c_data["match_status"],
                    application_status=c_data["app_status"],
                    match_reasoning=f"Candidate has {c_data['exp']} years of experience matching key requirements in {target_job.required_skills.split(',')[0]}."
                )
                db.add(app)
                db.commit()
                db.refresh(app)
            else:
                app.match_score = c_data["match_score"]
                app.match_status = c_data["match_status"]
                app.application_status = c_data["app_status"]
                db.commit()

            # Assessment
            if c_data["assessment_scores"]:
                ass = db.query(AssessmentSession).filter(AssessmentSession.application_id == app.application_id).first()
                if not ass:
                    sc = c_data["assessment_scores"]
                    ass = AssessmentSession(
                        application_id=app.application_id,
                        candidate_id=cand.candidate_id,
                        job_id=target_job.job_id,
                        status="completed",
                        current_section="coding",
                        aptitude_score=sc["apt"],
                        verbal_score=sc["verb"],
                        role_mcqs_score=sc["role"],
                        coding_score=sc["code"],
                        total_score=sc["total"],
                        started_at=now - timedelta(days=2),
                        completed_at=now - timedelta(days=2) + timedelta(minutes=48)
                    )
                    db.add(ass)
                    db.commit()

            # Interview & Report
            if c_data["interview_score"] is not None:
                inter = db.query(Interview).filter(
                    Interview.candidate_id == cand.candidate_id,
                    Interview.job_id == target_job.job_id
                ).first()

                if not inter:
                    inter = Interview(
                        candidate_id=cand.candidate_id,
                        job_id=target_job.job_id,
                        interview_mode="voice",
                        status="completed",
                        overall_score=c_data["interview_score"],
                        integrity_score=c_data["integrity_score"],
                        started_at=now - timedelta(days=1),
                        completed_at=now - timedelta(days=1) + timedelta(minutes=32)
                    )
                    db.add(inter)
                    db.commit()
                    db.refresh(inter)
                else:
                    inter.overall_score = c_data["interview_score"]
                    inter.integrity_score = c_data["integrity_score"]
                    inter.status = "completed"
                    db.commit()

                # Malpractice logs
                for m in c_data["malpractice"]:
                    log_date = now - timedelta(days=m["date_offset_days"])
                    existing_log = db.query(MalpracticeLog).filter(
                        MalpracticeLog.candidate_id == cand.candidate_id,
                        MalpracticeLog.violation_type == m["type"]
                    ).first()
                    if not existing_log:
                        mlog = MalpracticeLog(
                            interview_id=inter.interview_id,
                            candidate_id=cand.candidate_id,
                            candidate_name=cand.full_name,
                            violation_type=m["type"],
                            severity=m["severity"],
                            details=m["details"],
                            created_at=log_date
                        )
                        db.add(mlog)
                        db.commit()

                # Report
                rep = db.query(Report).filter(Report.candidate_id == cand.candidate_id).first()
                if not rep:
                    rep = Report(
                        candidate_id=cand.candidate_id,
                        interview_id=inter.interview_id,
                        summary=f"{cand.full_name} demonstrated mastery in {target_job.job_title} principles.",
                        strengths="Algorithmic problem solving, async design patterns, clean architectural separation.",
                        weaknesses="Minor edge case parameter boundary testing.",
                        overall_score=c_data["interview_score"],
                        integrity_score=c_data["integrity_score"],
                        malpractice_count=len(c_data["malpractice"])
                    )
                    db.add(rep)
                    db.commit()
                    db.refresh(rep)

                # HR Dashboard & Review
                dash = db.query(HRDashboard).filter(HRDashboard.report_id == rep.report_id).first()
                if not dash:
                    dash = HRDashboard(
                        report_id=rep.report_id,
                        viewed_by_hr=True,
                        review_status=c_data["final_decision"],
                        hr_comments=c_data["hr_comment"],
                        has_malpractice_flag=len(c_data["malpractice"]) > 0
                    )
                    db.add(dash)
                    db.commit()

                rev = db.query(FinalHRReview).filter(FinalHRReview.candidate_id == cand.candidate_id).first()
                if not rev:
                    rev = FinalHRReview(
                        report_id=rep.report_id,
                        candidate_id=cand.candidate_id,
                        final_decision=c_data["final_decision"],
                        hr_comments=c_data["hr_comment"],
                        reviewed_by="Executive Talent Committee",
                        email_sent=True if c_data["final_decision"] in ["selected", "rejected"] else False,
                        reviewed_at=now
                    )
                    db.add(rev)
                    db.commit()

            print(f"  [CANDIDATE] {cand.full_name} ({cand.email}) -> Status: {c_data['app_status'].upper()} | Decision: {c_data['final_decision'].upper()}")

        print("=" * 80)
        print("[SUCCESS] Demo Data Seeding Complete! System is in pristine state for evaluation.")
        print("=" * 80)

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Seeding failed: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_demo_data()

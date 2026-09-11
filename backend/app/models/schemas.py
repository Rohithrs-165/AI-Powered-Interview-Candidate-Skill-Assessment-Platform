import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, Text, ForeignKey, DateTime
)
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

def get_utc_now():
    return datetime.now(timezone.utc)

# 1. Candidates
class Candidate(Base):
    __tablename__ = "candidates"

    candidate_id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    full_name = Column(String(150), nullable=False)
    email = Column(String(150), unique=True, nullable=False, index=True)
    phone = Column(String(30), nullable=True)
    password_hash = Column(String(255), nullable=False)
    current_role = Column(String(100), nullable=True)
    experience_years = Column(Float, default=0.0)
    experience_choice = Column(String(50), nullable=True) # e.g. '0-1 years', '1-3 years', '3-5 years', '5+ years'
    education = Column(String(255), nullable=True) # e.g. 'B.Tech in Computer Science'
    certifications = Column(Text, nullable=True) # e.g. 'AWS Certified Developer, CKA'
    internship_details = Column(Text, nullable=True) # Internship highlights
    is_disqualified = Column(Boolean, default=False)
    disqualification_reason = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=get_utc_now)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)

    # Relationships
    auth_records = relationship("Authentication", back_populates="candidate", cascade="all, delete-orphan")
    resumes = relationship("Resume", back_populates="candidate", cascade="all, delete-orphan")
    resume_analyses = relationship("ResumeAnalysis", back_populates="candidate", cascade="all, delete-orphan")
    applications = relationship("CandidateApplication", back_populates="candidate", cascade="all, delete-orphan")
    interviews = relationship("Interview", back_populates="candidate", cascade="all, delete-orphan")
    assessment_sessions = relationship("AssessmentSession", back_populates="candidate", cascade="all, delete-orphan")
    skill_assessments = relationship("SkillAssessment", back_populates="candidate", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="candidate", cascade="all, delete-orphan")
    hr_reviews = relationship("FinalHRReview", back_populates="candidate", cascade="all, delete-orphan")
    portal_views = relationship("CandidatePortal", back_populates="candidate", cascade="all, delete-orphan")
    malpractice_logs = relationship("MalpracticeLog", back_populates="candidate", cascade="all, delete-orphan")

# 2. Authentication
class Authentication(Base):
    __tablename__ = "authentication"

    auth_id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    candidate_id = Column(String(36), ForeignKey("candidates.candidate_id", ondelete="CASCADE"), nullable=True)
    email = Column(String(150), nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    otp = Column(String(10), nullable=True)
    is_verified = Column(Boolean, default=False)
    role = Column(String(20), default="candidate") # 'candidate', 'hr'
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=get_utc_now)

    candidate = relationship("Candidate", back_populates="auth_records")

# 3. Resume
class Resume(Base):
    __tablename__ = "resume"

    resume_id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    candidate_id = Column(String(36), ForeignKey("candidates.candidate_id", ondelete="CASCADE"), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_type = Column(String(50), nullable=False)
    extracted_text = Column(Text, nullable=True)

    candidate = relationship("Candidate", back_populates="resumes")
    analysis = relationship("ResumeAnalysis", back_populates="resume", uselist=False, cascade="all, delete-orphan")

# 4. Resume_Analysis
class ResumeAnalysis(Base):
    __tablename__ = "resume_analysis"

    analysis_id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    resume_id = Column(String(36), ForeignKey("resume.resume_id", ondelete="CASCADE"), nullable=False)
    candidate_id = Column(String(36), ForeignKey("candidates.candidate_id", ondelete="CASCADE"), nullable=False)
    summary = Column(Text, nullable=True)
    skills = Column(Text, nullable=True)
    experience_summary = Column(Text, nullable=True)
    education_summary = Column(Text, nullable=True)
    key_projects = Column(Text, nullable=True)
    certifications = Column(Text, nullable=True)

    resume = relationship("Resume", back_populates="analysis")
    candidate = relationship("Candidate", back_populates="resume_analyses")

# 5. Job_Openings (Blueprint Entity)
class JobOpening(Base):
    __tablename__ = "job_openings"

    job_id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    job_title = Column(String(150), nullable=False)
    job_description = Column(Text, nullable=False)
    required_skills = Column(Text, nullable=False) # JSON list or comma separated
    experience_min = Column(Float, default=0.0)
    experience_max = Column(Float, default=5.0)
    department = Column(String(100), default="Engineering")
    location = Column(String(100), default="Remote / Hybrid")
    status = Column(String(20), default="active") # 'active', 'closed'
    created_at = Column(DateTime, default=get_utc_now)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)

    applications = relationship("CandidateApplication", back_populates="job", cascade="all, delete-orphan")
    interviews = relationship("Interview", back_populates="job")
    assessment_sessions = relationship("AssessmentSession", back_populates="job")

# 6. Candidate_Applications (Blueprint Entity)
class CandidateApplication(Base):
    __tablename__ = "candidate_applications"

    application_id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    candidate_id = Column(String(36), ForeignKey("candidates.candidate_id", ondelete="CASCADE"), nullable=False)
    job_id = Column(String(36), ForeignKey("job_openings.job_id", ondelete="CASCADE"), nullable=False)
    match_score = Column(Float, default=0.0)
    match_status = Column(String(30), default="pending") # 'shortlisted', 'not_shortlisted', 'pending'
    match_reasoning = Column(Text, nullable=True)
    matched_skills = Column(Text, nullable=True)
    missing_skills = Column(Text, nullable=True)
    # Critical Status Model: APPLIED -> MATCHING -> SHORTLISTED/NOT_SHORTLISTED -> ASSESSMENT -> INTERVIEW -> HR_REVIEW -> SELECTED/REJECTED
    application_status = Column(String(30), default="applied")
    created_at = Column(DateTime, default=get_utc_now)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)

    candidate = relationship("Candidate", back_populates="applications")
    job = relationship("JobOpening", back_populates="applications")
    assessment_session = relationship("AssessmentSession", back_populates="application", uselist=False)

# 7. Assessment_Sessions (55-minute Assessment specification)
class AssessmentSession(Base):
    __tablename__ = "assessment_sessions"

    session_id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    application_id = Column(String(36), ForeignKey("candidate_applications.application_id", ondelete="CASCADE"), nullable=False)
    candidate_id = Column(String(36), ForeignKey("candidates.candidate_id", ondelete="CASCADE"), nullable=False)
    job_id = Column(String(36), ForeignKey("job_openings.job_id", ondelete="CASCADE"), nullable=False)
    status = Column(String(30), default="not_started") # 'not_started', 'in_progress', 'completed'
    current_section = Column(String(30), default="aptitude") # 'aptitude', 'verbal', 'role_mcqs', 'coding'
    started_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    aptitude_score = Column(Float, default=0.0)
    verbal_score = Column(Float, default=0.0)
    role_mcqs_score = Column(Float, default=0.0)
    coding_score = Column(Float, default=0.0)
    total_score = Column(Float, default=0.0)
    coding_submission = Column(Text, nullable=True)
    answers_payload = Column(Text, nullable=True)

    application = relationship("CandidateApplication", back_populates="assessment_session")
    candidate = relationship("Candidate", back_populates="assessment_sessions")
    job = relationship("JobOpening", back_populates="assessment_sessions")

# 8. Interviews (Updated with job_id)
class Interview(Base):
    __tablename__ = "interviews"

    interview_id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    candidate_id = Column(String(36), ForeignKey("candidates.candidate_id", ondelete="CASCADE"), nullable=False)
    job_id = Column(String(36), ForeignKey("job_openings.job_id", ondelete="SET NULL"), nullable=True)
    interview_mode = Column(String(20), default="text")
    status = Column(String(30), default="not_started") # 'not_started', 'in_progress', 'completed'
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    overall_score = Column(Float, default=0.0)
    integrity_score = Column(Float, default=100.0)

    candidate = relationship("Candidate", back_populates="interviews")
    job = relationship("JobOpening", back_populates="interviews")
    questions = relationship("Question", back_populates="interview", cascade="all, delete-orphan")
    answers = relationship("Answer", back_populates="interview", cascade="all, delete-orphan")
    adaptive_logs = relationship("AdaptiveInterview", back_populates="interview", cascade="all, delete-orphan")
    completion = relationship("InterviewCompletion", back_populates="interview", uselist=False, cascade="all, delete-orphan")
    skill_assessments = relationship("SkillAssessment", back_populates="interview", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="interview", cascade="all, delete-orphan")
    malpractice_logs = relationship("MalpracticeLog", back_populates="interview", cascade="all, delete-orphan")

# 9. Questions (18 Questions total: 3 assessment-based, 5 JD-based, 10 adaptive skills)
class Question(Base):
    __tablename__ = "questions"

    question_id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    interview_id = Column(String(36), ForeignKey("interviews.interview_id", ondelete="CASCADE"), nullable=False)
    question_text = Column(Text, nullable=False)
    question_source = Column(String(50), default="adaptive") # 'assessment_derived', 'jd_derived', 'adaptive_skill'
    question_type = Column(String(50), default="technical")
    skill_area = Column(String(100), nullable=False)
    difficulty_level = Column(String(20), default="medium")
    question_order = Column(Integer, default=1)

    interview = relationship("Interview", back_populates="questions")
    answers = relationship("Answer", back_populates="question", cascade="all, delete-orphan")
    evaluations = relationship("Evaluation", back_populates="question", cascade="all, delete-orphan")

# 10. Answers
class Answer(Base):
    __tablename__ = "answers"

    answer_id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    interview_id = Column(String(36), ForeignKey("interviews.interview_id", ondelete="CASCADE"), nullable=False)
    question_id = Column(String(36), ForeignKey("questions.question_id", ondelete="CASCADE"), nullable=False)
    answer_type = Column(String(20), default="text")
    answer_text = Column(Text, nullable=False)
    audio_file_path = Column(String(500), nullable=True)
    answered_at = Column(DateTime, default=get_utc_now)

    interview = relationship("Interview", back_populates="answers")
    question = relationship("Question", back_populates="answers")
    evaluation = relationship("Evaluation", back_populates="answer", uselist=False, cascade="all, delete-orphan")
    adaptive_log = relationship("AdaptiveInterview", back_populates="answer", uselist=False)

# 11. Evaluations
class Evaluation(Base):
    __tablename__ = "evaluations"

    evaluation_id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    answer_id = Column(String(36), ForeignKey("answers.answer_id", ondelete="CASCADE"), nullable=False)
    question_id = Column(String(36), ForeignKey("questions.question_id", ondelete="CASCADE"), nullable=False)
    accuracy_score = Column(Float, default=0.0)
    relevance_score = Column(Float, default=0.0)
    technical_score = Column(Float, default=0.0)
    communication_score = Column(Float, default=0.0)
    overall_score = Column(Float, default=0.0)

    answer = relationship("Answer", back_populates="evaluation")
    question = relationship("Question", back_populates="evaluations")

# 12. Adaptive_Interview
class AdaptiveInterview(Base):
    __tablename__ = "adaptive_interview"

    adaptive_id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    interview_id = Column(String(36), ForeignKey("interviews.interview_id", ondelete="CASCADE"), nullable=False)
    question_id = Column(String(36), ForeignKey("questions.question_id", ondelete="CASCADE"), nullable=False)
    answer_id = Column(String(36), ForeignKey("answers.answer_id", ondelete="CASCADE"), nullable=False)
    previous_difficulty = Column(String(20), nullable=False)
    next_difficulty = Column(String(20), nullable=False)
    decision_type = Column(String(30), nullable=False)
    decision_reason = Column(Text, nullable=True)
    next_question_id = Column(String(36), ForeignKey("questions.question_id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=get_utc_now)

    interview = relationship("Interview", back_populates="adaptive_logs")
    answer = relationship("Answer", back_populates="adaptive_log")

# 13. Interview_Completion
class InterviewCompletion(Base):
    __tablename__ = "interview_completion"

    completion_id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    interview_id = Column(String(36), ForeignKey("interviews.interview_id", ondelete="CASCADE"), nullable=False)
    total_questions = Column(Integer, default=18)
    answered_questions = Column(Integer, default=0)
    skipped_questions = Column(Integer, default=0)
    interview_duration = Column(Integer, default=0)
    completion_score = Column(Float, default=0.0)

    interview = relationship("Interview", back_populates="completion")

# 14. Skill_Assessments
class SkillAssessment(Base):
    __tablename__ = "skill_assessments"

    assessment_id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    interview_id = Column(String(36), ForeignKey("interviews.interview_id", ondelete="CASCADE"), nullable=False)
    candidate_id = Column(String(36), ForeignKey("candidates.candidate_id", ondelete="CASCADE"), nullable=False)
    skill_name = Column(String(100), nullable=False)
    score = Column(Float, default=0.0)
    strengths = Column(Text, nullable=True)
    weaknesses = Column(Text, nullable=True)
    skill_gap = Column(Text, nullable=True)

    interview = relationship("Interview", back_populates="skill_assessments")
    candidate = relationship("Candidate", back_populates="skill_assessments")

# 15. Reports
class Report(Base):
    __tablename__ = "reports"

    report_id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    candidate_id = Column(String(36), ForeignKey("candidates.candidate_id", ondelete="CASCADE"), nullable=False)
    interview_id = Column(String(36), ForeignKey("interviews.interview_id", ondelete="CASCADE"), nullable=False)
    assessment_id = Column(String(36), ForeignKey("skill_assessments.assessment_id", ondelete="SET NULL"), nullable=True)
    summary = Column(Text, nullable=True)
    strengths = Column(Text, nullable=True)
    weaknesses = Column(Text, nullable=True)
    skill_gaps = Column(Text, nullable=True)
    overall_score = Column(Float, default=0.0)
    integrity_score = Column(Float, default=100.0)
    malpractice_count = Column(Integer, default=0)
    report_file_path = Column(String(500), nullable=True)

    candidate = relationship("Candidate", back_populates="reports")
    interview = relationship("Interview", back_populates="reports")
    hr_dashboard_entries = relationship("HRDashboard", back_populates="report", cascade="all, delete-orphan")
    final_hr_reviews = relationship("FinalHRReview", back_populates="report", cascade="all, delete-orphan")
    candidate_portal_entries = relationship("CandidatePortal", back_populates="report", cascade="all, delete-orphan")

# 16. HR_Dashboard
class HRDashboard(Base):
    __tablename__ = "hr_dashboard"

    dashboard_id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    report_id = Column(String(36), ForeignKey("reports.report_id", ondelete="CASCADE"), nullable=False)
    viewed_by_hr = Column(Boolean, default=False)
    review_status = Column(String(50), default="pending")
    has_malpractice_flag = Column(Boolean, default=False)
    hr_comments = Column(Text, nullable=True)

    report = relationship("Report", back_populates="hr_dashboard_entries")

# 17. Final_HR_Review (Select / Reject with Real-time Email)
class FinalHRReview(Base):
    __tablename__ = "final_hr_review"

    review_id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    report_id = Column(String(36), ForeignKey("reports.report_id", ondelete="CASCADE"), nullable=False)
    candidate_id = Column(String(36), ForeignKey("candidates.candidate_id", ondelete="CASCADE"), nullable=False)
    final_decision = Column(String(50), default="pending") # 'selected', 'rejected', 'pending'
    hr_comments = Column(Text, nullable=True)
    reviewed_by = Column(String(100), nullable=True)
    email_sent = Column(Boolean, default=False)
    reviewed_at = Column(DateTime, default=get_utc_now)

    report = relationship("Report", back_populates="final_hr_reviews")
    candidate = relationship("Candidate", back_populates="hr_reviews")
    candidate_portal_entries = relationship("CandidatePortal", back_populates="review", cascade="all, delete-orphan")

# 18. Candidate_Portal
class CandidatePortal(Base):
    __tablename__ = "candidate_portal"

    portal_id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    candidate_id = Column(String(36), ForeignKey("candidates.candidate_id", ondelete="CASCADE"), nullable=False)
    report_id = Column(String(36), ForeignKey("reports.report_id", ondelete="CASCADE"), nullable=False)
    review_id = Column(String(36), ForeignKey("final_hr_review.review_id", ondelete="CASCADE"), nullable=True)
    viewed_at = Column(DateTime, nullable=True)
    result_status = Column(String(50), default="released")

    candidate = relationship("Candidate", back_populates="portal_views")
    report = relationship("Report", back_populates="candidate_portal_entries")
    review = relationship("FinalHRReview", back_populates="candidate_portal_entries")

# 19. Malpractice_Log (AI Proctoring Evidence Table)
class MalpracticeLog(Base):
    __tablename__ = "malpractice_logs"

    log_id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    interview_id = Column(String(36), ForeignKey("interviews.interview_id", ondelete="CASCADE"), nullable=False)
    candidate_id = Column(String(36), ForeignKey("candidates.candidate_id", ondelete="CASCADE"), nullable=False)
    candidate_name = Column(String(150), nullable=False)
    violation_type = Column(String(100), nullable=False)
    severity = Column(String(20), default="high")
    snapshot_base64 = Column(Text, nullable=True)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=get_utc_now)

    candidate = relationship("Candidate", back_populates="malpractice_logs")
    interview = relationship("Interview", back_populates="malpractice_logs")

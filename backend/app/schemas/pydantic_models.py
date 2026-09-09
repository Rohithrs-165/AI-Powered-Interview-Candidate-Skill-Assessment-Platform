from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime

try:
    import email_validator
    from pydantic import EmailStr
except ImportError:
    EmailStr = str

# 1. Candidate Schemas
class CandidateBase(BaseModel):
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    current_role: Optional[str] = None
    experience_years: Optional[float] = 0.0
    experience_choice: Optional[str] = None
    education: Optional[str] = None
    certifications: Optional[str] = None
    internship_details: Optional[str] = None

class CandidateCreate(CandidateBase):
    password: str

class CandidateOut(CandidateBase):
    candidate_id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

# 2. Auth Schemas
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class OTPVerifyRequest(BaseModel):
    email: EmailStr
    otp: str

class ResendOTPRequest(BaseModel):
    email: EmailStr

class TokenResponse(BaseModel):
    access_token: Optional[str] = ""
    token_type: str = "bearer"
    candidate: Optional[CandidateOut] = None
    role: str = "candidate"
    requires_otp: bool = False
    email: Optional[str] = None
    message: Optional[str] = None

# 3. Resume Schemas
class ResumeOut(BaseModel):
    resume_id: str
    candidate_id: str
    file_name: str
    file_path: str
    file_type: str
    extracted_text: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

# 4. Resume Analysis Schemas
class ResumeAnalysisOut(BaseModel):
    analysis_id: str
    resume_id: str
    candidate_id: str
    summary: Optional[str] = None
    skills: Optional[List[str]] = []
    experience_summary: Optional[str] = None
    education_summary: Optional[str] = None
    key_projects: Optional[List[Dict[str, Any]]] = []
    certifications: Optional[List[str]] = []

    model_config = ConfigDict(from_attributes=True)

# 5. Interview Schemas
class InterviewStartRequest(BaseModel):
    interview_mode: str = "text"  # 'text' or 'voice'
    target_role: Optional[str] = "Full Stack Engineer"
    primary_skills: Optional[List[str]] = ["Python", "FastAPI", "Next.js", "PostgreSQL"]
    candidate_id: Optional[str] = None
    candidate_name: Optional[str] = None

class InterviewOut(BaseModel):
    interview_id: str
    candidate_id: str
    interview_mode: str
    status: str
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    overall_score: float = 0.0

    model_config = ConfigDict(from_attributes=True)

# 6. Question Schemas
class QuestionOut(BaseModel):
    question_id: str
    interview_id: str
    question_text: str
    question_type: str
    skill_area: str
    difficulty_level: str
    question_order: int

    model_config = ConfigDict(from_attributes=True)

# 7. Answer Schemas
class AnswerSubmitRequest(BaseModel):
    question_id: str
    answer_text: str
    answer_type: str = "text"  # 'text' or 'voice'
    audio_base64: Optional[str] = None

class AnswerOut(BaseModel):
    answer_id: str
    interview_id: str
    question_id: str
    answer_type: str
    answer_text: str
    audio_file_path: Optional[str] = None
    answered_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

# 8. Evaluation Schemas
class EvaluationOut(BaseModel):
    evaluation_id: str
    answer_id: str
    question_id: str
    accuracy_score: float
    relevance_score: float
    technical_score: float
    communication_score: float
    overall_score: float

    model_config = ConfigDict(from_attributes=True)

# 9. Adaptive Interview Schemas
class AdaptiveInterviewOut(BaseModel):
    adaptive_id: str
    interview_id: str
    question_id: str
    answer_id: str
    previous_difficulty: str
    next_difficulty: str
    decision_type: str
    decision_reason: Optional[str] = None
    next_question_id: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

# 10. Interview Completion Schemas
class InterviewCompletionOut(BaseModel):
    completion_id: str
    interview_id: str
    total_questions: int
    answered_questions: int
    skipped_questions: int
    interview_duration: int
    completion_score: float

    model_config = ConfigDict(from_attributes=True)

# 11. Skill Assessment Schemas
class SkillAssessmentOut(BaseModel):
    assessment_id: str
    interview_id: str
    candidate_id: str
    skill_name: str
    score: float
    strengths: Optional[str] = None
    weaknesses: Optional[str] = None
    skill_gap: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

# 12. Report Schemas
class ReportOut(BaseModel):
    report_id: str
    candidate_id: str
    interview_id: str
    assessment_id: Optional[str] = None
    summary: Optional[str] = None
    strengths: Optional[str] = None
    weaknesses: Optional[str] = None
    skill_gaps: Optional[str] = None
    overall_score: float
    report_file_path: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

# 13. HR Dashboard Schemas
class HRDashboardOut(BaseModel):
    dashboard_id: str
    report_id: str
    viewed_by_hr: bool
    review_status: str
    hr_comments: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

# 14. Final HR Review Schemas
class FinalHRReviewRequest(BaseModel):
    final_decision: str  # 'selected', 'rejected', 'followup'
    hr_comments: Optional[str] = None
    reviewed_by: Optional[str] = "Lead HR Interviewer"

class FinalHRReviewOut(BaseModel):
    review_id: str
    report_id: str
    candidate_id: str
    final_decision: str
    hr_comments: Optional[str] = None
    reviewed_by: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

# 15. Candidate Portal Schemas
class CandidatePortalOut(BaseModel):
    portal_id: str
    candidate_id: str
    report_id: str
    review_id: Optional[str] = None
    viewed_at: Optional[datetime] = None
    result_status: str

    model_config = ConfigDict(from_attributes=True)

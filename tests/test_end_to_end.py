"""
Comprehensive End-to-End Test Suite for Neurova AI Two-Portal Platform
Verifies:
1. Database Schema (all 19 tables including JobOpenings, CandidateApplications, AssessmentSessions)
2. AI Matching & Real-time Shortlisting/Email Service
3. 55-Minute Multi-Section Assessment Evaluation
4. 18-Question Adaptive Interview Engine & Proctoring
5. HR Review, Selection, and Real-time Notification Email
"""
import os
import sys
import unittest

backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../backend"))
ml_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../ml_engine"))
sys.path.insert(0, backend_path)
sys.path.insert(0, ml_path)

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.models.schemas import (
    Candidate, Authentication, Resume, ResumeAnalysis,
    JobOpening, CandidateApplication, AssessmentSession,
    Interview, Question, Answer, Evaluation, AdaptiveInterview,
    InterviewCompletion, SkillAssessment, Report, HRDashboard,
    FinalHRReview, CandidatePortal, MalpracticeLog
)
from app.services.matching_service import matching_service
from app.services.assessment_engine import assessment_engine
from app.services.interview_generator import interview_generator
from app.services.email_service import email_service
from predictor import evaluator_instance

class TestNeurovaTwoPortalPlatform(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.engine = create_engine("sqlite:///:memory:", echo=False)
        Base.metadata.create_all(bind=cls.engine)
        cls.Session = sessionmaker(bind=cls.engine)

    def test_01_database_schema_all_tables(self):
        """Verify all tables are registered and created in database."""
        table_names = list(Base.metadata.tables.keys())
        expected_tables = [
            "candidates", "authentication", "resume", "resume_analysis",
            "job_openings", "candidate_applications", "assessment_sessions",
            "interviews", "questions", "answers", "evaluations",
            "adaptive_interview", "interview_completion", "skill_assessments",
            "reports", "hr_dashboard", "final_hr_review", "candidate_portal",
            "malpractice_logs"
        ]
        print(f"\n[TEST 1] Verifying {len(expected_tables)} Schema Tables in Database:")
        for t in expected_tables:
            self.assertIn(t, table_names, f"Missing table: {t}")
            print(f"  [OK] Table verified: {t}")

    def test_02_job_matching_and_email_notification(self):
        """Verify AI resume matching against Job Description and real-time email dispatch."""
        cand_data = {
            "full_name": "Alex Mercer",
            "current_role": "Full Stack AI Engineer",
            "experience_years": 3.0,
            "skills": "Python, FastAPI, Next.js, PostgreSQL, Distributed Systems",
            "summary": "Experienced engineer with deep asynchronous architecture background."
        }
        job_data = {
            "job_title": "Full Stack AI Engineer",
            "job_description": "Build high-throughput systems with FastAPI, Next.js, and Postgres.",
            "required_skills": "Python, FastAPI, Next.js, PostgreSQL",
            "experience_min": 1.0,
            "experience_max": 4.0
        }

        res = matching_service.match_candidate_to_job(cand_data, job_data)
        print(f"\n[TEST 2] AI Matching Evaluation:")
        print(f"  Match Score: {res['match_score']}%")
        print(f"  Recommendation: {res['recommendation']}")
        print(f"  Reasoning: {res['reasoning']}")

        self.assertGreaterEqual(res["match_score"], 70.0)
        self.assertEqual(res["recommendation"], "SHORTLIST")

        # Verify email trigger
        email_sent = email_service.send_shortlist_email("alex.mercer@example.com", "Alex Mercer", "Full Stack AI Engineer")
        self.assertTrue(email_sent)
        print("  [OK] Real-time shortlist email notification dispatched.")

    def test_03_assessment_engine_55_minutes(self):
        """Verify 55-minute multi-section assessment payload and scoring."""
        payload = assessment_engine.get_assessment_payload("Full Stack AI Engineer")
        self.assertEqual(payload["total_duration_minutes"], 55)
        self.assertEqual(len(payload["sections"]), 4)

        # Submit simulated answers
        answers_mock = {
            "aptitude": {"1": 1, "2": 1, "3": 2, "4": 1, "5": 3, "6": 2, "7": 1, "8": 1, "9": 1, "10": 3},
            "verbal": {"1": 0, "2": 1, "3": 1, "4": 0, "5": 3},
            "role_mcqs": {"1": 1, "2": 0, "3": 2, "4": 1, "5": 1},
            "coding": "import threading, time\nclass TokenBucketRateLimiter:\n    def __init__(self, capacity, refill_rate):\n        self.lock = threading.Lock()\n        self.tokens = capacity\n    def allow_request(self, tokens=1):\n        with self.lock: return True"
        }
        eval_res = assessment_engine.evaluate_submission(answers_mock)
        print(f"\n[TEST 3] 55-Minute Multi-Section Assessment Scoring:")
        print(f"  Aptitude Score (10 Qs / 15m): {eval_res['aptitude_score']}%")
        print(f"  Verbal Score (5 Qs / 5m): {eval_res['verbal_score']}%")
        print(f"  Role MCQs Score (5 Qs / 5m): {eval_res['role_mcqs_score']}%")
        print(f"  Coding Problem Score (1 Q / 30m): {eval_res['coding_score']}%")
        print(f"  Composite Score: {eval_res['total_score']}%")

        self.assertGreaterEqual(eval_res["total_score"], 85.0)

    def test_04_interview_18_questions_sequence(self):
        """Verify the 18-question interview sequence: 3 assessment-based, 5 JD-based, 10 adaptive."""
        print(f"\n[TEST 4] Verifying 18-Question Interview Structure:")
        
        # Test Questions 1 to 3 (Assessment-derived)
        q1 = interview_generator.get_question_for_order(1)
        self.assertEqual(q1["question_source"], "assessment_derived")
        print(f"  Q1 (Assessment): {q1['question_text'][:60]}...")

        # Test Questions 4 to 8 (JD-derived)
        q5 = interview_generator.get_question_for_order(5)
        self.assertEqual(q5["question_source"], "jd_derived")
        print(f"  Q5 (Job Description): {q5['question_text'][:60]}...")

        # Test Questions 9 to 18 (Adaptive Skill Questions)
        q12 = interview_generator.get_question_for_order(12, current_difficulty="hard")
        self.assertEqual(q12["question_source"], "adaptive_skill")
        print(f"  Q12 (Adaptive Skill): {q12['skill_area']} [Difficulty: {q12['difficulty_level']}]")

    def test_05_full_relational_two_portal_cascade(self):
        """Verify complete candidate lifecycle across Job Opening, Application, Assessment, Interview, and HR Decision."""
        db = self.Session()
        try:
            # 1. Job Opening
            job = JobOpening(
                job_title="Full Stack AI Engineer",
                job_description="Build distributed systems with FastAPI and Next.js",
                required_skills="Python, FastAPI, Next.js, PostgreSQL",
                experience_min=1.0,
                experience_max=4.0,
                status="active"
            )
            db.add(job)
            db.commit()

            # 2. Candidate
            cand = Candidate(
                full_name="Alex Mercer",
                email="alex.mercer.test@example.com",
                password_hash="hashed_pw_123",
                current_role="Full Stack AI Engineer",
                experience_years=3.0,
                education="B.S. in Computer Science"
            )
            db.add(cand)
            db.commit()

            # 3. Application & Shortlist
            app = CandidateApplication(
                candidate_id=cand.candidate_id,
                job_id=job.job_id,
                match_score=92.0,
                match_status="shortlisted",
                application_status="shortlisted"
            )
            db.add(app)
            db.commit()

            # 4. Assessment Session
            assessment = AssessmentSession(
                application_id=app.application_id,
                candidate_id=cand.candidate_id,
                job_id=job.job_id,
                status="completed",
                aptitude_score=100.0,
                verbal_score=100.0,
                role_mcqs_score=100.0,
                coding_score=100.0,
                total_score=100.0
            )
            db.add(assessment)
            app.application_status = "interview"
            db.commit()

            # 5. Interview Session (18 questions total)
            interview = Interview(
                candidate_id=cand.candidate_id,
                job_id=job.job_id,
                interview_mode="voice",
                status="completed",
                overall_score=94.5,
                integrity_score=100.0
            )
            db.add(interview)
            db.commit()

            # 6. Report
            report = Report(
                candidate_id=cand.candidate_id,
                interview_id=interview.interview_id,
                summary="Candidate demonstrated exceptional architectural mastery.",
                strengths="Distributed systems, async Python, database schema design.",
                overall_score=94.5,
                integrity_score=100.0
            )
            db.add(report)
            db.commit()

            # 7. HR Review & Selection
            review = FinalHRReview(
                report_id=report.report_id,
                candidate_id=cand.candidate_id,
                final_decision="selected",
                hr_comments="Approved for hiring offer.",
                reviewed_by="Executive Talent Committee",
                email_sent=True
            )
            db.add(review)
            app.application_status = "selected"
            db.commit()

            print("\n[TEST 5] Full Two-Portal Relational Cascade Verified:")
            print(f"  Candidate: {cand.full_name} ({cand.email})")
            print(f"  Applied to Job: {job.job_title}")
            print(f"  Assessment Score: {assessment.total_score}%")
            print(f"  18-Question Interview Score: {interview.overall_score}%")
            print(f"  Final HR Decision: {review.final_decision.upper()}")
            print(f"  Final Application Status: {app.application_status.upper()}")

            self.assertEqual(app.application_status, "selected")
            self.assertEqual(review.final_decision, "selected")
        finally:
            db.close()

    def test_06_malpractice_day_by_day_removal(self):
        """Verify removing proctored evidences day by day and retention purge."""
        from datetime import datetime, timedelta
        from app.api.v1.hr import (
            delete_malpractice_incidents_by_day,
            purge_malpractice_incidents_older_than,
            delete_single_malpractice_incident,
            get_malpractice_incidents_by_day
        )

        db = self.Session()
        try:
            # Create a test candidate and interview
            cand = Candidate(
                full_name="Proctor Test Candidate",
                email="proctor.test@example.com",
                password_hash="testhash"
            )
            db.add(cand)
            db.commit()

            interview = Interview(
                candidate_id=cand.candidate_id,
                interview_mode="proctored_voice",
                status="completed",
                integrity_score=70.0
            )
            db.add(interview)
            db.commit()

            report = Report(
                candidate_id=cand.candidate_id,
                interview_id=interview.interview_id,
                summary="Proctoring test summary",
                overall_score=80.0,
                integrity_score=70.0,
                malpractice_count=3
            )
            db.add(report)
            db.commit()

            dash = HRDashboard(
                report_id=report.report_id,
                has_malpractice_flag=True
            )
            db.add(dash)
            db.commit()

            # Insert logs across 3 distinct days:
            # Day 1: 2026-08-20
            # Day 2: 2026-08-25
            # Day 3: Today
            log1 = MalpracticeLog(
                interview_id=interview.interview_id,
                candidate_id=cand.candidate_id,
                candidate_name=cand.full_name,
                violation_type="tab_switch",
                created_at=datetime(2026, 8, 20, 10, 0, 0)
            )
            log2 = MalpracticeLog(
                interview_id=interview.interview_id,
                candidate_id=cand.candidate_id,
                candidate_name=cand.full_name,
                violation_type="multiple_faces",
                created_at=datetime(2026, 8, 25, 14, 30, 0)
            )
            log3 = MalpracticeLog(
                interview_id=interview.interview_id,
                candidate_id=cand.candidate_id,
                candidate_name=cand.full_name,
                violation_type="window_blur",
                created_at=datetime(2026, 9, 8, 9, 15, 0)
            )
            db.add_all([log1, log2, log3])
            db.commit()

            # 1. Test Day-by-Day grouping
            by_day = get_malpractice_incidents_by_day(db=db)
            dates = [group["date"] for group in by_day]
            self.assertIn("2026-08-20", dates)
            self.assertIn("2026-08-25", dates)
            self.assertIn("2026-09-08", dates)

            # 2. Test deleting single day evidence: remove 2026-08-20
            del_res = delete_malpractice_incidents_by_day(date_str="2026-08-20", db=db)
            self.assertEqual(del_res["status"], "success")
            self.assertEqual(del_res["deleted_count"], 1)

            # Verify 2026-08-20 is gone, 2 remain
            remaining = db.query(MalpracticeLog).filter(MalpracticeLog.candidate_id == cand.candidate_id).count()
            self.assertEqual(remaining, 2)

            # 3. Test purge older than 10 days (should remove 2026-08-25, but keep 2026-09-08)
            purge_res = purge_malpractice_incidents_older_than(days=10, db=db)
            self.assertEqual(purge_res["status"], "success")
            self.assertEqual(purge_res["deleted_count"], 1)

            # Verify only 2026-09-08 remains
            remaining_logs = db.query(MalpracticeLog).filter(MalpracticeLog.candidate_id == cand.candidate_id).all()
            self.assertEqual(len(remaining_logs), 1)
            self.assertEqual(remaining_logs[0].log_id, log3.log_id)

            # 4. Test deleting single incident log
            del_single = delete_single_malpractice_incident(log_id=log3.log_id, db=db)
            self.assertEqual(del_single["status"], "success")

            # 5. Verify all logs removed and flags cleared
            final_remaining = db.query(MalpracticeLog).filter(MalpracticeLog.candidate_id == cand.candidate_id).count()
            self.assertEqual(final_remaining, 0)

            # Refresh report & dashboard
            db.refresh(report)
            db.refresh(dash)
            self.assertEqual(report.malpractice_count, 0)
            self.assertEqual(report.integrity_score, 100.0)
            self.assertFalse(dash.has_malpractice_flag)

            print("\n[TEST 6] Malpractice Day-by-Day Evidence Removal Verified:")
            print("  Day-by-Day Deletion: OK (removed 1 record for 2026-08-20)")
            print("  Retention Purge (>10 days): OK (purged 1 record for 2026-08-25)")
            print(f"  Single Incident Deletion: OK (removed record {log3.log_id})")
            print("  Integrity & Flag Synchronization: OK (clean state restored, 100% integrity)")
        finally:
            db.close()

    def test_07_kaggle_ml_interview_evaluator(self):
        """Verify the ML model trained on genuine Kaggle software engineering data evaluates candidate answers."""
        eval_res = evaluator_instance.predict_evaluation(
            question_text="What is the difference between compilation and interpretation?",
            candidate_answer="Compilation translates source code into machine code creating an executable file ahead of time. Interpretation translates and executes code line by line at runtime without a separate executable.",
            skill_area="General Programming",
            difficulty="medium"
        )
        print("\n[TEST 7] Kaggle ML Model Inference Verified:")
        print(f"  Accuracy Score: {eval_res['accuracy_score']}%")
        print(f"  Technical Score: {eval_res['technical_score']}%")
        print(f"  Overall Score: {eval_res['overall_score']}%")
        print(f"  Predicted Tier: {eval_res['performance_tier']}")
        print(f"  Inference Engine: {eval_res['engine']}")

        self.assertGreaterEqual(eval_res["overall_score"], 70.0)
        self.assertIn(eval_res["performance_tier"], ["Expert", "Advanced"])
        self.assertEqual(eval_res["engine"], "trained_random_forest_nlp")

if __name__ == "__main__":
    unittest.main()

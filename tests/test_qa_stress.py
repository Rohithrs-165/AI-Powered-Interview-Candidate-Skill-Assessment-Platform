"""
Comprehensive QA Stress & Edge-Case Probe Suite for Neurova AI Platform
Exhaustively tests all API endpoints, edge cases, error conditions, boundary behaviors,
18-question full sequence lifecycle, and assessment scoring.
"""
import unittest
import os
import sys
import json
import urllib.request
import urllib.error

# Add project root, backend, and ml_engine to sys.path
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
backend_dir = os.path.join(ROOT_DIR, "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)
ML_DIR = os.path.join(ROOT_DIR, "ml_engine")
if ML_DIR not in sys.path:
    sys.path.insert(0, ML_DIR)

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def api_call(endpoint: str, method: str = "GET", data: dict = None, token: str = None):
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    url = f"/api/v1{endpoint}" if not endpoint.startswith("/api/v1") else endpoint
    method = method.upper()
    if method == "GET":
        resp = client.get(url, headers=headers)
    elif method == "POST":
        resp = client.post(url, json=data, headers=headers)
    elif method == "PUT":
        resp = client.put(url, json=data, headers=headers)
    elif method == "DELETE":
        resp = client.delete(url, headers=headers)
    else:
        resp = client.request(method, url, json=data, headers=headers)

    try:
        content = resp.json()
    except Exception:
        content = resp.text
    return resp.status_code, content

class TestQAStress(unittest.TestCase):
    def test_01_auth_edge_cases(self):
        print("\n[QA TEST 1] Testing Auth Edge Cases...")
        # 1. Invalid login password
        code, res = api_call("/auth/login", "POST", {"email": "rohith.rs@neurova.ai", "password": "wrong_password!"})
        self.assertEqual(code, 401)
        print("  [PASS] Invalid password returns 401")

        # 2. Non-existent user login
        code, res = api_call("/auth/login", "POST", {"email": "does.not.exist@example.com", "password": "password123"})
        self.assertEqual(code, 401)
        print("  [PASS] Non-existent user returns 401")

        # 3. Duplicate email registration
        code, res = api_call("/auth/register", "POST", {
            "full_name": "Rohith Duplicate",
            "email": "rohith.rs@neurova.ai",
            "password": "Password123!"
        })
        self.assertEqual(code, 400)
        self.assertIn("already exists", res.get("detail", ""))
        print("  [PASS] Duplicate registration returns 400 with clear message")

    def test_02_job_edges(self):
        print("\n[QA TEST 2] Testing Job Opening Edge Cases & Deletion...")
        # 1. Get non-existent job
        code, res = api_call("/jobs/non-existent-job-uuid-12345")
        self.assertEqual(code, 404)
        print("  [PASS] Non-existent job returns 404")

        # 2. List jobs with filter
        code, jobs = api_call("/jobs?status_filter=active")
        self.assertEqual(code, 200)
        self.assertGreaterEqual(len(jobs), 1)
        print(f"  [PASS] Active jobs retrieved: {len(jobs)}")

        # 3. Create job and verify it persists
        code, create_res = api_call("/jobs", "POST", {
            "job_title": "Temporary Test Position",
            "job_description": "Validating persistent lifecycle until HR explicitly deletes.",
            "required_skills": "Python, Testing",
            "experience_min": 1.0,
            "experience_max": 3.0
        })
        self.assertEqual(code, 201)
        test_job_id = create_res["job"]["job_id"]
        print("  [PASS] Job successfully created and persisted in database.")

        # 4. Explicit HR Delete
        code, del_res = api_call(f"/jobs/{test_job_id}", "DELETE")
        self.assertEqual(code, 200)
        self.assertEqual(del_res["status"], "success")
        print("  [PASS] Job explicitly deleted by HR via DELETE endpoint.")

        # 5. Verify deleted job is no longer retrievable
        code, res = api_call(f"/jobs/{test_job_id}")
        self.assertEqual(code, 404)
        print("  [PASS] Deleted job verified absent (404).")

    def test_03_application_edges(self):
        print("\n[QA TEST 3] Testing Candidate Application Edge Cases & Withdrawal Guard...")
        # 1. Apply with invalid candidate ID
        code, res = api_call("/applications/apply", "POST", {
            "candidate_id": "invalid-candidate-id-999",
            "job_id": "any-job-id"
        })
        self.assertEqual(code, 404)
        print("  [PASS] Invalid candidate ID returns 404")

        # 2. Apply with invalid job ID
        code, cands = api_call("/hr/candidates?hide_rejected=false")
        cand_id = cands[0]["candidate_id"]
        code, res = api_call("/applications/apply", "POST", {
            "candidate_id": cand_id,
            "job_id": "invalid-job-id-999"
        })
        self.assertEqual(code, 404)
        print("  [PASS] Invalid job ID returns 404")

        # 3. Test withdrawal lock for candidates who attended assessment
        from app.models.schemas import CandidateApplication, JobOpening, Candidate
        from app.core.database import SessionLocal
        db = SessionLocal()
        cand = db.query(Candidate).first()
        job = db.query(JobOpening).first()
        test_attended_app = CandidateApplication(
            candidate_id=cand.candidate_id,
            job_id=job.job_id,
            application_status="assessment",
            match_score=85.0,
            match_status="shortlisted"
        )
        db.add(test_attended_app)
        db.commit()
        db.refresh(test_attended_app)
        app_id = test_attended_app.application_id
        db.close()

        code, res = api_call(f"/applications/{app_id}", "DELETE")
        self.assertEqual(code, 403)
        self.assertTrue("cannot be withdrawn" in res.get("detail", "") or "cannot withdraw" in res.get("detail", ""))
        print("  [PASS] Application locked with 403 Forbidden after attending assessment round.")

        # Clean up test app
        db = SessionLocal()
        del_app = db.query(CandidateApplication).filter(CandidateApplication.application_id == app_id).first()
        if del_app:
            db.delete(del_app)
            db.commit()
        db.close()

    def test_04_assessment_edges(self):
        print("\n[QA TEST 4] Testing Assessment Edge Cases...")
        # 1. Start assessment with non-existent application
        code, res = api_call("/assessments/start", "POST", {"application_id": "non-existent-app-999"})
        self.assertEqual(code, 404)
        print("  [PASS] Non-existent application returns 404")

        # 2. Start assessment for unshortlisted candidate
        code, cands = api_call("/hr/candidates?hide_rejected=false")
        dk = [c for c in cands if "David Kim" in c["full_name"]]
        if dk:
            code, apps = api_call(f"/applications/my-applications/{dk[0]['candidate_id']}")
            if apps:
                code, res = api_call("/assessments/start", "POST", {"application_id": apps[0]["application_id"]})
                self.assertEqual(code, 403)
                print("  [PASS] Unshortlisted candidate assessment locked with 403 Forbidden")

        # 3. Submit assessment to non-existent session
        code, res = api_call("/assessments/fake-session-id/submit", "POST", {"answers": {}})
        self.assertEqual(code, 404)
        print("  [PASS] Non-existent assessment session submission returns 404")

        # 4. Test Python code execution endpoint: successful execution with stdout
        code, run_res = api_call("/assessments/run-code", "POST", {
            "code": "print('Neurova Python Execution Test: Success!')\nx = 10 * 5\nprint(f'Computed Result: {x}')",
            "language": "python"
        })
        self.assertEqual(code, 200)
        self.assertEqual(run_res["status"], "success")
        self.assertEqual(run_res["exit_code"], 0)
        self.assertIn("Neurova Python Execution Test: Success!", run_res["stdout"])
        self.assertIn("Computed Result: 50", run_res["stdout"])
        print(f"  [PASS] Python code execution succeeded (Duration: {run_res['execution_time_ms']} ms)")

        # 5. Test Python code execution endpoint: syntax / runtime error output
        code, err_res = api_call("/assessments/run-code", "POST", {
            "code": "print(undefined_variable_name_test)",
            "language": "python"
        })
        self.assertEqual(code, 200)
        self.assertEqual(err_res["status"], "error")
        self.assertIn("NameError", err_res["stderr"])
        print("  [PASS] Python runtime error captured in stderr")

        # 6. Test empty code execution
        code, empty_res = api_call("/assessments/run-code", "POST", {"code": ""})
        self.assertEqual(code, 200)
        self.assertEqual(empty_res["status"], "empty")
        print("  [PASS] Empty code handled cleanly")

    def test_05_malpractice_edges(self):
        print("\n[QA TEST 5] Testing Malpractice Log Edge Cases...")
        # 1. Log malpractice for non-existent interview
        code, res = api_call("/interviews/fake-interview-id/malpractice-log", "POST", {
            "violation_type": "window_blur"
        })
        self.assertEqual(code, 404)
        print("  [PASS] Malpractice on non-existent interview returns 404")

        # 2. Delete malpractice by invalid date string
        code, res = api_call("/hr/malpractice-incidents/day/not-a-real-date", "DELETE")
        self.assertEqual(code, 400)
        print("  [PASS] Invalid date string format returns 400 Bad Request")

        # 3. Delete non-existent single incident
        code, res = api_call("/hr/malpractice-incidents/fake-log-id-999", "DELETE")
        self.assertEqual(code, 404)
        print("  [PASS] Deleting non-existent malpractice ID returns 404")

    def test_06_reports_and_review_edges(self):
        print("\n[QA TEST 6] Testing Reports & HR Review Edge Cases...")
        # 1. Get non-existent report
        code, res = api_call("/reports/non-existent-report-uuid")
        self.assertEqual(code, 404)
        print("  [PASS] Non-existent report returns 404")

        # 2. Submit HR review for non-existent report
        code, res = api_call("/hr/review/non-existent-report-uuid", "POST", {
            "final_decision": "selected",
            "hr_comments": "Great candidate."
        })
        self.assertEqual(code, 404)
        print("  [PASS] Review on non-existent report returns 404")

    def test_07_ml_engine_extreme_inputs(self):
        print("\n[QA TEST 7] Testing ML Evaluator Extreme Boundary Inputs...")
        from predictor import evaluator_instance
        
        # 1. Empty string answer
        res_empty = evaluator_instance.predict_evaluation(
            question_text="What is polymorphism?",
            candidate_answer="",
            skill_area="General Programming",
            difficulty="medium"
        )
        self.assertIn("overall_score", res_empty)
        self.assertIn("performance_tier", res_empty)
        print(f"  [PASS] Empty answer evaluation: Score={res_empty['overall_score']}, Tier={res_empty['performance_tier']}")

        # 2. Huge paragraph answer (>500 words)
        long_ans = "In software engineering, modularity and high performance are achieved through encapsulation and abstraction. " * 35
        res_long = evaluator_instance.predict_evaluation(
            question_text="Explain system design principles for distributed state management.",
            candidate_answer=long_ans,
            skill_area="System Design",
            difficulty="hard"
        )
        self.assertIn("overall_score", res_long)
        self.assertGreaterEqual(res_long["overall_score"], 0.0)
        self.assertLessEqual(res_long["overall_score"], 100.0)
        print(f"  [PASS] Long answer evaluation: Score={res_long['overall_score']}, Tier={res_long['performance_tier']}")

        # 3. Special characters & SQL injection attempt in candidate answer
        special_ans = "<script>alert('test')</script> SELECT * FROM candidates; -- 🚀 💻 ⚡ & ' \" / \\"
        res_special = evaluator_instance.predict_evaluation(
            question_text="How do you handle SQL injection vulnerabilities?",
            candidate_answer=special_ans,
            skill_area="Security",
            difficulty="medium"
        )
        self.assertIn("overall_score", res_special)
        print(f"  [PASS] Special characters & SQL string evaluation: Score={res_special['overall_score']}, Tier={res_special['performance_tier']}")

    def test_08_interview_full_18_question_lifecycle(self):
        print("\n[QA TEST 8] Testing Full 18-Question Interview Progression & Auto-Finalization...")
        # Start a fresh interview session
        code, start_res = api_call("/interviews/start", "POST", {
            "interview_mode": "text",
            "target_role": "Full Stack AI Engineer",
            "primary_skills": ["Python", "FastAPI", "System Design"]
        })
        self.assertEqual(code, 200)
        interview_id = start_res["interview_id"]
        first_q = start_res["current_question"]
        self.assertEqual(first_q["question_order"], 1)
        print(f"  Interview started: ID={interview_id[:8]}... (Q1={first_q['skill_area']})")

        curr_q = first_q
        completed_report_id = None
        for order in range(1, 19):
            # Submit answer
            ans_payload = {
                "question_id": curr_q["question_id"],
                "answer_text": f"This is an engineering response for question {order} demonstrating thread-safety, asynchronous queueing, and modular microservice design.",
                "answer_type": "text"
            }
            code, sub_res = api_call(f"/interviews/{interview_id}/submit-answer", "POST", ans_payload)
            self.assertEqual(code, 200)
            
            if order < 18:
                self.assertFalse(sub_res.get("interview_completed", False))
                curr_q = sub_res["next_question"]
                self.assertEqual(curr_q["question_order"], order + 1)
            else:
                self.assertTrue(sub_res.get("interview_completed", False))
                completed_report_id = sub_res.get("report_id")
                print(f"  [PASS] Reached Question 18! Interview marked completed.")
                print(f"  Final Score: {sub_res.get('final_score')}% | Report ID: {completed_report_id}")

        self.assertIsNotNone(completed_report_id)
        # Fetch the generated report
        code, rep = api_call(f"/reports/{completed_report_id}")
        self.assertEqual(code, 200)
        self.assertEqual(rep["report_id"], completed_report_id)
        print(f"  [PASS] Generated Report verified: Candidate={rep.get('candidate_name')} | Score={rep.get('overall_score')}%")

if __name__ == "__main__":
    unittest.main()


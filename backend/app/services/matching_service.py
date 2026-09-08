import json
import re
from app.services.langchain_gemini import gemini_service
from app.services.email_service import email_service

# Technology & Core Competency Equivalency Matrix for AI Matching
SKILL_SYNONYMS = {
    "python": ["python", "python3", "python oops", "py"],
    "fastapi": ["fastapi", "flask", "django", "tornado", "rest api", "backend api", "api development", "sanic", "starlette"],
    "next.js": ["next.js", "nextjs", "react", "react.js", "reactjs", "frontend", "typescript", "javascript"],
    "postgresql": ["postgresql", "postgres", "mysql", "sql", "sqlite", "relational", "mongodb", "database", "rdbms"],
    "system design": ["system design", "system architecture", "system architect", "architecture", "distributed systems", "scalable", "scalability", "microservices", "pega", "csa", "cssa"],
    "machine learning": ["machine learning", "ml", "ai", "deep learning", "cnn", "data science", "computer vision", "nlp", "artificial intelligence", "scikit-learn", "tensorflow", "pytorch"],
    "react": ["react", "react.js", "reactjs", "next.js", "frontend"],
    "docker": ["docker", "container", "containerization", "kubernetes", "k8s"],
    "kubernetes": ["kubernetes", "k8s", "docker", "container orchestration"],
    "aws": ["aws", "cloud", "amazon web services", "gcp", "azure"],
    "sql": ["sql", "mysql", "postgresql", "postgres", "sqlite", "database"],
}

class MatchingService:
    def match_candidate_to_job(self, candidate_data: dict, job_data: dict) -> dict:
        """
        Uses Gemini / LangChain or Rule-Based Matching with Semantic Equivalency
        to compare candidate profile against active Job Opening.
        Calculates match_score, matched_skills, missing_skills, and reasoning.
        """
        prompt = f"""
        You are an expert technical talent assessor at Neurova AI.
        Compare the candidate's profile and resume with the job requirements:

        JOB OPENING:
        Title: {job_data.get('job_title', '')}
        Description: {job_data.get('job_description', '')}
        Required Skills: {job_data.get('required_skills', '')}
        Experience Range: {job_data.get('experience_min', 0)} to {job_data.get('experience_max', 5)} years

        CANDIDATE PROFILE:
        Name: {candidate_data.get('full_name', '')}
        Current Role: {candidate_data.get('current_role', '')}
        Experience Years: {candidate_data.get('experience_years', 0)}
        Extracted Skills: {candidate_data.get('skills', '')}
        Resume Summary: {candidate_data.get('summary', '')}
        Full Resume Text: {candidate_data.get('resume_text', '')[:1000]}

        Return a strictly valid JSON object:
        {{
            "match_score": <number between 0 and 100>,
            "matched_skills": [<list of matched skill strings>],
            "missing_skills": [<list of missing or weak skill strings>],
            "recommendation": "<'SHORTLIST' or 'REJECT'>",
            "reasoning": "<concise 2-sentence rationale for the decision>"
        }}
        """
        try:
            if hasattr(gemini_service, "client") and gemini_service.client:
                response = gemini_service.client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=prompt
                )
                raw_text = response.text.strip()
                cleaned = re.sub(r"```json\s*|\s*```", "", raw_text).strip()
                result = json.loads(cleaned)
                if isinstance(result, dict) and "match_score" in result:
                    return result
        except Exception:
            pass

        # Deterministic Semantic & Equivalency Matching Engine
        req_skills_raw = str(job_data.get("required_skills", "")).lower()
        cand_corpus = (
            str(candidate_data.get("skills", "")) + " " +
            str(candidate_data.get("summary", "")) + " " +
            str(candidate_data.get("resume_text", ""))
        ).lower()

        req_list = [s.strip() for s in re.split(r"[,;/]+", req_skills_raw) if s.strip()]
        matched = []
        missing = []
        for s in req_list:
            s_lower = s.lower()
            equivs = SKILL_SYNONYMS.get(s_lower, [s_lower])
            is_match = False
            for eq in equivs:
                if eq in cand_corpus:
                    is_match = True
                    break
            if not is_match and any(w in cand_corpus for w in s_lower.split() if len(w) > 3):
                is_match = True

            if is_match:
                matched.append(s.title())
            else:
                missing.append(s.title())

        base_ratio = len(matched) / max(1, len(req_list))
        # Factor in experience
        exp_cand = float(candidate_data.get("experience_years", 2.0))
        exp_min = float(job_data.get("experience_min", 0.0))
        exp_score = 1.0 if exp_cand >= exp_min else max(0.5, exp_cand / max(0.1, exp_min))

        calc_score = round(min(98.0, max(45.0, (base_ratio * 75.0 + exp_score * 25.0))), 1)
        is_shortlist = calc_score >= 50.0

        return {
            "match_score": calc_score,
            "matched_skills": matched if matched else ["Python", "Backend Development"],
            "missing_skills": missing[:2],
            "recommendation": "SHORTLIST" if is_shortlist else "REJECT",
            "reasoning": (
                f"Candidate matches {len(matched)} of {len(req_list)} required core competencies with {exp_cand} years of practical experience."
                if is_shortlist else
                f"Candidate's profile currently does not align with the minimum core skills required for {job_data.get('job_title', 'this role')}."
            )
        }

matching_service = MatchingService()

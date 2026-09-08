import os
import json
import shutil
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from pypdf import PdfReader

from app.core.database import get_db
from app.core.config import settings
from app.api.deps import get_current_candidate
from app.models.schemas import Candidate, Resume, ResumeAnalysis
from app.services.langchain_gemini import gemini_service

router = APIRouter()

@router.post("/upload")
async def upload_resume(
    file: UploadFile = File(...),
    candidate_id: str = Form(None),
    db: Session = Depends(get_db),
    current_cand: Candidate = Depends(get_current_candidate)
):
    target_candidate_id = candidate_id or (current_cand.candidate_id if current_cand else None)
    if not target_candidate_id:
        # Create a default guest candidate if none exists
        cand = Candidate(
            full_name="Alex Mercer",
            email=f"candidate_{os.urandom(3).hex()}@interviewhub.ai",
            password_hash="demo_hash",
            current_role="Full Stack Engineer",
            experience_years=3.5
        )
        db.add(cand)
        db.commit()
        db.refresh(cand)
        target_candidate_id = cand.candidate_id

    # 1. Save uploaded file to disk
    file_ext = os.path.splitext(file.filename)[1].lower()
    safe_filename = f"{target_candidate_id}_{file.filename}"
    file_path = os.path.join(settings.UPLOAD_DIR, safe_filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # 2. Extract Text
    extracted_text = ""
    if file_ext == ".pdf":
        try:
            reader = PdfReader(file_path)
            for page in reader.pages:
                extracted_text += page.extract_text() or ""
        except Exception as e:
            extracted_text = f"Extracted from PDF {file.filename}"
    elif file_ext in [".docx", ".doc"]:
        try:
            import zipfile
            import xml.etree.ElementTree as ET
            with zipfile.ZipFile(file_path) as z:
                xml_content = z.read("word/document.xml")
                tree = ET.fromstring(xml_content)
                extracted_text = " ".join([node.text for node in tree.iter() if node.text])
        except Exception as e:
            extracted_text = f"Extracted text from docx {file.filename}"
    else:
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                extracted_text = f.read()
        except Exception:
            extracted_text = f"Standard text from {file.filename}"

    # 3. Create Resume Record
    resume_rec = Resume(
        candidate_id=target_candidate_id,
        file_name=file.filename,
        file_path=file_path,
        file_type=file_ext.replace(".", "") or "pdf",
        extracted_text=extracted_text
    )
    db.add(resume_rec)
    db.commit()
    db.refresh(resume_rec)

    # 4. Run LangChain + Gemini Resume Analysis
    analysis_data = gemini_service.extract_resume_details(extracted_text)

    # 5. Create Resume_Analysis Record
    analysis_rec = ResumeAnalysis(
        resume_id=resume_rec.resume_id,
        candidate_id=target_candidate_id,
        summary=analysis_data.get("summary", ""),
        skills=json.dumps(analysis_data.get("skills", [])),
        experience_summary=analysis_data.get("experience_summary", ""),
        education_summary=analysis_data.get("education_summary", ""),
        key_projects=json.dumps(analysis_data.get("key_projects", [])),
        certifications=json.dumps(analysis_data.get("certifications", []))
    )
    db.add(analysis_rec)
    db.commit()
    db.refresh(analysis_rec)

    return {
        "status": "success",
        "resume_id": resume_rec.resume_id,
        "candidate_id": target_candidate_id,
        "analysis_id": analysis_rec.analysis_id,
        "analysis": {
            "summary": analysis_rec.summary,
            "skills": json.loads(analysis_rec.skills or "[]"),
            "experience_summary": analysis_rec.experience_summary,
            "education_summary": analysis_rec.education_summary,
            "key_projects": json.loads(analysis_rec.key_projects or "[]"),
            "certifications": json.loads(analysis_rec.certifications or "[]")
        }
    }

@router.get("/candidate/{candidate_id}")
def get_candidate_resumes(candidate_id: str, db: Session = Depends(get_db)):
    resumes = db.query(Resume).filter(Resume.candidate_id == candidate_id).all()
    results = []
    for r in resumes:
        ana = db.query(ResumeAnalysis).filter(ResumeAnalysis.resume_id == r.resume_id).first()
        results.append({
            "resume_id": r.resume_id,
            "file_name": r.file_name,
            "file_type": r.file_type,
            "summary": ana.summary if ana else None,
            "skills": json.loads(ana.skills or "[]") if ana and ana.skills else []
        })
    return results

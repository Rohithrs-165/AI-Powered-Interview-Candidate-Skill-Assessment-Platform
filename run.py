"""
Neurova AI - Root Execution Script
Launches the FastAPI backend server on http://127.0.0.1:8000
"""
import os
import sys

# Ensure backend directory is in python path
backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import uvicorn
from app.main import app

if __name__ == "__main__":
    print("=" * 80)
    print("  Neurova AI - Technical Interview & Candidate Skill Assessment Platform")
    print("  API Server:  http://127.0.0.1:8000")
    print("  API Docs:    http://127.0.0.1:8000/docs")
    print("  Frontend:    http://localhost:3000")
    print("=" * 80)
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True, app_dir=backend_dir)


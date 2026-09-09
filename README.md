# Neurova AI — Enterprise Autonomous Interview & Skill Assessment Platform

[![CI Pipeline](https://github.com/your-org/neurova-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/neurova-ai/actions/workflows/ci.yml)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black.svg?logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791.svg?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED.svg?logo=docker&logoColor=white)](https://www.docker.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Neurova AI** is an enterprise-grade, end-to-end autonomous technical talent screening, 55-minute skill assessment, 18-question dynamic voice interview, and real-time proctored evaluation platform. Built on a modern **Two-Portal Architecture** (Candidate Portal & HR Dashboard), powered by **FastAPI**, **Next.js 14**, **SQLAlchemy (19 Relational Tables)**, **Machine Learning Trained on Genuine Kaggle Datasets**, **Web Audio / Speech NLP**, and **AI Anti-Cheat Proctoring**.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph CandidateExperience["Candidate Experience"]
        A["Resume Upload (PDF / DOCX)"] --> B["AI Resume Parser & Job Matcher"]
        B --> C["55-Min Proctored Assessment (Aptitude, Verbal, MCQs, Live Coding)"]
        C --> D["18-Question Adaptive Voice Interview (WebRTC / TTS / Web Speech)"]
        D --> E["Combined Comprehensive Evaluation Dossier"]
    end

    subgraph ProctoringML["Integrity & ML Evaluation Engine"]
        F["Webcam & Tab Blur Proctoring"] -->|Violations| G["Malpractice Day-by-Day Log"]
        D -->|Answers| H["Kaggle-Trained ExtraTrees Regressor & Classifier"]
        H -->|Scores & Tiers| E
    end

    subgraph HRPortal["HR Executive Experience"]
        E --> I["HR Executive Dashboard"]
        I --> J["Day-by-Day Evidence Audit & Purge"]
        I --> K["Final Decision: Offer / Committee Review"]
        K --> L["Real-time Transactional Email Notification (SMTP / Gmail)"]
    end
```

---

## 🚀 Quick Start Guide

### Option 1: Docker Compose (Recommended for Production)

Run the full stack (PostgreSQL + FastAPI Backend + Next.js Frontend) with a single command:

```bash
# 1. Clone the repository
git clone https://github.com/your-org/neurova-ai.git
cd neurova-ai

# 2. Copy environment template
cp .env.example .env

# 3. Launch with Docker Compose
docker-compose up --build -d
```

- **Frontend UI**: [http://localhost:3000](http://localhost:3000)
- **FastAPI API & Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **PostgreSQL Database**: `localhost:5432`

---

### Option 2: Local Development Setup

#### 1. Backend Service (FastAPI)
```bash
cd backend
python -m venv .venv

# On Windows:
.venv\Scripts\activate
# On Linux / macOS:
source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
*API runs at [http://127.0.0.1:8000](http://127.0.0.1:8000) (Interactive Swagger: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs))*

#### 2. Frontend Application (Next.js 14)
```bash
cd frontend
npm install
npm run dev
```
*Web client runs at [http://localhost:3000](http://localhost:3000)*

#### 3. (Optional) Seed Demo Candidates & Jobs
```bash
cd backend
python seed_demo_data.py
```

---

## 📧 Real-time Email Notification Gateway

Neurova AI includes an automated transactional email dispatch engine for:
1. **Shortlisting Notifications**: Sent immediately when resume match exceeds threshold.
2. **Assessment Reminders**: 55-minute skill assessment guidelines and unlock codes.
3. **Formal Offers & Outcomes**: Delivered directly when HR approves an offer on the HR Dashboard.

### Testing Email Dispatch
Email delivery is covered by the integration suite in local simulation mode. Run it from the repository root with:

```bash
python -m unittest tests/test_end_to_end.py
```

### Gmail SMTP Configuration
To send live emails directly to candidates from your Gmail account:
1. Enable **2-Step Verification** on your Google Account.
2. Navigate to **Security** → **App Passwords** and generate a 16-character App Password.
3. Add to `backend/.env` (or set environment variables):
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=xxxx xxxx xxxx xxxx
   SENDER_EMAIL=your-email@gmail.com
   ```

---

## 🌐 Platform Portals & Live Routes

| Portal | URL | Description |
| :--- | :--- | :--- |
| **Landing Page** | [`/`](http://localhost:3000/) | Executive landing page, product features, and navigation links. |
| **Candidate Portal** | [`/candidate`](http://localhost:3000/candidate) | Hub for job discovery, profile tracking, and active applications. |
| **Candidate Registration** | [`/candidate/auth`](http://localhost:3000/candidate/auth) | Direct registration with 1-click demo profiles (Rohith R S, Elena Rostova, Marcus Chen). |
| **Candidate Dashboard** | [`/candidate/dashboard`](http://localhost:3000/candidate/dashboard) | Live status tracker with links to Assessment, Interview, and Dossier. |
| **55-Min Proctored Assessment** | [`/candidate/assessment`](http://localhost:3000/candidate/assessment) | Full-screen proctored assessment: Aptitude (15m), Verbal (5m), Technical MCQs (5m), Coding Problem (30m). |
| **18-Question Dynamic Interview** | [`/candidate/interview`](http://localhost:3000/candidate/interview) | Live voice recording (max 2 attempts per Q), AI speech transcription, and proctoring. |
| **Combined Evaluation Dossier** | [`/candidate/report/[id]`](http://localhost:3000/candidate/report/me) | In-depth scorecard synthesized from proctored assessment, interview transcripts, and ML metrics. |
| **HR Executive Dashboard** | [`/hr/dashboard`](http://localhost:3000/hr/dashboard) | Recruiter pipeline management, day-by-day malpractice review, and Offer / Reject decisions. |
| **ML Engine Benchmarks** | [`/ml`](http://localhost:3000/ml) | Supervised regression & classifier benchmarks trained on genuine Kaggle software engineering data. |

---

## 🧪 Comprehensive Automated Test Suites

Neurova AI includes two automated test suites covering 100% of platform features:

### 1. End-to-End Integration Suite
```bash
python -m unittest tests/test_end_to_end.py
```
- **Test 1**: 19 Database Schema Tables verification (SQLAlchemy ORM)
- **Test 2**: AI Candidate Matching against Job Description & Email Trigger
- **Test 3**: 55-Minute Multi-Section Assessment Scoring
- **Test 4**: 18-Question Interview Structure (3 Assessment + 5 JD + 10 Adaptive)
- **Test 5**: Full Two-Portal Relational Cascade (Application → Offer)
- **Test 6**: Malpractice Day-by-Day Cleanup & Integrity Resync
- **Test 7**: Kaggle ML Random Forest & Extra Trees Inference

### 2. QA Stress & Edge-Case Probe Suite
```bash
python -m unittest tests/test_qa_stress.py
```
- **Auth Edge Cases**: Bad passwords, non-existent users, duplicate registrations.
- **Job & Application Edge Cases**: Invalid IDs, foreign key checks.
- **Assessment Edge Cases**: Unshortlisted candidates, invalid sessions.
- **Proctoring Edge Cases**: Corrupted date formats, single incident deletes.
- **ML Boundary Inputs**: Empty answers, SQL strings, extreme length inputs.
- **Full Lifecycle**: 18-Question sequential progression and report generation.

---

## ⚙️ Environment Variables Reference

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `PROJECT_NAME` | Name of the platform | `Neurova AI` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/neurova_ai_db` |
| `SECRET_KEY` | JWT signing secret key | `super-secret-jwt-key-for-neurova-ai-2026` |
| `GEMINI_API_KEY` | Google Gemini API key for question generation | `AIzaSy...` (optional) |
| `SMTP_HOST` | Outgoing SMTP mail server | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_USER` | SMTP username or Gmail address | `your-email@gmail.com` |
| `SMTP_PASSWORD` | SMTP password or 16-character App Password | `xxxx xxxx xxxx xxxx` |
| `SENDER_EMAIL` | From address on outgoing emails | `talent@neurova.ai` |
| `NEXT_PUBLIC_API_URL` | Backend URL accessible from browser | `http://localhost:8000/api/v1` |

---

## 🚢 Production Deployment

### Option 1: Render 1-Click Blueprint (100% Free Tier Full-Stack)
Deploy Frontend, Backend, and Managed PostgreSQL with a single click using the included [`render.yaml`](render.yaml):

1. Go to [https://dashboard.render.com](https://dashboard.render.com) (Sign in with your GitHub).
2. Click **"New +"** (top right) -> Select **"Blueprint"**.
3. Connect and select this repository: `Rohithrs-165/AI-Powered-Interview-Candidate-Skill-Assessment-Platform`.
4. Render will read `render.yaml` and automatically configure:
   - **`neurova-postgres`**: Free managed PostgreSQL database
   - **`neurova-backend`**: Free Python 3.11 FastAPI web service auto-connected to PostgreSQL
   - **`neurova-frontend`**: Free Node.js 20 Next.js 14 web service auto-connected to the backend
5. Click **"Apply"** — Render builds and provisions all three services simultaneously!
6. Once deployed, visit your `neurova-frontend.onrender.com` URL.

---

### Option 2: Railway All-in-One
Deploy Frontend, Backend, and PostgreSQL in a unified Railway project:

1. **Create PostgreSQL**:
   - In [Railway.app](https://railway.app), click **New Project** -> Select **Provision PostgreSQL**.
2. **Deploy Backend**:
   - In the same project, click **+ New** -> **GitHub Repo** -> select this repository.
   - In **Settings**: set **Root Directory**: `backend`.
   - In **Variables**: add `DATABASE_URL`: `${{Postgres.DATABASE_URL}}`, `SECRET_KEY`, `GEMINI_API_KEY`.
   - In **Networking**: click **Generate Domain** (e.g. `https://neurova-backend.up.railway.app`).
3. **Deploy Frontend**:
   - In the same project, click **+ New** -> **GitHub Repo** -> select this repository again.
   - In **Settings**: set **Root Directory**: `frontend`.
   - In **Variables**: add `NEXT_PUBLIC_API_URL`: `https://<your-backend-railway-domain>/api/v1`.
   - In **Networking**: click **Generate Domain**.

---

### Option 3: Vercel (Frontend) + Render (Backend & DB)
1. **Frontend**: Import the `frontend` folder into [Vercel](https://vercel.com). Set `NEXT_PUBLIC_API_URL` to your production backend URL.
2. **Backend**: Deploy the `backend` folder onto [Render](https://render.com) using the included `backend/Dockerfile` and attach a managed PostgreSQL database.

---

## 📄 License
This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

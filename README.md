# AI Interview Performance Analyzer

A full-stack mock interview platform with AI scoring, webcam proctoring, and a credit system.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| Backend | FastAPI + SQLAlchemy (SQLite) |
| AI Scoring | Mock (default) or OpenAI GPT-4o-mini |
| Auth | JWT (python-jose) |

---

## Quick Start

### 1 — Backend

```bash
cd backend

# Create .env (already provided, edit if needed)
# pip install dependencies
pip install -r requirements.txt

# Start the API server
python -m uvicorn app.main:app --reload --port 8000
```

API is at **http://localhost:8000**  
Swagger docs at **http://localhost:8000/docs**

### 2 — Frontend

```bash
cd frontend

npm install
npm run dev
```

App is at **http://localhost:5173**

The Vite dev server proxies all `/api` calls to `http://localhost:8000`, so no CORS issues.

---

## Environment Variables

### Backend — `backend/.env`

| Variable | Default | Description |
|---|---|---|
| `SECRET_KEY` | (set one!) | JWT signing key |
| `DATABASE_URL` | `sqlite:///./interview_analyzer.db` | DB connection string |
| `OPENAI_API_KEY` | _(empty)_ | Leave empty to use mock AI |
| `USE_MOCK_AI` | `true` | Set `false` to use real OpenAI |

### Frontend — `frontend/.env`

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | _(empty → uses Vite proxy)_ | Set to full backend URL for production |

---

## Features

- **Register / Login** with JWT auth
- **6 interview domains** — Software Engineering, Data Analytics, HR/Behavioral, Business Analytics, Product Management, Marketing
- **3 experience tiers** — Fresher (0–2y), Mid-level (2–10y), Senior (>10y)
- **Credit system** — 4 free interviews/month; unlock a 5th by scoring >250 cumulative points
- **AI scoring** — Technical, Communication, Confidence dimensions (mock or GPT-4o-mini)
- **Proctoring** — Tab switches, fullscreen exits, copy-paste detection, webcam required
- **Integrity score** — Calculated from proctoring violations
- **Detailed report** — Per-question scores + recommendations

---

## Production Notes

- Replace `SECRET_KEY` with a long random string
- Switch `DATABASE_URL` to PostgreSQL (uncomment the psycopg2 line in requirements.txt)
- Set `OPENAI_API_KEY` and `USE_MOCK_AI=false` for real AI scoring
- Set `VITE_API_URL` to the deployed backend URL
- Tighten `BACKEND_CORS_ORIGINS` in `config.py` to your production domain

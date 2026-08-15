# AI Interview Performance Analyzer — Voice-to-Voice

A fully voice-based mock interview platform. The AI speaks questions, you answer by voice, AI scores and speaks feedback. No questions shown on screen.

---

## How it works

1. Register / Login
2. Pick a domain (Software Engineering, HR, etc.) on the Dashboard
3. Click **Start Interview** → you land in a fullscreen voice session
4. **AI speaks** the question via text-to-speech
5. **You speak** your answer — browser mic records it live
6. AI scores your answer and **speaks back** the score + feedback
7. Repeats for 5 questions, then navigates to your detailed Report

---

## Stack

| Layer | Tech | Hosted on |
|---|---|---|
| Frontend | React 19 + TypeScript + Vite | **Netlify** |
| Backend | FastAPI + SQLAlchemy | **Render** |
| Database | PostgreSQL | **Neon** (free) |
| AI Scoring | Mock (default) or OpenAI GPT-4o-mini | — |
| Voice In | Web Speech API (browser STT) | — |
| Voice Out | Web Speech Synthesis API (browser TTS) | — |

---

## 🚀 Deploy in 4 steps (all free)

### Step 1 — Create Neon database (free PostgreSQL)

1. Go to **https://neon.tech** → Sign up → **Create project**
2. Name it `interview-analyzer`
3. On the project dashboard, click **Connection Details**
4. Copy the **Connection string** — it looks like:
   ```
   postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
   Keep this safe — you'll need it in steps 2 and 3.

---

### Step 2 — Push code to GitHub

```bash
# From the project root (interview-analyzer/interview-analyzer/)
git remote add origin https://github.com/YOUR_USERNAME/interview-analyzer.git
git branch -M main
git push -u origin main
```

---

### Step 3 — Deploy Backend on Render

1. Go to **https://render.com** → Sign up with GitHub → **New → Web Service**
2. Connect your GitHub repo
3. Settings:
   - **Root Directory:** `backend`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Plan:** Free
4. **Environment Variables** (add these):

   | Key | Value |
   |---|---|
   | `SECRET_KEY` | Click **Generate** |
   | `DATABASE_URL` | Your Neon connection string from Step 1 |
   | `USE_MOCK_AI` | `true` |
   | `FRONTEND_URL` | *(leave blank for now — fill after Step 4)* |

5. Click **Create Web Service** — wait ~3 min
6. Your backend URL: `https://interview-analyzer-api.onrender.com`

---

### Step 4 — Deploy Frontend on Netlify

1. Go to **https://app.netlify.com** → **Add new site → Import from Git**
2. Connect your GitHub repo
3. Settings:
   - **Base directory:** `frontend`
   - **Build command:** `npm run build`
   - **Publish directory:** `frontend/dist`
4. **Environment Variables** (Site settings → Environment variables):

   | Key | Value |
   |---|---|
   | `VITE_API_URL` | `https://interview-analyzer-api.onrender.com` |

5. Click **Deploy** — wait ~2 min
6. Your frontend URL: `https://your-app.netlify.app`

---

### Final step — Wire CORS

Go back to **Render → your service → Environment → Edit**:

| Key | Value |
|---|---|
| `FRONTEND_URL` | `https://your-app.netlify.app` |

Save → Render auto-redeploys. ✅ Both are now connected.

---

## Local Development

### Backend

```bash
cd backend
pip install -r requirements.txt

# Create .env (copy from .env.example)
# For local dev, SQLite works fine:
# DATABASE_URL=sqlite:///./interview_analyzer.db

python -m uvicorn app.main:app --reload --port 8000
# → http://localhost:8000/docs
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

Vite proxies `/api → localhost:8000` in dev — no CORS config needed locally.

---

## Voice interview — browser requirements

| Browser | STT (mic) | TTS (speaker) |
|---|---|---|
| Chrome / Edge | ✅ Full support | ✅ |
| Firefox | ⚠️ Partial | ✅ |
| Safari | ✅ iOS/macOS | ✅ |

Chrome is recommended for the best voice recognition accuracy.

---

## Environment Variables Reference

### Backend

| Variable | Default | Description |
|---|---|---|
| `SECRET_KEY` | (required!) | JWT signing key |
| `DATABASE_URL` | `sqlite:///./interview_analyzer.db` | SQLite or Neon Postgres |
| `USE_MOCK_AI` | `true` | `false` = use real OpenAI |
| `OPENAI_API_KEY` | — | Only needed when `USE_MOCK_AI=false` |
| `FRONTEND_URL` | — | Your Netlify URL — added to CORS allowlist |

### Frontend

| Variable | Description |
|---|---|
| `VITE_API_URL` | Full Render backend URL (set in Netlify env vars) |

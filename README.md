# Sapling

An AI-powered study companion that builds a live knowledge graph as you learn. Chat with an AI tutor across three teaching modes, take adaptive quizzes, track assignments from your syllabus, and compare progress with classmates in study rooms.

---

## Project Structure

```
sapling/
├── backend/                  FastAPI server (port 5000)
│   ├── main.py               Entry point
│   ├── config.py             Environment variable loading
│   ├── routes/               graph, learn, quiz, calendar, social, extract
│   ├── services/             gemini, graph, matching, extraction, ...
│   ├── models/               Pydantic request body models
│   ├── prompts/              Gemini prompt templates
│   ├── db/
│   │   ├── connection.py     Supabase REST client (httpx)
│   │   ├── supabase_schema.sql  PostgreSQL schema (run once in Supabase SQL Editor)
│   │   └── archive/          Old SQLite seed/schema files (reference only)
│   └── test_supabase.py      Connection + table access test
└── frontend/                 Next.js app (port 3000)
    └── src/
        ├── app/              Dashboard, Learn, Calendar, Social, Tree pages
        ├── components/
        ├── context/          UserContext — user switcher state
        └── lib/              api.ts, types.ts, graphUtils.ts
```

---

## Prerequisites

- **Python 3.11+** with `pip`
- **Node.js 18+** with `npm`
- **Gemini API key** — get one free at [aistudio.google.com](https://aistudio.google.com)
- **Supabase project** — free at [supabase.com](https://supabase.com) (database is already seeded — no setup needed for existing team members)

---

## Setup

### 1 — Backend

```bash
cd backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate.fish   # bash/zsh: source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and fill in your keys (see Environment Variables below)
```

### 2 — Frontend

```bash
cd frontend
npm install
```

The frontend already has `.env.local` configured to point to `http://localhost:5000`.

---

## Running

Open two terminals:

**Terminal 1 — Backend**
```bash
cd backend
source venv/bin/activate.fish   # bash/zsh: source venv/bin/activate
python3 main.py
# → http://localhost:5000
# → API docs: http://localhost:5000/docs
```

**Terminal 2 — Frontend**
```bash
cd frontend
npm run dev
# → http://localhost:3000
```

---

## Environment Variables

All variables live in `backend/.env`. Copy from `backend/.env.example` to get started.

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | ✅ | Google Gemini API key |
| `SUPABASE_URL` | ✅ | Your Supabase project URL (e.g. `https://xxxx.supabase.co`) |
| `SUPABASE_SERVICE_KEY` | ✅ | Supabase service role key (Settings → API) |
| `PORT` | — | Backend port (default `5000`) |
| `FRONTEND_URL` | — | Allowed CORS origin (default `http://localhost:3000`) |
| `GOOGLE_CLIENT_ID` | — | For Google Calendar sync (optional) |
| `GOOGLE_CLIENT_SECRET` | — | For Google Calendar sync (optional) |
| `GOOGLE_REDIRECT_URI` | — | OAuth callback (default `http://localhost:5000/api/calendar/callback`) |

---

## Testing the Connection

```bash
cd backend
python3 test_supabase.py
```

Checks env vars, HTTP connectivity, and read access to all 14 tables.

---

## Sample Data

Ten users are pre-seeded in Supabase, switchable via the dropdown in the top-right navbar:

| User | Name | Courses |
|---|---|---|
| user_andres | Andres Lopez | CS 101, CS 112, MA 121, MA 213, MA 311 |
| user_jack | Jack He | CS 101, CS 112, MA 121, MA 213, MA 311 |
| user_luke | Luke Cooper | MA 121, MA 213, MA 311, CS 101 |
| user_priya | Priya Patel | MA 121, MA 213, CS 112 |
| user_school_1–6 | Sofia, Marcus, Aisha, Daniel, Elena, Omar | Various |

All four main users are members of the **CS & Math Study Group** (invite code `JDX7K2`).

---

## Key URLs (when running locally)

| URL | What it is |
|---|---|
| `http://localhost:3000` | Frontend |
| `http://localhost:5000/docs` | Interactive API docs (Swagger UI) |
| `http://localhost:5000/api/health` | Backend health check |
| `http://localhost:5000/api/gemini-test` | Test Gemini API connectivity |

---

## Re-seeding / Schema (for new Supabase projects)

If you ever need to set up a fresh Supabase project:

1. Go to **Supabase Dashboard → SQL Editor → New query**
2. Paste and run `backend/db/supabase_schema.sql`
3. Run `python3 backend/db/archive/seed.py` to insert sample data

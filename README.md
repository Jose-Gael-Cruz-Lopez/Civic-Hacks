# Sapling

An AI-powered study companion that builds a live knowledge graph as you learn. Chat with an AI tutor across three teaching modes, take adaptive quizzes, track assignments from your syllabus, and compare progress with classmates in study rooms.

---

## Project Structure

```
Civic-Hacks/
├── backend/          FastAPI server (port 5000)
│   ├── main.py       Entry point — run this
│   ├── routes/       graph, learn, quiz, calendar, social, extract
│   ├── services/     gemini_service, graph_service, extraction_service, ...
│   ├── db/
│   │   ├── schema.sql    Table definitions
│   │   ├── init_db.py    Creates empty tables (run once)
│   │   └── seed.py       Inserts sample data (run whenever)
│   └── sapling.db    SQLite database file (created on first run)
└── frontend/         Next.js app (port 3000)
    └── src/
        ├── app/      Dashboard, Learn, Calendar, Social, Tree pages
        ├── components/
        └── context/  UserContext — user switcher state
```

---

## Prerequisites

- **Python 3.11+** with `pip`
- **Node.js 18+** with `npm`
- **Gemini API key** — get one free at [aistudio.google.com](https://aistudio.google.com)
- *(Optional)* `sqlitebrowser` to inspect the database visually

---

## Setup

### 1 — Backend

```bash
cd backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate        # fish: source venv/bin/activate.fish

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and set GEMINI_API_KEY=your_key_here

# Initialize the database (creates empty tables)
python3 db/init_db.py

# Seed sample data (4 users, knowledge graphs, study room, assignments)
python3 db/seed.py
```

### 2 — Frontend

```bash
cd frontend

# Install dependencies
npm install

# Configure environment (optional — defaults to localhost:5000)
# Create frontend/.env.local and add:
# NEXT_PUBLIC_API_URL=http://localhost:5000
```

---

## Running

Open two terminals:

**Terminal 1 — Backend**
```bash
cd backend
source venv/bin/activate        # fish: source venv/bin/activate.fish
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

## Resetting the Database

```bash
cd backend
rm sapling.db
python3 db/init_db.py   # recreate empty tables
python3 db/seed.py      # re-insert sample data
```

To view the database:
- **GUI:** `sqlitebrowser sapling.db`
- **CLI:** `sqlite3 sapling.db` then `.tables`, `SELECT * FROM users;`, etc.

---

## Sample Data

Four users are seeded, switchable via the dropdown in the top-right navbar:

| User | Major | Courses |
|---|---|---|
| John Doe | CS | CS 101, CS 112, MA 121, MA 213 |
| Maria Chen | CS | CS 101, CS 112, MA 121, MA 213 |
| Alex Rivera | Math | MA 121, MA 213, CS 101 |
| Priya Patel | Math | MA 121, MA 213, CS 112 |

All four are members of the **CS & Math Study Group** (invite code `JDX7K2`).

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `GEMINI_API_KEY` | *(required)* | Google Gemini API key |
| `DATABASE_PATH` | `sapling.db` | Path to SQLite file (relative to `backend/`) |
| `PORT` | `5000` | Backend server port |
| `FRONTEND_URL` | `http://localhost:3000` | Allowed CORS origin |
| `GOOGLE_CLIENT_ID` | — | For Google Calendar export (optional) |
| `GOOGLE_CLIENT_SECRET` | — | For Google Calendar export (optional) |

---

## Key URLs (when running locally)

| URL | What it is |
|---|---|
| `http://localhost:3000` | Frontend |
| `http://localhost:5000/docs` | Interactive API docs (Swagger UI) |
| `http://localhost:5000/redoc` | API reference (ReDoc) |
| `http://localhost:5000/api/health` | Backend health check |
| `http://localhost:5000/api/gemini-test` | Test Gemini API connectivity |

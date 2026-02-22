from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import FRONTEND_URL, PORT
from routes import graph, learn, quiz, calendar, social, extract

app = FastAPI(title="Sapling API", version="1.0.0")


@app.on_event("startup")
def _ensure_courses_table():
    """Create/migrate the courses table on startup and seed preset courses."""
    import uuid as _uuid
    from db.connection import get_conn
    conn = get_conn()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS courses (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            course_name TEXT NOT NULL,
            color TEXT DEFAULT NULL,
            created_at TEXT DEFAULT (datetime('now')),
            UNIQUE(user_id, course_name),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)
    # Add color column for databases created before this migration
    try:
        conn.execute("ALTER TABLE courses ADD COLUMN color TEXT DEFAULT NULL")
    except Exception:
        pass  # Column already exists

    # Assign default colors to known courses that are still NULL
    _COURSE_COLORS = {
        "CS 101": "#2563eb",
        "CS 112": "#6366f1",
        "MA 121": "#0d9488",
        "MA 213": "#d97706",
        "MA 311": "#7c3aed",
    }
    for course_name, color in _COURSE_COLORS.items():
        conn.execute(
            "UPDATE courses SET color = ? WHERE course_name = ? AND color IS NULL",
            (color, course_name),
        )

    # Seed preset courses for each user (INSERT OR IGNORE so re-runs are safe)
    _USER_COURSES = {
        "user_andres": ["CS 101", "CS 112", "MA 121", "MA 213", "MA 311"],
        "user_jack":   ["CS 101", "CS 112", "MA 121", "MA 213", "MA 311"],
        "user_luke":   ["MA 121", "MA 213", "MA 311", "CS 101"],
        "user_priya":  ["MA 121", "MA 213", "CS 112"],
    }
    for uid, courses in _USER_COURSES.items():
        for course_name in courses:
            color = _COURSE_COLORS.get(course_name)
            conn.execute(
                "INSERT OR IGNORE INTO courses (id, user_id, course_name, color) VALUES (?, ?, ?, ?)",
                (str(_uuid.uuid4()), uid, course_name, color),
            )

    conn.commit()
    conn.close()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(graph.router,    prefix="/api/graph")
app.include_router(learn.router,    prefix="/api/learn")
app.include_router(quiz.router,     prefix="/api/quiz")
app.include_router(calendar.router, prefix="/api/calendar")
app.include_router(social.router,   prefix="/api/social")
app.include_router(extract.router,  prefix="/api/extract")


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "sapling-backend"}


@app.get("/api/users")
def list_users():
    from db.connection import get_conn
    conn = get_conn()
    rows = conn.execute("SELECT id, name FROM users ORDER BY name").fetchall()
    conn.close()
    return {"users": [{"id": r["id"], "name": r["name"]} for r in rows]}


@app.get("/api/gemini-test")
def gemini_test():
    """Test Gemini connectivity. Shows clear error if API key is missing/wrong."""
    from services.gemini_service import call_gemini
    try:
        reply = call_gemini('Reply with exactly the text: Gemini OK', retries=0)
        return {"ok": True, "reply": reply.strip()}
    except Exception as e:
        return {"ok": False, "error": str(e)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True)

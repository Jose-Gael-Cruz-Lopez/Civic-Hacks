import os
from dotenv import load_dotenv

load_dotenv()

_BASE_DIR = os.path.dirname(os.path.abspath(__file__))

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:5000/api/calendar/callback")

# Resolve DATABASE_PATH relative to this file so it works from any CWD
_db_env = os.getenv("DATABASE_PATH", "")
DATABASE_PATH = os.path.join(_BASE_DIR, _db_env) if _db_env and not os.path.isabs(_db_env) else (_db_env or os.path.join(_BASE_DIR, "sapling.db"))

PORT = int(os.getenv("PORT", "5000"))
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

GOOGLE_SCOPES = [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/calendar.readonly",
]


def get_mastery_tier(score: float) -> str:
    if score >= 0.75:
        return "mastered"
    elif score >= 0.45:
        return "learning"
    elif score >= 0.1:
        return "struggling"
    return "unexplored"

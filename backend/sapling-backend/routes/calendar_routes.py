import sqlite3
import uuid
import os
from datetime import datetime
from flask import Blueprint, jsonify, request, redirect

from config import DATABASE_PATH, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, GOOGLE_SCOPES, FRONTEND_URL
from services.calendar_service import extract_assignments_from_file

try:
    from google_auth_oauthlib.flow import Flow
    from googleapiclient.discovery import build
    from google.oauth2.credentials import Credentials
    GOOGLE_AVAILABLE = True
except ImportError:
    GOOGLE_AVAILABLE = False

calendar_bp = Blueprint("calendar", __name__)


def get_conn():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _google_client_config():
    return {
        "web": {
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uris": [GOOGLE_REDIRECT_URI],
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
        }
    }


@calendar_bp.route("/extract", methods=["POST"])
def extract():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    file = request.files["file"]
    file_bytes = file.read()
    filename = file.filename or "upload"
    content_type = file.content_type or "application/octet-stream"
    try:
        result = extract_assignments_from_file(file_bytes, filename, content_type)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e), "assignments": [], "warnings": [str(e)]}), 500


@calendar_bp.route("/save", methods=["POST"])
def save_assignments():
    data = request.get_json()
    user_id = data.get("user_id", "user_andres")
    assignments = data.get("assignments", [])
    conn = get_conn()
    saved = 0
    for a in assignments:
        aid = str(uuid.uuid4())
        conn.execute(
            "INSERT INTO assignments (id, user_id, title, course_name, due_date, assignment_type, notes) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (aid, user_id, a.get("title", ""), a.get("course_name", ""), a.get("due_date", ""),
             a.get("assignment_type", "other"), a.get("notes")),
        )
        saved += 1
    conn.commit()
    conn.close()
    return jsonify({"saved_count": saved})


@calendar_bp.route("/upcoming/<user_id>")
def get_upcoming(user_id: str):
    conn = get_conn()
    today = datetime.utcnow().strftime("%Y-%m-%d")
    rows = conn.execute(
        "SELECT * FROM assignments WHERE user_id = ? AND due_date >= ? ORDER BY due_date ASC LIMIT 5",
        (user_id, today),
    ).fetchall()
    conn.close()
    return jsonify({"assignments": [dict(r) for r in rows]})


@calendar_bp.route("/suggest-study-blocks", methods=["POST"])
def suggest_study_blocks():
    data = request.get_json()
    user_id = data.get("user_id", "user_andres")
    conn = get_conn()
    today = datetime.utcnow().strftime("%Y-%m-%d")
    assignments = conn.execute(
        "SELECT * FROM assignments WHERE user_id = ? AND due_date >= ? ORDER BY due_date ASC",
        (user_id, today),
    ).fetchall()
    conn.close()
    blocks = []
    for a in assignments:
        a = dict(a)
        blocks.append({
            "topic": a["title"],
            "suggested_date": a["due_date"],
            "duration_minutes": 60,
            "reason": f"Due {a['due_date']}",
            "related_assignment_id": a["id"],
        })
    return jsonify({"study_blocks": blocks[:5]})


@calendar_bp.route("/auth-url")
def auth_url():
    if not GOOGLE_AVAILABLE or not GOOGLE_CLIENT_ID:
        return jsonify({"error": "Google Calendar not configured"}), 400
    flow = Flow.from_client_config(_google_client_config(), scopes=GOOGLE_SCOPES)
    flow.redirect_uri = GOOGLE_REDIRECT_URI
    auth_url_str, _ = flow.authorization_url(prompt="consent")
    return jsonify({"url": auth_url_str})


@calendar_bp.route("/callback")
def callback():
    if not GOOGLE_AVAILABLE:
        return redirect(f"{FRONTEND_URL}/calendar?error=google_not_configured")
    code = request.args.get("code")
    flow = Flow.from_client_config(_google_client_config(), scopes=GOOGLE_SCOPES)
    flow.redirect_uri = GOOGLE_REDIRECT_URI
    flow.fetch_token(code=code)
    creds = flow.credentials
    conn = get_conn()
    conn.execute(
        "INSERT OR REPLACE INTO oauth_tokens (user_id, access_token, refresh_token, expires_at) VALUES (?, ?, ?, ?)",
        ("user_andres", creds.token, creds.refresh_token or "", creds.expiry.isoformat() if creds.expiry else ""),
    )
    conn.commit()
    conn.close()
    return redirect(f"{FRONTEND_URL}/calendar?connected=true")


@calendar_bp.route("/export", methods=["POST"])
def export_to_google():
    if not GOOGLE_AVAILABLE:
        return jsonify({"error": "Google Calendar libraries not installed"}), 400
    data = request.get_json()
    user_id = data.get("user_id", "user_andres")
    assignment_ids = data.get("assignment_ids", [])
    conn = get_conn()
    token_row = conn.execute("SELECT * FROM oauth_tokens WHERE user_id = ?", (user_id,)).fetchone()
    if not token_row:
        conn.close()
        return jsonify({"error": "Not connected to Google Calendar"}), 400
    creds = Credentials(
        token=token_row["access_token"],
        refresh_token=token_row["refresh_token"],
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
        token_uri="https://oauth2.googleapis.com/token",
    )
    service = build("calendar", "v3", credentials=creds)
    exported = 0
    for aid in assignment_ids:
        assignment = conn.execute("SELECT * FROM assignments WHERE id = ?", (aid,)).fetchone()
        if not assignment:
            continue
        a = dict(assignment)
        event = {
            "summary": f"[{a['course_name']}] {a['title']}",
            "description": a.get("notes") or "",
            "start": {"date": a["due_date"]},
            "end": {"date": a["due_date"]},
        }
        created = service.events().insert(calendarId="primary", body=event).execute()
        conn.execute("UPDATE assignments SET google_event_id = ? WHERE id = ?", (created["id"], aid))
        exported += 1
    conn.commit()
    conn.close()
    return jsonify({"exported_count": exported})

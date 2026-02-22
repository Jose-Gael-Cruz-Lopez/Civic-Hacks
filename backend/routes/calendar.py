"""
backend/routes/calendar.py

Merged and fixed version combining:
  - Syllabus extraction, assignment CRUD, study blocks (from current file)
  - sync endpoint (from current file)
  - OAuth state carries user_id so callback stores tokens under the correct user
  - Token refresh: expired access tokens are automatically renewed
  - GET /import/{user_id} pulls Google Calendar events into the app
  - GET /status/{user_id} lets the frontend check connection status
  - DELETE /disconnect/{user_id} removes stored tokens
"""

import uuid
import json
import base64
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import RedirectResponse

from config import (
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI,
    GOOGLE_SCOPES,
    FRONTEND_URL,
)
from db.connection import get_conn
from models import SaveAssignmentsBody, StudyBlockBody, ExportBody, SyncBody
from services.calendar_service import process_and_save_syllabus

try:
    from google_auth_oauthlib.flow import Flow
    from googleapiclient.discovery import build
    from google.oauth2.credentials import Credentials
    from google.auth.transport.requests import Request
    GOOGLE_AVAILABLE = True
except ImportError:
    GOOGLE_AVAILABLE = False

router = APIRouter()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _google_client_config() -> dict:
    return {
        "web": {
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uris": [GOOGLE_REDIRECT_URI],
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
        }
    }


def _encode_state(user_id: str) -> str:
    """Pack user_id into a base64 JSON string for the OAuth state parameter."""
    payload = json.dumps({"user_id": user_id})
    return base64.urlsafe_b64encode(payload.encode()).decode()


def _decode_state(state: str) -> str:
    """Unpack user_id from the OAuth state parameter. Returns empty string on failure."""
    try:
        payload = base64.urlsafe_b64decode(state.encode()).decode()
        return json.loads(payload).get("user_id", "")
    except Exception:
        return ""


def _get_refreshed_credentials(token_row: dict) -> "Credentials":
    """
    Build a Credentials object from a stored token row and refresh if expired.
    Persists the new access token back to the DB automatically.
    """
    creds = Credentials(
        token=token_row["access_token"],
        refresh_token=token_row["refresh_token"],
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
        token_uri="https://oauth2.googleapis.com/token",
    )

    needs_refresh = False
    if token_row.get("expires_at"):
        try:
            expiry = datetime.fromisoformat(token_row["expires_at"])
            if expiry.tzinfo is None:
                expiry = expiry.replace(tzinfo=timezone.utc)
            now = datetime.now(timezone.utc)
            if (expiry - now).total_seconds() < 300:
                needs_refresh = True
        except ValueError:
            needs_refresh = True
    else:
        needs_refresh = True

    if needs_refresh and creds.refresh_token:
        creds.refresh(Request())
        conn = get_conn()
        conn.execute(
            "UPDATE oauth_tokens SET access_token = ?, expires_at = ? WHERE user_id = ?",
            (
                creds.token,
                creds.expiry.isoformat() if creds.expiry else "",
                token_row["user_id"],
            ),
        )
        conn.commit()
        conn.close()

    return creds


def _require_google_creds(user_id: str):
    """
    Fetch stored credentials for a user, refresh if needed, return (creds, conn).
    Raises HTTP 400 if Google isn't configured, 401 if the user isn't connected.
    Caller is responsible for closing conn.
    """
    if not GOOGLE_AVAILABLE or not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=400, detail="Google Calendar not configured")
    conn = get_conn()
    token_row = conn.execute(
        "SELECT * FROM oauth_tokens WHERE user_id = ?", (user_id,)
    ).fetchone()
    if not token_row:
        conn.close()
        raise HTTPException(
            status_code=401,
            detail="Not connected to Google Calendar. Visit /api/calendar/auth-url?user_id=<id> to connect.",
        )
    token_row = dict(token_row)
    creds = _get_refreshed_credentials(token_row)
    return creds, conn


# ── Syllabus extraction ───────────────────────────────────────────────────────

@router.post("/extract")
async def extract(
    file: UploadFile = File(...),
    user_id: str = Form("user_andres"),
):
    file_bytes = await file.read()
    filename = file.filename or "upload"
    content_type = file.content_type or "application/octet-stream"
    try:
        result = process_and_save_syllabus(file_bytes, filename, content_type, user_id)
        return result
    except Exception as e:
        return {"error": str(e), "assignments": [], "saved_count": 0, "warnings": [str(e)]}


# ── Assignment CRUD ───────────────────────────────────────────────────────────

@router.post("/save")
def save_assignments(body: SaveAssignmentsBody):
    conn = get_conn()
    saved = 0
    for a in body.assignments:
        aid = str(uuid.uuid4())
        conn.execute(
            """INSERT INTO assignments
               (id, user_id, title, course_name, due_date, assignment_type, notes)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (aid, body.user_id, a.title, a.course_name, a.due_date, a.assignment_type, a.notes),
        )
        saved += 1
    conn.commit()
    conn.close()
    return {"saved_count": saved}


@router.get("/upcoming/{user_id}")
def get_upcoming(user_id: str):
    conn = get_conn()
    today = datetime.utcnow().strftime("%Y-%m-%d")
    rows = conn.execute(
        "SELECT * FROM assignments WHERE user_id = ? AND due_date >= ? ORDER BY due_date ASC LIMIT 20",
        (user_id, today),
    ).fetchall()
    conn.close()
    return {"assignments": [dict(r) for r in rows]}


@router.post("/suggest-study-blocks")
def suggest_study_blocks(body: StudyBlockBody):
    conn = get_conn()
    today = datetime.utcnow().strftime("%Y-%m-%d")
    assignments = conn.execute(
        "SELECT * FROM assignments WHERE user_id = ? AND due_date >= ? ORDER BY due_date ASC",
        (body.user_id, today),
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
    return {"study_blocks": blocks[:5]}


# ── Google OAuth ──────────────────────────────────────────────────────────────

@router.get("/auth-url")
def auth_url(user_id: str = Query(..., description="The Sapling user_id to connect")):
    """
    Returns a Google OAuth consent URL. user_id is embedded in the state
    parameter so the callback knows whose tokens to store.
    """
    if not GOOGLE_AVAILABLE or not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=400, detail="Google Calendar not configured")
    flow = Flow.from_client_config(_google_client_config(), scopes=GOOGLE_SCOPES)
    flow.redirect_uri = GOOGLE_REDIRECT_URI
    auth_url_str, _ = flow.authorization_url(
        prompt="consent",
        access_type="offline",
        state=_encode_state(user_id),
    )
    return {"url": auth_url_str}


@router.get("/callback")
def callback(
    code: str = Query(...),
    state: str = Query(...),
):
    """
    Google redirects here after the user grants consent.
    Decodes user_id from state, exchanges code for tokens, stores them.
    """
    if not GOOGLE_AVAILABLE:
        return RedirectResponse(f"{FRONTEND_URL}/calendar?error=google_not_configured")

    user_id = _decode_state(state)
    if not user_id:
        return RedirectResponse(f"{FRONTEND_URL}/calendar?error=invalid_state")

    conn = get_conn()
    user = conn.execute("SELECT id FROM users WHERE id = ?", (user_id,)).fetchone()
    if not user:
        conn.close()
        return RedirectResponse(f"{FRONTEND_URL}/calendar?error=user_not_found")

    flow = Flow.from_client_config(_google_client_config(), scopes=GOOGLE_SCOPES)
    flow.redirect_uri = GOOGLE_REDIRECT_URI
    flow.fetch_token(code=code)
    creds = flow.credentials

    conn.execute(
        "INSERT OR REPLACE INTO oauth_tokens (user_id, access_token, refresh_token, expires_at) VALUES (?, ?, ?, ?)",
        (
            user_id,
            creds.token,
            creds.refresh_token or "",
            creds.expiry.isoformat() if creds.expiry else "",
        ),
    )
    conn.commit()
    conn.close()

    return RedirectResponse(f"{FRONTEND_URL}/calendar?connected=true&user_id={user_id}")


@router.get("/status/{user_id}")
def calendar_status(user_id: str):
    """Returns whether the user has a connected Google Calendar token."""
    conn = get_conn()
    row = conn.execute(
        "SELECT access_token, expires_at FROM oauth_tokens WHERE user_id = ?", (user_id,)
    ).fetchone()
    conn.close()
    if not row or not row["access_token"]:
        return {"connected": False}
    return {"connected": True, "expires_at": row["expires_at"]}


@router.delete("/disconnect/{user_id}")
def disconnect(user_id: str):
    """Removes stored OAuth tokens for a user, disconnecting their Google Calendar."""
    conn = get_conn()
    conn.execute("DELETE FROM oauth_tokens WHERE user_id = ?", (user_id,))
    conn.commit()
    conn.close()
    return {"disconnected": True}


# ── Google Calendar import ────────────────────────────────────────────────────

@router.get("/import/{user_id}")
def import_from_google(
    user_id: str,
    max_results: int = Query(50, ge=1, le=250),
    days_ahead: int = Query(30, ge=1, le=365),
):
    """
    Pulls upcoming events from the user's primary Google Calendar.
    Returns them as a preview list — the user decides which to save as assignments.
    """
    creds, conn = _require_google_creds(user_id)
    conn.close()

    service = build("calendar", "v3", credentials=creds)
    now = datetime.now(timezone.utc)
    time_min = now.isoformat()
    time_max = (now + timedelta(days=days_ahead)).isoformat()

    result = (
        service.events()
        .list(
            calendarId="primary",
            timeMin=time_min,
            timeMax=time_max,
            maxResults=max_results,
            singleEvents=True,
            orderBy="startTime",
        )
        .execute()
    )

    events = []
    for item in result.get("items", []):
        start = item.get("start", {})
        end = item.get("end", {})
        events.append({
            "google_event_id": item.get("id"),
            "title": item.get("summary", "(No title)"),
            "description": item.get("description", ""),
            "start_date": start.get("date") or start.get("dateTime", "")[:10],
            "end_date": end.get("date") or end.get("dateTime", "")[:10],
            "start_datetime": start.get("dateTime"),
            "end_datetime": end.get("dateTime"),
            "all_day": "date" in start,
            "html_link": item.get("htmlLink"),
            "location": item.get("location", ""),
        })

    return {"events": events, "count": len(events)}


# ── Sync (push all unsynced assignments to Google) ────────────────────────────

@router.post("/sync")
def sync_to_google(body: SyncBody):
    """
    Pushes all unsynced Sapling assignments (no google_event_id) to Google Calendar.
    """
    creds, conn = _require_google_creds(body.user_id)
    service = build("calendar", "v3", credentials=creds)

    unsynced = conn.execute(
        "SELECT * FROM assignments WHERE user_id = ? AND (google_event_id IS NULL OR google_event_id = '')",
        (body.user_id,),
    ).fetchall()

    synced = 0
    for row in unsynced:
        a = dict(row)
        if not a.get("due_date"):
            continue
        event = {
            "summary": f"[{a['course_name']}] {a['title']}" if a.get("course_name") else a["title"],
            "description": a.get("notes") or "",
            "start": {"date": a["due_date"]},
            "end": {"date": a["due_date"]},
        }
        created = service.events().insert(calendarId="primary", body=event).execute()
        conn.execute(
            "UPDATE assignments SET google_event_id = ? WHERE id = ?", (created["id"], a["id"])
        )
        synced += 1

    conn.commit()
    conn.close()
    return {"synced_count": synced}


# ── Export (push selected assignments to Google) ──────────────────────────────

@router.post("/export")
def export_to_google(body: ExportBody):
    """
    Pushes selected Sapling assignments to Google Calendar as all-day events.
    Skips assignments already exported (google_event_id already set).
    """
    creds, conn = _require_google_creds(body.user_id)
    service = build("calendar", "v3", credentials=creds)

    exported = 0
    skipped = 0
    for aid in body.assignment_ids:
        assignment = conn.execute(
            "SELECT * FROM assignments WHERE id = ?", (aid,)
        ).fetchone()
        if not assignment:
            continue
        a = dict(assignment)

        if a.get("google_event_id"):
            skipped += 1
            continue

        event = {
            "summary": f"[{a['course_name']}] {a['title']}" if a.get("course_name") else a["title"],
            "description": a.get("notes") or "",
            "start": {"date": a["due_date"]},
            "end": {"date": a["due_date"]},
        }
        created = service.events().insert(calendarId="primary", body=event).execute()
        conn.execute(
            "UPDATE assignments SET google_event_id = ? WHERE id = ?", (created["id"], aid)
        )
        exported += 1

    conn.commit()
    conn.close()
    return {"exported_count": exported, "skipped_count": skipped}
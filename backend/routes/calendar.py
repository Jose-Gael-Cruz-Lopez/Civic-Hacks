import uuid
from datetime import datetime

from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from fastapi.responses import RedirectResponse

from config import GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, GOOGLE_SCOPES, FRONTEND_URL
from db.connection import get_conn
from models import SaveAssignmentsBody, StudyBlockBody, ExportBody, SyncBody
from services.calendar_service import extract_assignments_from_file

try:
    from google_auth_oauthlib.flow import Flow
    from googleapiclient.discovery import build
    from google.oauth2.credentials import Credentials
    GOOGLE_AVAILABLE = True
except ImportError:
    GOOGLE_AVAILABLE = False

router = APIRouter()


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


@router.post("/extract")
async def extract(file: UploadFile = File(...)):
    file_bytes = await file.read()
    filename = file.filename or "upload"
    content_type = file.content_type or "application/octet-stream"
    try:
        result = extract_assignments_from_file(file_bytes, filename, content_type)
        return result
    except Exception as e:
        return {"error": str(e), "assignments": [], "warnings": [str(e)]}


@router.post("/save")
def save_assignments(body: SaveAssignmentsBody):
    conn = get_conn()
    saved = 0
    for a in body.assignments:
        aid = str(uuid.uuid4())
        conn.execute(
            "INSERT INTO assignments (id, user_id, title, course_name, due_date, assignment_type, notes) VALUES (?, ?, ?, ?, ?, ?, ?)",
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


@router.get("/status/{user_id}")
def calendar_status(user_id: str):
    conn = get_conn()
    row = conn.execute(
        "SELECT access_token FROM oauth_tokens WHERE user_id = ?", (user_id,)
    ).fetchone()
    conn.close()
    return {"connected": row is not None and bool(row["access_token"])}


@router.post("/sync")
def sync_to_google(body: SyncBody):
    if not GOOGLE_AVAILABLE:
        raise HTTPException(status_code=400, detail="Google Calendar libraries not installed")
    conn = get_conn()
    token_row = conn.execute(
        "SELECT * FROM oauth_tokens WHERE user_id = ?", (body.user_id,)
    ).fetchone()
    if not token_row:
        conn.close()
        raise HTTPException(status_code=400, detail="Not connected to Google Calendar")
    creds = Credentials(
        token=token_row["access_token"],
        refresh_token=token_row["refresh_token"],
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
        token_uri="https://oauth2.googleapis.com/token",
    )
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


@router.get("/auth-url")
def auth_url():
    if not GOOGLE_AVAILABLE or not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=400, detail="Google Calendar not configured")
    flow = Flow.from_client_config(_google_client_config(), scopes=GOOGLE_SCOPES)
    flow.redirect_uri = GOOGLE_REDIRECT_URI
    auth_url_str, _ = flow.authorization_url(prompt="consent")
    return {"url": auth_url_str}


@router.get("/callback")
def callback(code: str = Query(...)):
    if not GOOGLE_AVAILABLE:
        return RedirectResponse(f"{FRONTEND_URL}/calendar?error=google_not_configured")
    flow = Flow.from_client_config(_google_client_config(), scopes=GOOGLE_SCOPES)
    flow.redirect_uri = GOOGLE_REDIRECT_URI
    flow.fetch_token(code=code)
    creds = flow.credentials
    conn = get_conn()
    conn.execute(
        "INSERT OR REPLACE INTO oauth_tokens (user_id, access_token, refresh_token, expires_at) VALUES (?, ?, ?, ?)",
        ("user_andres", creds.token, creds.refresh_token or "",
         creds.expiry.isoformat() if creds.expiry else ""),
    )
    conn.commit()
    conn.close()
    return RedirectResponse(f"{FRONTEND_URL}/calendar?connected=true")


@router.post("/export")
def export_to_google(body: ExportBody):
    if not GOOGLE_AVAILABLE:
        raise HTTPException(status_code=400, detail="Google Calendar libraries not installed")
    conn = get_conn()
    token_row = conn.execute(
        "SELECT * FROM oauth_tokens WHERE user_id = ?", (body.user_id,)
    ).fetchone()
    if not token_row:
        conn.close()
        raise HTTPException(status_code=400, detail="Not connected to Google Calendar")
    creds = Credentials(
        token=token_row["access_token"],
        refresh_token=token_row["refresh_token"],
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
        token_uri="https://oauth2.googleapis.com/token",
    )
    service = build("calendar", "v3", credentials=creds)
    exported = 0
    for aid in body.assignment_ids:
        assignment = conn.execute(
            "SELECT * FROM assignments WHERE id = ?", (aid,)
        ).fetchone()
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
        conn.execute(
            "UPDATE assignments SET google_event_id = ? WHERE id = ?", (created["id"], aid)
        )
        exported += 1
    conn.commit()
    conn.close()
    return {"exported_count": exported}

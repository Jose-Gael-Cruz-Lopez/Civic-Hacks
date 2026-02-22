"""
backend/routes/calendar.py

Syllabus extraction, assignment CRUD, Google Calendar OAuth and sync.
Migrated from SQLite to Supabase REST API.
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
from db.connection import table
from models import SaveAssignmentsBody, StudyBlockBody, ExportBody, SyncBody
from services.calendar_service import extract_assignments_from_file

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
    payload = json.dumps({"user_id": user_id})
    return base64.urlsafe_b64encode(payload.encode()).decode()


def _decode_state(state: str) -> str:
    try:
        payload = base64.urlsafe_b64decode(state.encode()).decode()
        return json.loads(payload).get("user_id", "")
    except Exception:
        return ""


def _get_refreshed_credentials(token_row: dict) -> "Credentials":
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
            if (expiry - datetime.now(timezone.utc)).total_seconds() < 300:
                needs_refresh = True
        except ValueError:
            needs_refresh = True
    else:
        needs_refresh = True

    if needs_refresh and creds.refresh_token:
        creds.refresh(Request())
        table("oauth_tokens").update(
            {
                "access_token": creds.token,
                "expires_at": creds.expiry.isoformat() if creds.expiry else "",
            },
            filters={"user_id": f"eq.{token_row['user_id']}"},
        )

    return creds


def _require_google_creds(user_id: str) -> "Credentials":
    if not GOOGLE_AVAILABLE or not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=400, detail="Google Calendar not configured")
    token_rows = table("oauth_tokens").select("*", filters={"user_id": f"eq.{user_id}"})
    if not token_rows:
        raise HTTPException(
            status_code=401,
            detail="Not connected to Google Calendar. Visit /api/calendar/auth-url?user_id=<id> to connect.",
        )
    return _get_refreshed_credentials(token_rows[0])


# ── Syllabus extraction ───────────────────────────────────────────────────────

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


# ── Assignment CRUD ───────────────────────────────────────────────────────────

@router.post("/save")
def save_assignments(body: SaveAssignmentsBody):
    rows = [
        {
            "id": str(uuid.uuid4()),
            "user_id": body.user_id,
            "title": a.title,
            "course_name": a.course_name,
            "due_date": a.due_date,
            "assignment_type": a.assignment_type,
            "notes": a.notes,
        }
        for a in body.assignments
    ]
    if rows:
        table("assignments").insert(rows)
    return {"saved_count": len(rows)}


@router.get("/upcoming/{user_id}")
def get_upcoming(user_id: str):
    today = datetime.utcnow().strftime("%Y-%m-%d")
    rows = table("assignments").select(
        "*",
        filters={"user_id": f"eq.{user_id}", "due_date": f"gte.{today}"},
        order="due_date.asc",
        limit=20,
    )
    return {"assignments": rows}


@router.post("/suggest-study-blocks")
def suggest_study_blocks(body: StudyBlockBody):
    today = datetime.utcnow().strftime("%Y-%m-%d")
    assignments = table("assignments").select(
        "*",
        filters={"user_id": f"eq.{body.user_id}", "due_date": f"gte.{today}"},
        order="due_date.asc",
    )
    blocks = [
        {
            "topic": a["title"],
            "suggested_date": a["due_date"],
            "duration_minutes": 60,
            "reason": f"Due {a['due_date']}",
            "related_assignment_id": a["id"],
        }
        for a in assignments
    ]
    return {"study_blocks": blocks[:5]}


# ── Google OAuth ──────────────────────────────────────────────────────────────

@router.get("/auth-url")
def auth_url(user_id: str = Query(...)):
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
def callback(code: str = Query(...), state: str = Query(...)):
    if not GOOGLE_AVAILABLE:
        return RedirectResponse(f"{FRONTEND_URL}/calendar?error=google_not_configured")

    user_id = _decode_state(state)
    if not user_id:
        return RedirectResponse(f"{FRONTEND_URL}/calendar?error=invalid_state")

    user_rows = table("users").select("id", filters={"id": f"eq.{user_id}"})
    if not user_rows:
        return RedirectResponse(f"{FRONTEND_URL}/calendar?error=user_not_found")

    flow = Flow.from_client_config(_google_client_config(), scopes=GOOGLE_SCOPES)
    flow.redirect_uri = GOOGLE_REDIRECT_URI
    flow.fetch_token(code=code)
    creds = flow.credentials

    table("oauth_tokens").upsert(
        {
            "user_id": user_id,
            "access_token": creds.token,
            "refresh_token": creds.refresh_token or "",
            "expires_at": creds.expiry.isoformat() if creds.expiry else "",
        },
        on_conflict="user_id",
    )
    return RedirectResponse(f"{FRONTEND_URL}/calendar?connected=true&user_id={user_id}")


@router.get("/status/{user_id}")
def calendar_status(user_id: str):
    rows = table("oauth_tokens").select(
        "access_token,expires_at", filters={"user_id": f"eq.{user_id}"}
    )
    if not rows or not rows[0]["access_token"]:
        return {"connected": False}
    return {"connected": True, "expires_at": rows[0]["expires_at"]}


@router.delete("/disconnect/{user_id}")
def disconnect(user_id: str):
    table("oauth_tokens").delete({"user_id": f"eq.{user_id}"})
    return {"disconnected": True}


# ── Google Calendar import ────────────────────────────────────────────────────

@router.get("/import/{user_id}")
def import_from_google(
    user_id: str,
    max_results: int = Query(50, ge=1, le=250),
    days_ahead: int = Query(30, ge=1, le=365),
):
    creds = _require_google_creds(user_id)
    service = build("calendar", "v3", credentials=creds)
    now = datetime.now(timezone.utc)
    result = (
        service.events()
        .list(
            calendarId="primary",
            timeMin=now.isoformat(),
            timeMax=(now + timedelta(days=days_ahead)).isoformat(),
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
    creds = _require_google_creds(body.user_id)
    service = build("calendar", "v3", credentials=creds)

    unsynced = table("assignments").select(
        "*",
        filters={
            "user_id": f"eq.{body.user_id}",
            "google_event_id": "is.null",
        },
    )
    # Also catch empty-string google_event_id
    unsynced += table("assignments").select(
        "*",
        filters={
            "user_id": f"eq.{body.user_id}",
            "google_event_id": "eq.",
        },
    )

    synced = 0
    for a in unsynced:
        if not a.get("due_date"):
            continue
        event = {
            "summary": f"[{a['course_name']}] {a['title']}" if a.get("course_name") else a["title"],
            "description": a.get("notes") or "",
            "start": {"date": a["due_date"]},
            "end": {"date": a["due_date"]},
        }
        created = service.events().insert(calendarId="primary", body=event).execute()
        table("assignments").update(
            {"google_event_id": created["id"]},
            filters={"id": f"eq.{a['id']}"},
        )
        synced += 1

    return {"synced_count": synced}


# ── Export (push selected assignments to Google) ──────────────────────────────

@router.post("/export")
def export_to_google(body: ExportBody):
    creds = _require_google_creds(body.user_id)
    service = build("calendar", "v3", credentials=creds)

    exported = 0
    skipped = 0
    for aid in body.assignment_ids:
        rows = table("assignments").select("*", filters={"id": f"eq.{aid}"})
        if not rows:
            continue
        a = rows[0]

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
        table("assignments").update(
            {"google_event_id": created["id"]},
            filters={"id": f"eq.{aid}"},
        )
        exported += 1

    return {"exported_count": exported, "skipped_count": skipped}

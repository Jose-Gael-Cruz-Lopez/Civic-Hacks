import uuid
import json
import os
from datetime import datetime

from fastapi import APIRouter, HTTPException

from db.connection import get_conn
from models import StartSessionBody, ChatBody, EndSessionBody, ActionBody
from services.gemini_service import call_gemini, extract_graph_update
from services.graph_service import get_graph, apply_graph_update

router = APIRouter()

PROMPTS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "prompts")


def _load_prompt(name: str) -> str:
    with open(os.path.join(PROMPTS_DIR, name)) as f:
        return f.read()


PREAMBLE_TEMPLATE = _load_prompt("preamble.txt")
MODE_PROMPTS = {
    "socratic": _load_prompt("socratic.txt"),
    "expository": _load_prompt("expository.txt"),
    "teachback": _load_prompt("teachback.txt"),
}


def build_system_prompt(mode: str, student_name: str, graph_json: str, last_summary: str = "") -> str:
    preamble = PREAMBLE_TEMPLATE.replace("{student_name}", student_name)
    preamble = preamble.replace("{graph_json}", graph_json)
    preamble = preamble.replace("{last_session_summary}", last_summary or "None")
    return preamble + "\n\n" + MODE_PROMPTS.get(mode, MODE_PROMPTS["socratic"])


def get_conversation_history(session_id: str) -> list:
    conn = get_conn()
    rows = conn.execute(
        "SELECT role, content FROM messages WHERE session_id = ? ORDER BY created_at ASC",
        (session_id,),
    ).fetchall()
    conn.close()
    return [{"role": r["role"], "content": r["content"]} for r in rows]


def format_history_for_prompt(history: list) -> str:
    parts = []
    for msg in history:
        role = "Student" if msg["role"] == "user" else "Sapling"
        parts.append(f"{role}: {msg['content']}")
    return "\n\n".join(parts)


def save_message(session_id: str, role: str, content: str, graph_update: dict = None):
    conn = get_conn()
    mid = str(uuid.uuid4())
    conn.execute(
        "INSERT INTO messages (id, session_id, role, content, graph_update_json, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        (mid, session_id, role, content,
         json.dumps(graph_update) if graph_update else None,
         datetime.utcnow().isoformat()),
    )
    conn.commit()
    conn.close()


def get_user_name(user_id: str) -> str:
    conn = get_conn()
    row = conn.execute("SELECT name FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    return row["name"] if row else "Student"


@router.post("/start-session")
def start_session(body: StartSessionBody):
    session_id = str(uuid.uuid4())
    conn = get_conn()
    conn.execute(
        "INSERT INTO sessions (id, user_id, mode, topic) VALUES (?, ?, ?, ?)",
        (session_id, body.user_id, body.mode, body.topic),
    )
    conn.commit()
    conn.close()

    student_name = get_user_name(body.user_id)
    graph_data = get_graph(body.user_id)
    system_prompt = build_system_prompt(body.mode, student_name, json.dumps(graph_data, indent=2))
    full_prompt = (
        f"{system_prompt}\n\n"
        f"Student wants to learn about: {body.topic}\n\n"
        "Begin the session with a warm greeting and your first question or explanation."
    )

    try:
        raw = call_gemini(full_prompt)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Gemini error: {e}")

    reply, graph_update = extract_graph_update(raw)
    save_message(session_id, "assistant", reply, graph_update)
    apply_graph_update(body.user_id, graph_update)

    return {
        "session_id": session_id,
        "initial_message": reply,
        "graph_state": get_graph(body.user_id),
    }


@router.post("/chat")
def chat(body: ChatBody):
    save_message(body.session_id, "user", body.message)

    student_name = get_user_name(body.user_id)
    graph_data = get_graph(body.user_id)
    history = get_conversation_history(body.session_id)
    history_text = format_history_for_prompt(history[:-1])
    system_prompt = build_system_prompt(body.mode, student_name, json.dumps(graph_data, indent=2))

    full_prompt = (
        f"{system_prompt}\n\n"
        f"CONVERSATION SO FAR:\n{history_text}\n\n"
        f"Student: {body.message}\n\nSapling:"
    )

    try:
        raw = call_gemini(full_prompt)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Gemini error: {e}")

    reply, graph_update = extract_graph_update(raw)
    save_message(body.session_id, "assistant", reply, graph_update)
    mastery_changes = apply_graph_update(body.user_id, graph_update)

    return {"reply": reply, "graph_update": graph_update, "mastery_changes": mastery_changes}


@router.post("/end-session")
def end_session(body: EndSessionBody):
    conn = get_conn()
    session = conn.execute(
        "SELECT user_id, started_at FROM sessions WHERE id = ?", (body.session_id,)
    ).fetchone()
    if not session:
        conn.close()
        raise HTTPException(status_code=404, detail="Session not found")

    conn.execute(
        "UPDATE sessions SET ended_at = ? WHERE id = ?",
        (datetime.utcnow().isoformat(), body.session_id),
    )
    msgs = conn.execute(
        "SELECT graph_update_json FROM messages WHERE session_id = ?", (body.session_id,)
    ).fetchall()
    conn.commit()
    conn.close()

    try:
        elapsed_minutes = int(
            (datetime.utcnow() - datetime.fromisoformat(session["started_at"])).total_seconds() / 60
        )
    except Exception:
        elapsed_minutes = 0

    concepts_covered = set()
    for msg in msgs:
        if msg["graph_update_json"]:
            try:
                gu = json.loads(msg["graph_update_json"])
                for upd in gu.get("updated_nodes", []):
                    concepts_covered.add(upd["concept_name"])
                for nn in gu.get("new_nodes", []):
                    concepts_covered.add(nn["concept_name"])
            except Exception:
                pass

    summary = {
        "concepts_covered": list(concepts_covered),
        "mastery_changes": [],
        "new_connections": [],
        "time_spent_minutes": elapsed_minutes,
        "recommended_next": [],
    }

    conn = get_conn()
    conn.execute(
        "UPDATE sessions SET summary_json = ? WHERE id = ?",
        (json.dumps(summary), body.session_id),
    )
    conn.commit()
    conn.close()
    return {"summary": summary}


@router.get("/sessions/{user_id}")
def list_sessions(user_id: str, limit: int = 10):
    """Return the most recent sessions for a user, newest first."""
    conn = get_conn()
    rows = conn.execute(
        """SELECT s.id, s.topic, s.mode, s.started_at, s.ended_at,
                  COUNT(m.id) AS message_count
           FROM sessions s
           LEFT JOIN messages m ON m.session_id = s.id
           WHERE s.user_id = ?
           GROUP BY s.id
           ORDER BY s.started_at DESC
           LIMIT ?""",
        (user_id, limit),
    ).fetchall()
    conn.close()
    return {
        "sessions": [
            {
                "id": r["id"],
                "topic": r["topic"],
                "mode": r["mode"],
                "started_at": r["started_at"],
                "ended_at": r["ended_at"],
                "message_count": r["message_count"],
                "is_active": r["ended_at"] is None,
            }
            for r in rows
        ]
    }


@router.get("/sessions/{session_id}/resume")
def resume_session(session_id: str):
    """Return session metadata + full message history for client-side resume."""
    conn = get_conn()
    session = conn.execute(
        "SELECT id, user_id, topic, mode, started_at, ended_at FROM sessions WHERE id = ?",
        (session_id,),
    ).fetchone()
    if not session:
        conn.close()
        raise HTTPException(status_code=404, detail="Session not found")

    msgs = conn.execute(
        "SELECT id, role, content, created_at FROM messages WHERE session_id = ? ORDER BY created_at ASC",
        (session_id,),
    ).fetchall()
    conn.close()

    return {
        "session": dict(session),
        "messages": [dict(m) for m in msgs],
    }


@router.post("/action")
def action(body: ActionBody):
    action_prompts = {
        "hint": "The student asked for a hint. Give a small scaffold or clue without giving away the answer.",
        "confused": "The student said they are confused. Identify the likely point of confusion and re-explain with a different analogy.",
        "skip": "The student wants to skip this concept. Acknowledge and transition to the next recommended concept.",
    }

    student_name = get_user_name(body.user_id)
    graph_data = get_graph(body.user_id)
    history = get_conversation_history(body.session_id)
    history_text = format_history_for_prompt(history)
    system_prompt = build_system_prompt(body.mode, student_name, json.dumps(graph_data, indent=2))

    full_prompt = (
        f"{system_prompt}\n\n"
        f"CONVERSATION SO FAR:\n{history_text}\n\n"
        f"[ACTION: {action_prompts.get(body.action_type, '')}]\n\nSapling:"
    )

    try:
        raw = call_gemini(full_prompt)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Gemini error: {e}")

    reply, graph_update = extract_graph_update(raw)
    save_message(body.session_id, "assistant", reply, graph_update)
    apply_graph_update(body.user_id, graph_update)
    return {"reply": reply, "graph_update": graph_update}

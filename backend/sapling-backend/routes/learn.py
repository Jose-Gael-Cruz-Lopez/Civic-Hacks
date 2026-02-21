import sqlite3
import uuid
import json
import os
from datetime import datetime
from flask import Blueprint, jsonify, request

from config import DATABASE_PATH
from services.gemini_service import call_gemini, extract_graph_update
from services.graph_service import get_graph, apply_graph_update

learn_bp = Blueprint("learn", __name__)

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


def get_conn():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def build_system_prompt(mode: str, student_name: str, graph_json: str, last_summary: str = "") -> str:
    preamble = PREAMBLE_TEMPLATE.replace("{student_name}", student_name)
    preamble = preamble.replace("{graph_json}", graph_json)
    preamble = preamble.replace("{last_session_summary}", last_summary or "None")
    mode_prompt = MODE_PROMPTS.get(mode, MODE_PROMPTS["socratic"])
    return preamble + "\n\n" + mode_prompt


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
        (mid, session_id, role, content, json.dumps(graph_update) if graph_update else None,
         datetime.utcnow().isoformat()),
    )
    conn.commit()
    conn.close()


def get_user_name(user_id: str) -> str:
    conn = get_conn()
    row = conn.execute("SELECT name FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    return row["name"] if row else "Student"


@learn_bp.route("/start-session", methods=["POST"])
def start_session():
    data = request.get_json()
    user_id = data.get("user_id", "user_andres")
    topic = data.get("topic", "")
    mode = data.get("mode", "socratic")

    session_id = str(uuid.uuid4())
    conn = get_conn()
    conn.execute(
        "INSERT INTO sessions (id, user_id, mode, topic) VALUES (?, ?, ?, ?)",
        (session_id, user_id, mode, topic),
    )
    conn.commit()
    conn.close()

    student_name = get_user_name(user_id)
    graph_data = get_graph(user_id)
    graph_json = json.dumps(graph_data, indent=2)

    system_prompt = build_system_prompt(mode, student_name, graph_json)
    initial_prompt = (
        f"{system_prompt}\n\n"
        f"Student wants to learn about: {topic}\n\n"
        "Begin the session with a warm greeting and your first question or explanation."
    )

    raw = call_gemini(initial_prompt)
    reply, graph_update = extract_graph_update(raw)
    save_message(session_id, "assistant", reply, graph_update)
    apply_graph_update(user_id, graph_update)
    updated_graph = get_graph(user_id)

    return jsonify({
        "session_id": session_id,
        "initial_message": reply,
        "graph_state": updated_graph,
    })


@learn_bp.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()
    session_id = data.get("session_id")
    user_id = data.get("user_id", "user_andres")
    message = data.get("message", "")
    mode = data.get("mode", "socratic")

    save_message(session_id, "user", message)

    student_name = get_user_name(user_id)
    graph_data = get_graph(user_id)
    graph_json = json.dumps(graph_data, indent=2)
    history = get_conversation_history(session_id)
    history_text = format_history_for_prompt(history[:-1])

    system_prompt = build_system_prompt(mode, student_name, graph_json)
    full_prompt = (
        f"{system_prompt}\n\n"
        f"CONVERSATION SO FAR:\n{history_text}\n\n"
        f"Student: {message}\n\nSapling:"
    )

    raw = call_gemini(full_prompt)
    reply, graph_update = extract_graph_update(raw)
    save_message(session_id, "assistant", reply, graph_update)
    mastery_changes = apply_graph_update(user_id, graph_update)

    return jsonify({
        "reply": reply,
        "graph_update": graph_update,
        "mastery_changes": mastery_changes,
    })


@learn_bp.route("/end-session", methods=["POST"])
def end_session():
    data = request.get_json()
    session_id = data.get("session_id")

    conn = get_conn()
    session = conn.execute("SELECT user_id, started_at FROM sessions WHERE id = ?", (session_id,)).fetchone()
    if not session:
        conn.close()
        return jsonify({"error": "Session not found"}), 404

    conn.execute("UPDATE sessions SET ended_at = ? WHERE id = ?", (datetime.utcnow().isoformat(), session_id))

    msgs = conn.execute("SELECT graph_update_json FROM messages WHERE session_id = ?", (session_id,)).fetchall()
    conn.commit()
    conn.close()

    try:
        start_dt = datetime.fromisoformat(session["started_at"])
        elapsed_minutes = int((datetime.utcnow() - start_dt).total_seconds() / 60)
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
    conn.execute("UPDATE sessions SET summary_json = ? WHERE id = ?", (json.dumps(summary), session_id))
    conn.commit()
    conn.close()

    return jsonify({"summary": summary})


@learn_bp.route("/action", methods=["POST"])
def action():
    data = request.get_json()
    session_id = data.get("session_id")
    user_id = data.get("user_id", "user_andres")
    action_type = data.get("action_type", "hint")
    mode = data.get("mode", "socratic")

    action_prompts = {
        "hint": "The student asked for a hint. Give a small scaffold or clue without giving away the answer.",
        "confused": "The student said they are confused. Identify the likely point of confusion and re-explain with a different analogy.",
        "skip": "The student wants to skip this concept. Acknowledge and transition to the next recommended concept.",
    }

    student_name = get_user_name(user_id)
    graph_data = get_graph(user_id)
    graph_json = json.dumps(graph_data, indent=2)
    history = get_conversation_history(session_id)
    history_text = format_history_for_prompt(history)
    system_prompt = build_system_prompt(mode, student_name, graph_json)
    action_instruction = action_prompts.get(action_type, "")

    full_prompt = (
        f"{system_prompt}\n\n"
        f"CONVERSATION SO FAR:\n{history_text}\n\n"
        f"[ACTION: {action_instruction}]\n\nSapling:"
    )

    raw = call_gemini(full_prompt)
    reply, graph_update = extract_graph_update(raw)
    save_message(session_id, "assistant", reply, graph_update)
    apply_graph_update(user_id, graph_update)

    return jsonify({"reply": reply, "graph_update": graph_update})

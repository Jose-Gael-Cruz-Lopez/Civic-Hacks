import sqlite3
import uuid
import random
import string
from flask import Blueprint, jsonify, request

from config import DATABASE_PATH
from services.graph_service import get_graph
from services.matching_service import find_study_matches
from services.gemini_service import call_gemini

social_bp = Blueprint("social", __name__)


def get_conn():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn


@social_bp.route("/rooms/create", methods=["POST"])
def create_room():
    data = request.get_json()
    user_id = data.get("user_id", "user_andres")
    room_name = data.get("room_name", "Study Room")
    invite_code = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
    room_id = str(uuid.uuid4())
    conn = get_conn()
    conn.execute(
        "INSERT INTO rooms (id, name, invite_code, created_by) VALUES (?, ?, ?, ?)",
        (room_id, room_name, invite_code, user_id),
    )
    conn.execute("INSERT INTO room_members (room_id, user_id) VALUES (?, ?)", (room_id, user_id))
    conn.commit()
    conn.close()
    return jsonify({"room_id": room_id, "invite_code": invite_code})


@social_bp.route("/rooms/join", methods=["POST"])
def join_room():
    data = request.get_json()
    user_id = data.get("user_id", "user_andres")
    invite_code = data.get("invite_code", "").strip().upper()
    conn = get_conn()
    room = conn.execute("SELECT * FROM rooms WHERE invite_code = ?", (invite_code,)).fetchone()
    if not room:
        conn.close()
        return jsonify({"error": "Room not found"}), 404
    room = dict(room)
    existing = conn.execute(
        "SELECT 1 FROM room_members WHERE room_id = ? AND user_id = ?", (room["id"], user_id)
    ).fetchone()
    if not existing:
        conn.execute("INSERT INTO room_members (room_id, user_id) VALUES (?, ?)", (room["id"], user_id))
        conn.commit()
    member_count = conn.execute(
        "SELECT COUNT(*) as c FROM room_members WHERE room_id = ?", (room["id"],)
    ).fetchone()["c"]
    conn.close()
    return jsonify({"room": {**room, "member_count": member_count}})


@social_bp.route("/rooms/<user_id>")
def get_user_rooms(user_id: str):
    conn = get_conn()
    rows = conn.execute(
        """SELECT r.*, COUNT(rm2.user_id) as member_count
           FROM rooms r
           JOIN room_members rm ON r.id = rm.room_id
           LEFT JOIN room_members rm2 ON r.id = rm2.room_id
           WHERE rm.user_id = ?
           GROUP BY r.id""",
        (user_id,),
    ).fetchall()
    conn.close()
    return jsonify({"rooms": [dict(r) for r in rows]})


@social_bp.route("/rooms/<room_id>/overview")
def room_overview(room_id: str):
    conn = get_conn()
    room = conn.execute("SELECT * FROM rooms WHERE id = ?", (room_id,)).fetchone()
    if not room:
        conn.close()
        return jsonify({"error": "Room not found"}), 404
    members_rows = conn.execute(
        "SELECT u.id, u.name FROM users u JOIN room_members rm ON u.id = rm.user_id WHERE rm.room_id = ?",
        (room_id,),
    ).fetchall()
    conn.close()

    members = []
    for m in members_rows:
        graph = get_graph(m["id"])
        members.append({"user_id": m["id"], "name": m["name"], "graph": graph})

    member_summaries = []
    for m in members:
        nodes = m["graph"]["nodes"]
        mastered = [n["concept_name"] for n in nodes if n["mastery_tier"] == "mastered"]
        struggling = [n["concept_name"] for n in nodes if n["mastery_tier"] == "struggling"]
        member_summaries.append(f"{m['name']}: mastered {mastered}, struggling with {struggling}")

    summary_prompt = (
        "Write a 2-3 sentence summary of this study group's collective knowledge:\n"
        + "\n".join(member_summaries)
        + "\nFocus on complementary strengths and shared goals."
    )
    try:
        ai_summary = call_gemini(summary_prompt)
    except Exception:
        ai_summary = "This study group has complementary strengths across multiple subjects."

    return jsonify({"room": dict(room), "members": members, "ai_summary": ai_summary})


@social_bp.route("/rooms/<room_id>/activity")
def room_activity(room_id: str):
    conn = get_conn()
    rows = conn.execute(
        """SELECT ra.*, u.name as user_name FROM room_activity ra
           JOIN users u ON ra.user_id = u.id
           WHERE ra.room_id = ?
           ORDER BY ra.created_at DESC LIMIT 20""",
        (room_id,),
    ).fetchall()
    conn.close()
    activities = []
    for r in rows:
        d = dict(r)
        activities.append({
            "id": d["id"],
            "user_name": d["user_name"],
            "activity_type": d["activity_type"],
            "concept_name": d.get("concept_name"),
            "detail": d.get("detail", ""),
            "created_at": d["created_at"],
        })
    return jsonify({"activities": activities})


@social_bp.route("/rooms/<room_id>/match", methods=["POST"])
def match_partners(room_id: str):
    data = request.get_json()
    user_id = data.get("user_id", "user_andres")
    conn = get_conn()
    members_rows = conn.execute(
        "SELECT u.id, u.name FROM users u JOIN room_members rm ON u.id = rm.user_id WHERE rm.room_id = ?",
        (room_id,),
    ).fetchall()
    conn.close()
    members_with_graphs = []
    for m in members_rows:
        graph = get_graph(m["id"])
        members_with_graphs.append({"user_id": m["id"], "name": m["name"], "graph": graph})
    matches = find_study_matches(user_id, members_with_graphs)
    return jsonify({"matches": matches})

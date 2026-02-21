import uuid
import random
import string

from fastapi import APIRouter, HTTPException, Query

from db.connection import get_conn
from models import CreateRoomBody, JoinRoomBody, MatchBody
from services.graph_service import get_graph
from services.matching_service import find_study_matches
from services.gemini_service import call_gemini

router = APIRouter()


@router.post("/rooms/create")
def create_room(body: CreateRoomBody):
    invite_code = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
    room_id = str(uuid.uuid4())
    conn = get_conn()
    conn.execute(
        "INSERT INTO rooms (id, name, invite_code, created_by) VALUES (?, ?, ?, ?)",
        (room_id, body.room_name, invite_code, body.user_id),
    )
    conn.execute(
        "INSERT INTO room_members (room_id, user_id) VALUES (?, ?)", (room_id, body.user_id)
    )
    conn.commit()
    conn.close()
    return {"room_id": room_id, "invite_code": invite_code}


@router.post("/rooms/join")
def join_room(body: JoinRoomBody):
    conn = get_conn()
    room = conn.execute(
        "SELECT * FROM rooms WHERE invite_code = ?", (body.invite_code.strip().upper(),)
    ).fetchone()
    if not room:
        conn.close()
        raise HTTPException(status_code=404, detail="Room not found")
    room = dict(room)
    existing = conn.execute(
        "SELECT 1 FROM room_members WHERE room_id = ? AND user_id = ?",
        (room["id"], body.user_id),
    ).fetchone()
    if not existing:
        conn.execute(
            "INSERT INTO room_members (room_id, user_id) VALUES (?, ?)", (room["id"], body.user_id)
        )
        conn.commit()
    member_count = conn.execute(
        "SELECT COUNT(*) as c FROM room_members WHERE room_id = ?", (room["id"],)
    ).fetchone()["c"]
    conn.close()
    return {"room": {**room, "member_count": member_count}}


@router.get("/rooms/{user_id}")
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
    return {"rooms": [dict(r) for r in rows]}


@router.get("/rooms/{room_id}/overview")
def room_overview(room_id: str, viewer_id: str = Query("user_andres")):
    conn = get_conn()
    room = conn.execute("SELECT * FROM rooms WHERE id = ?", (room_id,)).fetchone()
    if not room:
        conn.close()
        raise HTTPException(status_code=404, detail="Room not found")
    members_rows = conn.execute(
        "SELECT u.id, u.name FROM users u JOIN room_members rm ON u.id = rm.user_id WHERE rm.room_id = ?",
        (room_id,),
    ).fetchall()
    conn.close()

    members = []
    for m in members_rows:
        members.append({"user_id": m["id"], "name": m["name"], "graph": get_graph(m["id"])})

    member_summaries = []
    for m in members:
        nodes = m["graph"]["nodes"]
        mastered = [n["concept_name"] for n in nodes if n["mastery_tier"] == "mastered"]
        struggling = [n["concept_name"] for n in nodes if n["mastery_tier"] == "struggling"]
        member_summaries.append(f"{m['name']}: mastered {mastered}, struggling with {struggling}")

    try:
        ai_summary = call_gemini(
            "Write a 2-3 sentence summary of this study group's collective knowledge:\n"
            + "\n".join(member_summaries)
            + "\nFocus on complementary strengths and shared goals."
        )
    except Exception as e:
        print(f"Gemini summary failed: {e}")
        ai_summary = "This study group has complementary strengths across multiple subjects."

    return {"room": dict(room), "members": members, "ai_summary": ai_summary}


@router.get("/rooms/{room_id}/activity")
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
    return {"activities": activities}


@router.post("/rooms/{room_id}/match")
def match_partners(room_id: str, body: MatchBody):
    conn = get_conn()
    members_rows = conn.execute(
        "SELECT u.id, u.name FROM users u JOIN room_members rm ON u.id = rm.user_id WHERE rm.room_id = ?",
        (room_id,),
    ).fetchall()
    conn.close()
    members_with_graphs = [
        {"user_id": m["id"], "name": m["name"], "graph": get_graph(m["id"])}
        for m in members_rows
    ]
    try:
        matches = find_study_matches(body.user_id, members_with_graphs)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Gemini error: {e}")
    return {"matches": matches}

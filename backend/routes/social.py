import uuid
import random
import string
from collections import defaultdict

from fastapi import APIRouter, HTTPException, Query

from db.connection import table
from models import CreateRoomBody, JoinRoomBody, MatchBody
from services.graph_service import get_graph
from services.matching_service import find_study_matches
from services.gemini_service import call_gemini
from services.social_cache_service import get_cached_summary, save_summary, invalidate as invalidate_summary

router = APIRouter()


@router.post("/rooms/create")
def create_room(body: CreateRoomBody):
    invite_code = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
    room_id = str(uuid.uuid4())
    table("rooms").insert({
        "id": room_id,
        "name": body.room_name,
        "invite_code": invite_code,
        "created_by": body.user_id,
    })
    table("room_members").insert({"room_id": room_id, "user_id": body.user_id})
    invalidate_summary(room_id)
    return {"room_id": room_id, "invite_code": invite_code}


@router.post("/rooms/join")
def join_room(body: JoinRoomBody):
    room_rows = table("rooms").select(
        "*", filters={"invite_code": f"eq.{body.invite_code.strip().upper()}"}
    )
    if not room_rows:
        raise HTTPException(status_code=404, detail="Room not found")
    room = room_rows[0]

    existing = table("room_members").select(
        "room_id",
        filters={"room_id": f"eq.{room['id']}", "user_id": f"eq.{body.user_id}"},
    )
    if not existing:
        table("room_members").insert({"room_id": room["id"], "user_id": body.user_id})
        invalidate_summary(room["id"])

    members = table("room_members").select("user_id", filters={"room_id": f"eq.{room['id']}"})
    return {"room": {**room, "member_count": len(members)}}


@router.get("/rooms/{user_id}")
def get_user_rooms(user_id: str):
    memberships = table("room_members").select("room_id", filters={"user_id": f"eq.{user_id}"})
    room_ids = [m["room_id"] for m in memberships]
    if not room_ids:
        return {"rooms": []}

    rooms = table("rooms").select("*", filters={"id": f"in.({','.join(room_ids)})"})
    for room in rooms:
        members = table("room_members").select("user_id", filters={"room_id": f"eq.{room['id']}"})
        room["member_count"] = len(members)
    return {"rooms": rooms}


@router.get("/rooms/{room_id}/overview")
def room_overview(room_id: str, viewer_id: str = Query("user_john")):
    room_rows = table("rooms").select("*", filters={"id": f"eq.{room_id}"})
    if not room_rows:
        raise HTTPException(status_code=404, detail="Room not found")
    room = room_rows[0]

    member_id_rows = table("room_members").select("user_id", filters={"room_id": f"eq.{room_id}"})
    member_ids = [m["user_id"] for m in member_id_rows]

    members = []
    if member_ids:
        user_rows = table("users").select(
            "id,name", filters={"id": f"in.({','.join(member_ids)})"}
        )
        for u in user_rows:
            members.append({"user_id": u["id"], "name": u["name"], "graph": get_graph(u["id"])})

    member_summaries = []
    for m in members:
        nodes = m["graph"]["nodes"]
        mastered = [n["concept_name"] for n in nodes if n["mastery_tier"] == "mastered"]
        struggling = [n["concept_name"] for n in nodes if n["mastery_tier"] == "struggling"]
        member_summaries.append(f"{m['name']}: mastered {mastered}, struggling with {struggling}")

    ai_summary = get_cached_summary(room_id, member_summaries)
    if ai_summary is None:
        try:
            ai_summary = call_gemini(
                "Write a 2-3 sentence summary of this study group's collective knowledge:\n"
                + "\n".join(member_summaries)
                + "\nFocus on complementary strengths and shared goals."
            )
            save_summary(room_id, member_summaries, ai_summary)
        except Exception as e:
            print(f"Gemini summary failed: {e}")
            ai_summary = "This study group has complementary strengths across multiple subjects."

    return {"room": room, "members": members, "ai_summary": ai_summary}


@router.get("/rooms/{room_id}/activity")
def room_activity(room_id: str):
    activity_rows = table("room_activity").select(
        "*",
        filters={"room_id": f"eq.{room_id}"},
        order="created_at.desc",
        limit=20,
    )

    user_ids = list(set(a["user_id"] for a in activity_rows))
    user_name_map = {}
    if user_ids:
        user_rows = table("users").select("id,name", filters={"id": f"in.({','.join(user_ids)})"})
        user_name_map = {u["id"]: u["name"] for u in user_rows}

    activities = [
        {
            "id": a["id"],
            "user_name": user_name_map.get(a["user_id"], a["user_id"]),
            "activity_type": a["activity_type"],
            "concept_name": a.get("concept_name"),
            "detail": a.get("detail", ""),
            "created_at": a["created_at"],
        }
        for a in activity_rows
    ]
    return {"activities": activities}


@router.post("/rooms/{room_id}/match")
def match_partners(room_id: str, body: MatchBody):
    member_id_rows = table("room_members").select("user_id", filters={"room_id": f"eq.{room_id}"})
    member_ids = [m["user_id"] for m in member_id_rows]

    members_with_graphs = []
    if member_ids:
        user_rows = table("users").select("id,name", filters={"id": f"in.({','.join(member_ids)})"})
        members_with_graphs = [
            {"user_id": u["id"], "name": u["name"], "graph": get_graph(u["id"])}
            for u in user_rows
        ]

    try:
        matches = find_study_matches(body.user_id, members_with_graphs)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Gemini error: {e}")
    return {"matches": matches}


@router.post("/school-match")
def school_match(body: MatchBody):
    """
    Match the requesting user against all users NOT in any of their study rooms.
    """
    user_room_rows = table("room_members").select(
        "room_id", filters={"user_id": f"eq.{body.user_id}"}
    )
    user_room_ids = [r["room_id"] for r in user_room_rows]

    excluded_ids = set()
    if user_room_ids:
        room_member_rows = table("room_members").select(
            "user_id", filters={"room_id": f"in.({','.join(user_room_ids)})"}
        )
        excluded_ids = {r["user_id"] for r in room_member_rows}

    excluded_ids.add(body.user_id)
    excl_list = list(excluded_ids)

    school_users = table("users").select(
        "id,name",
        filters={"id": f"not.in.({','.join(excl_list)})"},
    )

    members_with_graphs = [
        {"user_id": u["id"], "name": u["name"], "graph": get_graph(u["id"])}
        for u in school_users
    ]

    requester_graph = get_graph(body.user_id)
    requester_rows = table("users").select("name", filters={"id": f"eq.{body.user_id}"})
    requester_name = requester_rows[0]["name"] if requester_rows else body.user_id

    all_members = [
        {"user_id": body.user_id, "name": requester_name, "graph": requester_graph}
    ] + members_with_graphs

    try:
        matches = find_study_matches(body.user_id, all_members)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Matching error: {e}")

    return {"matches": matches}


@router.get("/students")
def get_students():
    """Return a lightweight profile for every user in the DB."""
    users = table("users").select("id,name,streak_count")
    courses_rows = table("courses").select("user_id,course_name")
    nodes_rows = table("graph_nodes").select("user_id,mastery_tier")

    courses_by_user: dict = defaultdict(list)
    for c in courses_rows:
        courses_by_user[c["user_id"]].append(c["course_name"])

    mastery_by_user: dict = defaultdict(
        lambda: {"mastered": 0, "learning": 0, "struggling": 0, "unexplored": 0, "total": 0}
    )
    for n in nodes_rows:
        uid = n["user_id"]
        tier = n["mastery_tier"]
        mastery_by_user[uid]["total"] += 1
        if tier in mastery_by_user[uid]:
            mastery_by_user[uid][tier] += 1

    students = [
        {
            "user_id": u["id"],
            "name": u["name"],
            "streak": u.get("streak_count") or 0,
            "courses": sorted(courses_by_user[u["id"]]),
            "stats": dict(mastery_by_user[u["id"]]),
        }
        for u in users
    ]
    students.sort(key=lambda s: s["name"])
    return {"students": students}

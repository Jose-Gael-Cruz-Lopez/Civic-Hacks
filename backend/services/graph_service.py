import uuid
from datetime import datetime

from config import get_mastery_tier
from db.connection import table


def get_graph(user_id: str) -> dict:
    nodes = table("graph_nodes").select("*", filters={"user_id": f"eq.{user_id}"})

    edges_raw = table("graph_edges").select("*", filters={"user_id": f"eq.{user_id}"})
    edges = [
        {
            "id": e["id"],
            "source": e["source_node_id"],
            "target": e["target_node_id"],
            "strength": e["strength"],
        }
        for e in edges_raw
    ]

    mastered   = sum(1 for n in nodes if n["mastery_tier"] == "mastered")
    learning   = sum(1 for n in nodes if n["mastery_tier"] == "learning")
    struggling = sum(1 for n in nodes if n["mastery_tier"] == "struggling")
    unexplored = sum(1 for n in nodes if n["mastery_tier"] == "unexplored")

    user_rows = table("users").select("streak_count", filters={"id": f"eq.{user_id}"})
    streak = user_rows[0]["streak_count"] if user_rows else 0

    try:
        course_rows = table("courses").select("course_name", filters={"user_id": f"eq.{user_id}"})
        user_course_names = {r["course_name"] for r in course_rows}
    except Exception:
        user_course_names = set()

    stats = {
        "total_nodes": len(nodes),
        "mastered": mastered,
        "learning": learning,
        "struggling": struggling,
        "unexplored": unexplored,
        "streak": streak,
    }

    subject_map: dict = {}
    for n in nodes:
        subj = n.get("subject") or "General"
        subject_map.setdefault(subj, []).append(n)

    subject_nodes = []
    subject_edges = []
    for subj, subj_nodes in subject_map.items():
        root_id = f"subject_root__{subj}"
        avg_mastery = sum(n["mastery_score"] for n in subj_nodes) / len(subj_nodes)
        subject_nodes.append({
            "id": root_id,
            "user_id": user_id,
            "concept_name": subj,
            "mastery_score": round(avg_mastery, 4),
            "mastery_tier": "subject_root",
            "subject": subj,
            "times_studied": sum(n.get("times_studied", 0) for n in subj_nodes),
            "last_studied_at": None,
            "is_subject_root": True,
        })
        for n in subj_nodes:
            subject_edges.append({
                "id": f"subject_edge__{root_id}__{n['id']}",
                "source": root_id,
                "target": n["id"],
                "strength": 0.7,
            })

    for course_name in user_course_names:
        if course_name not in subject_map:
            subject_nodes.append({
                "id": f"subject_root__{course_name}",
                "user_id": user_id,
                "concept_name": course_name,
                "mastery_score": 0.0,
                "mastery_tier": "subject_root",
                "subject": course_name,
                "times_studied": 0,
                "last_studied_at": None,
                "is_subject_root": True,
            })

    return {"nodes": nodes + subject_nodes, "edges": edges + subject_edges, "stats": stats}


# ── Course management ──────────────────────────────────────────────────────────

def get_courses(user_id: str) -> list:
    try:
        rows = table("courses").select(
            "id,course_name,color,created_at",
            filters={"user_id": f"eq.{user_id}"},
            order="created_at.asc",
        )
    except Exception:
        return []
    result = []
    for r in rows:
        node_rows = table("graph_nodes").select(
            "id",
            filters={"user_id": f"eq.{user_id}", "subject": f"eq.{r['course_name']}"},
        )
        result.append({
            "id": r["id"],
            "course_name": r["course_name"],
            "color": r["color"],
            "node_count": len(node_rows),
            "created_at": r["created_at"],
        })
    return result


def add_course(user_id: str, course_name: str, color: str | None = None) -> dict:
    existing = table("courses").select(
        "id",
        filters={"user_id": f"eq.{user_id}", "course_name": f"eq.{course_name}"},
    )
    if existing:
        return {"course_name": course_name, "already_existed": True}
    table("courses").insert({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "course_name": course_name,
        "color": color,
    })
    return {"course_name": course_name, "already_existed": False}


def update_course_color(user_id: str, course_name: str, color: str) -> dict:
    table("courses").update(
        {"color": color},
        filters={"user_id": f"eq.{user_id}", "course_name": f"eq.{course_name}"},
    )
    return {"updated": True}


def delete_course(user_id: str, course_name: str) -> dict:
    node_rows = table("graph_nodes").select(
        "id",
        filters={"user_id": f"eq.{user_id}", "subject": f"eq.{course_name}"},
    )
    node_ids = [n["id"] for n in node_rows]

    if node_ids:
        ids_str = ",".join(node_ids)
        table("quiz_context").delete({"concept_node_id": f"in.({ids_str})"})
        # Delete edges that touch any of these nodes (source or target)
        table("graph_edges").delete({"source_node_id": f"in.({ids_str})"})
        table("graph_edges").delete({"target_node_id": f"in.({ids_str})"})
        table("graph_nodes").delete(
            {"user_id": f"eq.{user_id}", "subject": f"eq.{course_name}"}
        )

    table("courses").delete(
        {"user_id": f"eq.{user_id}", "course_name": f"eq.{course_name}"}
    )
    return {"deleted": True}


def apply_graph_update(user_id: str, graph_update: dict) -> list:
    """Apply a graph_update dict to the DB. Returns mastery_changes list."""
    mastery_changes = []
    touched_subjects: set = set()

    for new_node in graph_update.get("new_nodes", []):
        name = new_node.get("concept_name", "")
        subject = new_node.get("subject", "General")
        init_m = float(new_node.get("initial_mastery", 0.0))
        existing = table("graph_nodes").select(
            "id",
            filters={"user_id": f"eq.{user_id}", "concept_name": f"eq.{name}"},
        )
        if not existing:
            table("graph_nodes").insert({
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "concept_name": name,
                "mastery_score": init_m,
                "mastery_tier": get_mastery_tier(init_m),
                "subject": subject,
            })
        if subject and subject != "General":
            touched_subjects.add(subject)

    for upd in graph_update.get("updated_nodes", []):
        name = upd.get("concept_name", "")
        delta = float(upd.get("mastery_delta", 0.0))
        rows = table("graph_nodes").select(
            "id,mastery_score,times_studied,subject",
            filters={"user_id": f"eq.{user_id}", "concept_name": f"eq.{name}"},
        )
        if rows:
            row = rows[0]
            before = row["mastery_score"]
            after = max(0.0, min(1.0, before + delta))
            table("graph_nodes").update(
                {
                    "mastery_score": after,
                    "mastery_tier": get_mastery_tier(after),
                    "times_studied": row["times_studied"] + 1,
                    "last_studied_at": datetime.utcnow().isoformat(),
                },
                filters={"id": f"eq.{row['id']}"},
            )
            mastery_changes.append({"concept": name, "before": before, "after": after})
            subj = row.get("subject", "")
            if subj and subj != "General":
                touched_subjects.add(subj)

    for new_edge in graph_update.get("new_edges", []):
        src_name = new_edge.get("source", "")
        tgt_name = new_edge.get("target", "")
        strength = float(new_edge.get("strength", 0.5))
        src_rows = table("graph_nodes").select(
            "id", filters={"user_id": f"eq.{user_id}", "concept_name": f"eq.{src_name}"}
        )
        tgt_rows = table("graph_nodes").select(
            "id", filters={"user_id": f"eq.{user_id}", "concept_name": f"eq.{tgt_name}"}
        )
        if src_rows and tgt_rows:
            src_id = src_rows[0]["id"]
            tgt_id = tgt_rows[0]["id"]
            existing_edge = table("graph_edges").select(
                "id",
                filters={
                    "user_id": f"eq.{user_id}",
                    "source_node_id": f"eq.{src_id}",
                    "target_node_id": f"eq.{tgt_id}",
                },
            )
            if not existing_edge:
                table("graph_edges").insert({
                    "id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "source_node_id": src_id,
                    "target_node_id": tgt_id,
                    "strength": strength,
                })

    # Refresh shared course context for every subject touched in this update
    if touched_subjects:
        from services.course_context_service import update_course_context
        for subj in touched_subjects:
            try:
                update_course_context(subj)
            except Exception:
                pass  # never block the main response for a context refresh

    return mastery_changes


def get_recommendations(user_id: str) -> list:
    rows = table("graph_nodes").select(
        "concept_name,mastery_score,mastery_tier",
        filters={
            "user_id": f"eq.{user_id}",
            "mastery_tier": "in.(struggling,learning,unexplored)",
        },
        order="mastery_score.asc",
        limit=5,
    )
    recs = []
    for r in rows:
        tier = r["mastery_tier"]
        if tier == "unexplored":
            reason = "You haven't studied this yet — a great place to start."
        elif tier == "struggling":
            reason = f"You're struggling here ({int(r['mastery_score']*100)}%) — focus here to improve."
        else:
            reason = f"You're making progress ({int(r['mastery_score']*100)}%) — keep going!"
        recs.append({"concept_name": r["concept_name"], "reason": reason})
    return recs

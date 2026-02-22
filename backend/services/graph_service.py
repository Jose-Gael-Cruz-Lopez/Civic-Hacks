import sqlite3
import uuid
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import DATABASE_PATH, get_mastery_tier


def get_conn():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def get_graph(user_id: str) -> dict:
    conn = get_conn()
    nodes_rows = conn.execute(
        "SELECT * FROM graph_nodes WHERE user_id = ?", (user_id,)
    ).fetchall()
    nodes = [dict(r) for r in nodes_rows]

    edges_rows = conn.execute(
        "SELECT * FROM graph_edges WHERE user_id = ?", (user_id,)
    ).fetchall()
    edges = []
    for e in edges_rows:
        ed = dict(e)
        edges.append({
            "id": ed["id"],
            "source": ed["source_node_id"],
            "target": ed["target_node_id"],
            "strength": ed["strength"],
        })

    mastered = sum(1 for n in nodes if n["mastery_tier"] == "mastered")
    learning = sum(1 for n in nodes if n["mastery_tier"] == "learning")
    struggling = sum(1 for n in nodes if n["mastery_tier"] == "struggling")
    unexplored = sum(1 for n in nodes if n["mastery_tier"] == "unexplored")

    user = conn.execute("SELECT streak_count FROM users WHERE id = ?", (user_id,)).fetchone()
    streak = user["streak_count"] if user else 0
    conn.close()

    stats = {
        "total_nodes": len(nodes),
        "mastered": mastered,
        "learning": learning,
        "struggling": struggling,
        "unexplored": unexplored,
        "streak": streak,
    }

    # Build synthetic subject root nodes (one hub per subject)
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

    return {"nodes": nodes + subject_nodes, "edges": edges + subject_edges, "stats": stats}


def apply_graph_update(user_id: str, graph_update: dict) -> list:
    """Apply a graph_update dict to the DB. Returns mastery_changes list."""
    mastery_changes = []
    conn = get_conn()

    for new_node in graph_update.get("new_nodes", []):
        name = new_node.get("concept_name", "")
        subject = new_node.get("subject", "General")
        init_m = float(new_node.get("initial_mastery", 0.0))
        existing = conn.execute(
            "SELECT id FROM graph_nodes WHERE user_id = ? AND concept_name = ?",
            (user_id, name),
        ).fetchone()
        if not existing:
            nid = str(uuid.uuid4())
            tier = get_mastery_tier(init_m)
            conn.execute(
                "INSERT INTO graph_nodes (id, user_id, concept_name, mastery_score, mastery_tier, subject) VALUES (?, ?, ?, ?, ?, ?)",
                (nid, user_id, name, init_m, tier, subject),
            )

    for upd in graph_update.get("updated_nodes", []):
        name = upd.get("concept_name", "")
        delta = float(upd.get("mastery_delta", 0.0))
        row = conn.execute(
            "SELECT id, mastery_score FROM graph_nodes WHERE user_id = ? AND concept_name = ?",
            (user_id, name),
        ).fetchone()
        if row:
            before = row["mastery_score"]
            after = max(0.0, min(1.0, before + delta))
            new_tier = get_mastery_tier(after)
            conn.execute(
                "UPDATE graph_nodes SET mastery_score = ?, mastery_tier = ?, times_studied = times_studied + 1, last_studied_at = ? WHERE id = ?",
                (after, new_tier, datetime.utcnow().isoformat(), row["id"]),
            )
            mastery_changes.append({"concept": name, "before": before, "after": after})

    for new_edge in graph_update.get("new_edges", []):
        src_name = new_edge.get("source", "")
        tgt_name = new_edge.get("target", "")
        strength = float(new_edge.get("strength", 0.5))
        src = conn.execute(
            "SELECT id FROM graph_nodes WHERE user_id = ? AND concept_name = ?", (user_id, src_name)
        ).fetchone()
        tgt = conn.execute(
            "SELECT id FROM graph_nodes WHERE user_id = ? AND concept_name = ?", (user_id, tgt_name)
        ).fetchone()
        if src and tgt:
            existing_edge = conn.execute(
                "SELECT id FROM graph_edges WHERE user_id = ? AND source_node_id = ? AND target_node_id = ?",
                (user_id, src["id"], tgt["id"]),
            ).fetchone()
            if not existing_edge:
                eid = str(uuid.uuid4())
                conn.execute(
                    "INSERT INTO graph_edges (id, user_id, source_node_id, target_node_id, strength) VALUES (?, ?, ?, ?, ?)",
                    (eid, user_id, src["id"], tgt["id"], strength),
                )

    conn.commit()
    conn.close()
    return mastery_changes


def get_recommendations(user_id: str) -> list:
    conn = get_conn()
    rows = conn.execute(
        "SELECT concept_name, mastery_score, mastery_tier FROM graph_nodes WHERE user_id = ? AND mastery_tier IN ('struggling', 'learning', 'unexplored') ORDER BY mastery_score ASC LIMIT 5",
        (user_id,),
    ).fetchall()
    conn.close()
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

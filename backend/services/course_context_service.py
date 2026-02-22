"""
services/course_context_service.py

Builds and caches a shared course-level context from real DB data.
No Gemini calls — pure aggregation of graph_nodes and quiz_context.

The context is stored in the course_context table and refreshed every time
any student's graph is updated (via apply_graph_update in graph_service.py).
"""

from datetime import datetime, timezone

from db.connection import table


def get_course_context(course_name: str) -> dict:
    """Return the cached context_json for a course, or {} if not yet built."""
    if not course_name:
        return {}
    try:
        rows = table("course_context").select(
            "context_json",
            filters={"course_name": f"eq.{course_name}"},
        )
        return rows[0]["context_json"] if rows else {}
    except Exception:
        return {}


def update_course_context(course_name: str) -> None:
    """
    Aggregate mastery + quiz data for all students in course_name and upsert
    into the course_context table. Called automatically after any graph update.
    """
    if not course_name:
        return

    # ── 1. All graph nodes for this course across every user ─────────────────
    node_rows = table("graph_nodes").select(
        "id,concept_name,mastery_score,mastery_tier,user_id",
        filters={"subject": f"eq.{course_name}"},
    )
    if not node_rows:
        return

    # ── 2. Group by concept_name, track per-user scores ──────────────────────
    concept_data: dict = {}
    user_ids: set = set()
    node_id_set: set = set()

    for n in node_rows:
        user_ids.add(n["user_id"])
        node_id_set.add(n["id"])
        name = n["concept_name"]
        if name not in concept_data:
            concept_data[name] = {"scores": [], "tiers": []}
        concept_data[name]["scores"].append(float(n["mastery_score"] or 0.0))
        concept_data[name]["tiers"].append(n["mastery_tier"] or "unexplored")

    student_count = len(user_ids)

    # ── 3. Compute per-concept metrics ────────────────────────────────────────
    concept_metrics: dict = {}
    for name, data in concept_data.items():
        scores = data["scores"]
        tiers = data["tiers"]
        n_s = len(scores)
        avg_mastery = sum(scores) / n_s
        struggling_pct = sum(1 for t in tiers if t == "struggling") / n_s
        mastered_pct = sum(1 for t in tiers if t == "mastered") / n_s
        concept_metrics[name] = {
            "avg_mastery": round(avg_mastery, 3),
            "struggling_pct": round(struggling_pct, 2),
            "mastered_pct": round(mastered_pct, 2),
        }

    struggling_concepts = sorted(
        [
            {
                "concept": name,
                "avg_mastery": m["avg_mastery"],
                "struggling_pct": m["struggling_pct"],
            }
            for name, m in concept_metrics.items()
            if m["struggling_pct"] > 0.2
        ],
        key=lambda x: x["avg_mastery"],
    )

    mastered_concepts = sorted(
        [
            {
                "concept": name,
                "avg_mastery": m["avg_mastery"],
                "mastered_pct": m["mastered_pct"],
            }
            for name, m in concept_metrics.items()
            if m["mastered_pct"] > 0.6
        ],
        key=lambda x: x["avg_mastery"],
        reverse=True,
    )

    concept_difficulty_ranking = sorted(
        [
            {"concept": name, "avg_mastery": m["avg_mastery"]}
            for name, m in concept_metrics.items()
        ],
        key=lambda x: x["avg_mastery"],  # lowest mastery = hardest
    )

    # ── 4. Pull quiz_context for this course's students, filter by node ───────
    user_id_list = list(user_ids)
    try:
        ctx_rows_all = table("quiz_context").select(
            "concept_node_id,context_json",
            filters={"user_id": f"in.({','.join(user_id_list)})"},
        )
    except Exception:
        ctx_rows_all = []

    # Keep only contexts for concepts that belong to this course
    ctx_rows = [r for r in ctx_rows_all if r["concept_node_id"] in node_id_set]

    # ── 5. Deduplicate misconceptions and weak areas (case-insensitive) ───────
    seen: set = set()
    common_misconceptions: list = []
    seen2: set = set()
    weak_areas: list = []

    for ctx in ctx_rows:
        cj = ctx.get("context_json") or {}
        if isinstance(cj, str):
            import json as _json
            try:
                cj = _json.loads(cj)
            except Exception:
                cj = {}

        for m in cj.get("common_mistakes", []):
            m = (m or "").strip()
            if m and m.lower() not in seen:
                seen.add(m.lower())
                common_misconceptions.append(m)

        for w in cj.get("weak_areas", []):
            w = (w or "").strip()
            if w and w.lower() not in seen2:
                seen2.add(w.lower())
                weak_areas.append(w)

    # ── 6. Upsert into course_context ─────────────────────────────────────────
    context = {
        "struggling_concepts": struggling_concepts,
        "mastered_concepts": mastered_concepts,
        "concept_difficulty_ranking": concept_difficulty_ranking,
        "common_misconceptions": common_misconceptions,
        "weak_areas": weak_areas,
        "student_count": student_count,
    }

    table("course_context").upsert(
        {
            "course_name": course_name,
            "context_json": context,
            "student_count": student_count,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
        on_conflict="course_name",
    )

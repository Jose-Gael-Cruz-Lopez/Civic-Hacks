from __future__ import annotations
from typing import Any


def find_study_matches(
    user_id: str,
    members_with_graphs: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """
    Returns matches shaped to match the frontend StudyMatch type:
    {
        partner: { id, name },
        compatibility_score: int (0-100),
        summary: str,
        you_can_teach: [{ concept, your_mastery, their_mastery }],
        they_can_teach: [{ concept, their_mastery, your_mastery }],
        shared_struggles: [{ concept, your_mastery, their_mastery }],
    }
    Mastery values are 0.0–1.0 (the frontend multiplies by 100 for display).
    """

    me = next((m for m in members_with_graphs if m["user_id"] == user_id), None)
    if me is None:
        return []

    # Normalize mastery scores to 0.0–1.0 regardless of whether DB stores 0–100 or 0–1
    def normalize(score: float) -> float:
        if score is None:
            return 0.0
        return score / 100.0 if score > 1.0 else float(score)

    def node_map(member: dict) -> dict[str, dict]:
        return {
            n["concept_name"]: n
            for n in member["graph"]["nodes"]
            if not n.get("is_subject_root") and n.get("mastery_tier") != "subject_root"
        }

    my_nodes = node_map(me)
    my_subjects: set[str] = {
        n["subject"] for n in me["graph"]["nodes"] if n.get("subject") and not n.get("is_subject_root")
    }

    results = []

    for member in members_with_graphs:
        if member["user_id"] == user_id:
            continue

        their_nodes = node_map(member)
        their_subjects: set[str] = {
            n["subject"] for n in member["graph"]["nodes"] if n.get("subject") and not n.get("is_subject_root")
        }

        shared_subjects = sorted(my_subjects & their_subjects)
        common_concepts = set(my_nodes) & set(their_nodes)

        you_can_teach = []
        they_can_teach = []
        shared_struggles = []

        for concept in common_concepts:
            my_m = normalize(my_nodes[concept].get("mastery_score", 0))
            their_m = normalize(their_nodes[concept].get("mastery_score", 0))

            if my_m > 0.70 and their_m < 0.50:
                you_can_teach.append({
                    "concept": concept,
                    "your_mastery": round(my_m, 2),
                    "their_mastery": round(their_m, 2),
                })
            elif their_m > 0.70 and my_m < 0.50:
                they_can_teach.append({
                    "concept": concept,
                    "their_mastery": round(their_m, 2),
                    "your_mastery": round(my_m, 2),
                })
            elif my_m < 0.50 and their_m < 0.50:
                shared_struggles.append({
                    "concept": concept,
                    "your_mastery": round(my_m, 2),
                    "their_mastery": round(their_m, 2),
                })

        # Sort by gap size descending
        you_can_teach.sort(key=lambda t: t["your_mastery"] - t["their_mastery"], reverse=True)
        they_can_teach.sort(key=lambda t: t["their_mastery"] - t["your_mastery"], reverse=True)

        # ── Subject overlap: Jaccard ratio (0–1) ──────────────────────────
        all_subjects = my_subjects | their_subjects
        subject_pct = len(shared_subjects) / len(all_subjects) if all_subjects else 0.0

        # ── Complementarity: power-scaled teaching effectiveness ──────────
        # Uses gap^0.7 per pair so moderate gaps still count meaningfully,
        # normalized by n^0.7 so more concepts don't unfairly dilute the score.
        n = len(common_concepts)
        teaching_pairs = you_can_teach + they_can_teach
        if n > 0 and teaching_pairs:
            effective_teach = sum(
                abs(t["your_mastery"] - t["their_mastery"]) ** 0.7
                for t in teaching_pairs
            )
            complementarity_component = min(1.0, effective_teach / (n ** 0.7))
        else:
            complementarity_component = 0.0

        # Struggle bonus: shared weak areas are worth studying together
        struggle_bonus = min(0.20, len(shared_struggles) / n * 0.35) if n > 0 else 0.0

        complementarity_pct = min(1.0, complementarity_component + struggle_bonus)

        # ── Final: 30% subject relevance + 70% complementarity ───────────
        raw = subject_pct * 30 + complementarity_pct * 70
        total_score = max(18, min(92, round(raw * 1.3)))

        # Build summary
        teach_lines = []
        if they_can_teach:
            teach_lines.append(f"{member['name']} can help you with {they_can_teach[0]['concept']}")
        if you_can_teach:
            teach_lines.append(f"you can help them with {you_can_teach[0]['concept']}")
        if shared_struggles:
            teach_lines.append(f"you can tackle {shared_struggles[0]['concept']} together")

        if teach_lines and shared_subjects:
            summary = f"Both studying {', '.join(shared_subjects[:2])}; {'; '.join(teach_lines)}."
        elif teach_lines:
            summary = "; ".join(teach_lines).capitalize() + "."
        elif shared_subjects:
            summary = f"Both studying {', '.join(shared_subjects)}."
        else:
            summary = "Overlapping study areas with complementary knowledge."

        results.append({
            "partner": {"id": member["user_id"], "name": member["name"]},
            "compatibility_score": total_score,
            "summary": summary,
            "you_can_teach": you_can_teach[:5],
            "they_can_teach": they_can_teach[:5],
            "shared_struggles": shared_struggles[:5],
        })

    results.sort(key=lambda r: r["compatibility_score"], reverse=True)
    return results
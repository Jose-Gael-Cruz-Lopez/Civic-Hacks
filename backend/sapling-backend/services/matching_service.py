import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.gemini_service import call_gemini_json

PROMPT_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "prompts", "study_match.txt")


def find_study_matches(requesting_user_id: str, members_with_graphs: list) -> list:
    """
    members_with_graphs: list of { user_id, name, graph: {nodes, edges} }
    Returns StudyMatch list from requesting user's perspective.
    """
    with open(PROMPT_PATH) as f:
        prompt_template = f.read()

    prompt = prompt_template + f"\n\nMEMBERS:\n{json.dumps(members_with_graphs, indent=2)}"
    result = call_gemini_json(prompt)
    pairings = result.get("pairings", [])

    matches = []
    for p in pairings:
        a_id = p.get("student_a_id")
        b_id = p.get("student_b_id")
        if requesting_user_id not in (a_id, b_id):
            continue

        partner_id = b_id if a_id == requesting_user_id else a_id
        partner_info = next((m for m in members_with_graphs if m["user_id"] == partner_id), None)
        partner_name = partner_info["name"] if partner_info else partner_id

        if a_id == requesting_user_id:
            you_teach = [{"concept": x["concept"], "your_mastery": x["a_mastery"], "their_mastery": x["b_mastery"]}
                         for x in p.get("a_teaches_b", [])]
            they_teach = [{"concept": x["concept"], "their_mastery": x["b_mastery"], "your_mastery": x["a_mastery"]}
                          for x in p.get("b_teaches_a", [])]
        else:
            you_teach = [{"concept": x["concept"], "your_mastery": x["b_mastery"], "their_mastery": x["a_mastery"]}
                         for x in p.get("b_teaches_a", [])]
            they_teach = [{"concept": x["concept"], "their_mastery": x["a_mastery"], "your_mastery": x["b_mastery"]}
                          for x in p.get("a_teaches_b", [])]

        shared = [{"concept": x["concept"], "your_mastery": x.get("a_mastery", 0), "their_mastery": x.get("b_mastery", 0)}
                  for x in p.get("shared_struggles", [])]

        matches.append({
            "partner": {"id": partner_id, "name": partner_name},
            "you_can_teach": you_teach,
            "they_can_teach": they_teach,
            "shared_struggles": shared,
            "compatibility_score": p.get("compatibility_score", 0),
            "summary": p.get("summary", ""),
        })

    return matches

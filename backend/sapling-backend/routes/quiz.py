import uuid
import json
import os
from datetime import datetime

from fastapi import APIRouter, HTTPException

from config import get_mastery_tier
from db.connection import get_conn
from models import GenerateQuizBody, SubmitQuizBody
from services.gemini_service import call_gemini_json
from services.graph_service import get_graph
from services.quiz_context_service import get_quiz_context, save_quiz_context

router = APIRouter()

PROMPTS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "prompts")


def _load_prompt(name: str) -> str:
    with open(os.path.join(PROMPTS_DIR, name)) as f:
        return f.read()


@router.post("/generate")
def generate_quiz(body: GenerateQuizBody):
    conn = get_conn()
    node = conn.execute(
        "SELECT * FROM graph_nodes WHERE id = ?", (body.concept_node_id,)
    ).fetchone()
    conn.close()
    if not node:
        raise HTTPException(status_code=404, detail="Concept node not found")

    node = dict(node)
    graph_data = get_graph(body.user_id)
    quiz_ctx = get_quiz_context(body.user_id, body.concept_node_id)
    quiz_ctx_str = json.dumps(quiz_ctx, indent=2) if quiz_ctx else "No previous quiz history."

    prompt = (
        _load_prompt("quiz_generation.txt")
        .replace("{concept_name}", node["concept_name"])
        .replace("{mastery_score}", str(int(node["mastery_score"] * 100)))
        .replace("{difficulty}", body.difficulty)
        .replace("{num_questions}", str(body.num_questions))
        .replace("{graph_json_subset}", json.dumps(graph_data["nodes"][:10], indent=2))
        .replace("{quiz_context_json}", quiz_ctx_str)
    )

    try:
        result = call_gemini_json(prompt)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Gemini error: {e}")

    questions = result.get("questions", [])
    quiz_id = str(uuid.uuid4())
    conn = get_conn()
    conn.execute(
        "INSERT INTO quiz_attempts (id, user_id, concept_node_id, difficulty, questions_json) VALUES (?, ?, ?, ?, ?)",
        (quiz_id, body.user_id, body.concept_node_id, body.difficulty, json.dumps(questions)),
    )
    conn.commit()
    conn.close()
    return {"quiz_id": quiz_id, "questions": questions}


@router.post("/submit")
def submit_quiz(body: SubmitQuizBody):
    conn = get_conn()
    attempt = conn.execute(
        "SELECT * FROM quiz_attempts WHERE id = ?", (body.quiz_id,)
    ).fetchone()
    if not attempt:
        conn.close()
        raise HTTPException(status_code=404, detail="Quiz not found")

    attempt = dict(attempt)
    questions = json.loads(attempt["questions_json"])
    user_id = attempt["user_id"]
    concept_node_id = attempt["concept_node_id"]

    answer_map = {a.question_id: a.selected_label for a in body.answers}
    results = []
    score = 0
    for q in questions:
        qid = q["id"]
        selected = answer_map.get(qid, "")
        correct_opt = next((o for o in q["options"] if o.get("correct")), None)
        correct_label = correct_opt["label"] if correct_opt else ""
        is_correct = selected == correct_label
        if is_correct:
            score += 1
        results.append({
            "question_id": qid,
            "selected": selected,
            "correct": is_correct,
            "correct_answer": correct_label,
            "explanation": q.get("explanation", ""),
        })

    total = len(questions)
    node = conn.execute(
        "SELECT mastery_score FROM graph_nodes WHERE id = ?", (concept_node_id,)
    ).fetchone()
    mastery_before = node["mastery_score"] if node else 0.0
    mastery_after = max(0.0, min(1.0, mastery_before + (score * 0.03) - ((total - score) * 0.02)))
    new_tier = get_mastery_tier(mastery_after)

    conn.execute(
        "UPDATE graph_nodes SET mastery_score = ?, mastery_tier = ?, times_studied = times_studied + 1, last_studied_at = ? WHERE id = ?",
        (mastery_after, new_tier, datetime.utcnow().isoformat(), concept_node_id),
    )
    conn.execute(
        "UPDATE quiz_attempts SET score = ?, total = ?, answers_json = ?, completed_at = ? WHERE id = ?",
        (score, total, json.dumps([a.model_dump() for a in body.answers]),
         datetime.utcnow().isoformat(), body.quiz_id),
    )
    conn.commit()

    node2 = conn.execute(
        "SELECT concept_name FROM graph_nodes WHERE id = ?", (concept_node_id,)
    ).fetchone()
    user_row = conn.execute("SELECT name FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()

    existing_ctx = get_quiz_context(user_id, concept_node_id)
    ctx_prompt = (
        _load_prompt("quiz_context_update.txt")
        .replace("{concept_name}", node2["concept_name"] if node2 else "Unknown")
        .replace("{student_name}", user_row["name"] if user_row else "Student")
        .replace("{existing_quiz_context_json}", json.dumps(existing_ctx) if existing_ctx else "{}")
        .replace("{score}", str(score))
        .replace("{total}", str(total))
        .replace("{quiz_results_json}", json.dumps(results, indent=2))
    )
    try:
        new_ctx = call_gemini_json(ctx_prompt)
        save_quiz_context(user_id, concept_node_id, new_ctx)
    except Exception:
        pass

    return {
        "score": score,
        "total": total,
        "mastery_before": mastery_before,
        "mastery_after": mastery_after,
        "results": results,
    }

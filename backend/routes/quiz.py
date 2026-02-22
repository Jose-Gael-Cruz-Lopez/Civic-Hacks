import uuid
import json
import os
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, HTTPException

from config import get_mastery_tier
from db.connection import table
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
    node_rows = table("graph_nodes").select("*", filters={"id": f"eq.{body.concept_node_id}"})
    if not node_rows:
        raise HTTPException(status_code=404, detail="Concept node not found")
    node = node_rows[0]

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
    table("quiz_attempts").insert({
        "id": quiz_id,
        "user_id": body.user_id,
        "concept_node_id": body.concept_node_id,
        "difficulty": body.difficulty,
        "questions_json": questions,
    })
    return {"quiz_id": quiz_id, "questions": questions}


@router.post("/submit")
def submit_quiz(body: SubmitQuizBody, background_tasks: BackgroundTasks):
    attempt_rows = table("quiz_attempts").select("*", filters={"id": f"eq.{body.quiz_id}"})
    if not attempt_rows:
        raise HTTPException(status_code=404, detail="Quiz not found")
    attempt = attempt_rows[0]

    questions = attempt["questions_json"]
    if isinstance(questions, str):
        questions = json.loads(questions)
    user_id = attempt["user_id"]
    concept_node_id = attempt["concept_node_id"]

    answer_map = {str(a.question_id): a.selected_label for a in body.answers}
    results = []
    score = 0
    for q in questions:
        qid = str(q["id"])
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

    node_rows = table("graph_nodes").select(
        "mastery_score,times_studied",
        filters={"id": f"eq.{concept_node_id}"},
    )
    mastery_before = node_rows[0]["mastery_score"] if node_rows else 0.0
    mastery_after = max(0.0, min(1.0, mastery_before + (score * 0.03) - ((total - score) * 0.02)))
    new_tier = get_mastery_tier(mastery_after)
    times_studied = (node_rows[0]["times_studied"] if node_rows else 0) + 1

    table("graph_nodes").update(
        {
            "mastery_score": mastery_after,
            "mastery_tier": new_tier,
            "times_studied": times_studied,
            "last_studied_at": datetime.utcnow().isoformat(),
        },
        filters={"id": f"eq.{concept_node_id}"},
    )
    table("quiz_attempts").update(
        {
            "score": score,
            "total": total,
            "answers_json": [a.model_dump() for a in body.answers],
            "completed_at": datetime.utcnow().isoformat(),
        },
        filters={"id": f"eq.{body.quiz_id}"},
    )

    node2_rows = table("graph_nodes").select(
        "concept_name", filters={"id": f"eq.{concept_node_id}"}
    )
    user_rows = table("users").select("name", filters={"id": f"eq.{user_id}"})
    concept_name = node2_rows[0]["concept_name"] if node2_rows else "Unknown"
    student_name = user_rows[0]["name"] if user_rows else "Student"

    existing_ctx = get_quiz_context(user_id, concept_node_id)
    ctx_prompt = (
        _load_prompt("quiz_context_update.txt")
        .replace("{concept_name}", concept_name)
        .replace("{student_name}", student_name)
        .replace("{existing_quiz_context_json}", json.dumps(existing_ctx) if existing_ctx else "{}")
        .replace("{score}", str(score))
        .replace("{total}", str(total))
        .replace("{quiz_results_json}", json.dumps(results, indent=2))
    )

    def _update_context(prompt: str, uid: str, node_id: str):
        try:
            new_ctx = call_gemini_json(prompt)
            save_quiz_context(uid, node_id, new_ctx)
        except Exception:
            pass

    background_tasks.add_task(_update_context, ctx_prompt, user_id, concept_node_id)

    return {
        "score": score,
        "total": total,
        "mastery_before": mastery_before,
        "mastery_after": mastery_after,
        "results": results,
    }

import uuid
from datetime import datetime

from db.connection import table


def get_quiz_context(user_id: str, concept_node_id: str):
    rows = table("quiz_context").select(
        "context_json",
        filters={"user_id": f"eq.{user_id}", "concept_node_id": f"eq.{concept_node_id}"},
    )
    if rows:
        return rows[0]["context_json"]
    return None


def save_quiz_context(user_id: str, concept_node_id: str, context: dict):
    table("quiz_context").upsert(
        {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "concept_node_id": concept_node_id,
            "context_json": context,
            "updated_at": datetime.utcnow().isoformat(),
        },
        on_conflict="user_id,concept_node_id",
    )

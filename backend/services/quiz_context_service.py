import sqlite3
import json
import uuid
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import DATABASE_PATH


def get_conn():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def get_quiz_context(user_id: str, concept_node_id: str):
    conn = get_conn()
    row = conn.execute(
        "SELECT context_json FROM quiz_context WHERE user_id = ? AND concept_node_id = ?",
        (user_id, concept_node_id),
    ).fetchone()
    conn.close()
    if row:
        return json.loads(row["context_json"])
    return None


def save_quiz_context(user_id: str, concept_node_id: str, context: dict):
    conn = get_conn()
    ctx_json = json.dumps(context)
    now = datetime.utcnow().isoformat()
    existing = conn.execute(
        "SELECT id FROM quiz_context WHERE user_id = ? AND concept_node_id = ?",
        (user_id, concept_node_id),
    ).fetchone()
    if existing:
        conn.execute(
            "UPDATE quiz_context SET context_json = ?, updated_at = ? WHERE user_id = ? AND concept_node_id = ?",
            (ctx_json, now, user_id, concept_node_id),
        )
    else:
        cid = str(uuid.uuid4())
        conn.execute(
            "INSERT INTO quiz_context (id, user_id, concept_node_id, context_json, updated_at) VALUES (?, ?, ?, ?, ?)",
            (cid, user_id, concept_node_id, ctx_json, now),
        )
    conn.commit()
    conn.close()

import os
import sys
import uuid

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.extraction_service import extract_text_from_file
from services.gemini_service import call_gemini_json
from db.connection import get_conn

PROMPT_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "prompts", "syllabus_extraction.txt")


def parse_syllabus(extracted_text: str) -> dict:
    """Use Gemini to parse assignments from extracted text."""
    with open(PROMPT_PATH) as f:
        prompt_template = f.read()
    prompt = prompt_template + f"\n\nDOCUMENT TEXT:\n{extracted_text}"
    return call_gemini_json(prompt)


def save_assignments_to_db(user_id: str, assignments: list) -> int:
    """Write extracted assignment dicts straight to the DB. Returns count saved."""
    conn = get_conn()
    saved = 0
    for a in assignments:
        title = (a.get("title") or "").strip()
        due_date = (a.get("due_date") or "").strip()
        if not title or not due_date:
            continue
        conn.execute(
            "INSERT INTO assignments "
            "(id, user_id, title, course_name, due_date, assignment_type, notes) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (
                str(uuid.uuid4()),
                user_id,
                title,
                a.get("course_name") or "",
                due_date,
                a.get("assignment_type") or "other",
                a.get("notes"),
            ),
        )
        saved += 1
    conn.commit()
    conn.close()
    return saved


def extract_assignments_from_file(file_bytes: bytes, filename: str, content_type: str) -> dict:
    """Extract text from file then parse assignments with Gemini."""
    text = extract_text_from_file(file_bytes, filename, content_type)
    if not text.strip():
        return {"assignments": [], "warnings": ["No text could be extracted from the file."]}
    result = parse_syllabus(text)
    result.setdefault("raw_text", text)
    return result


def process_and_save_syllabus(
    file_bytes: bytes, filename: str, content_type: str, user_id: str
) -> dict:
    """Full pipeline: OCR → Gemini → DB save in one call."""
    result = extract_assignments_from_file(file_bytes, filename, content_type)
    assignments = result.get("assignments") or []
    saved_count = save_assignments_to_db(user_id, assignments) if assignments else 0
    return {
        "assignments": assignments,
        "saved_count": saved_count,
        "warnings": result.get("warnings") or [],
        "raw_text": result.get("raw_text") or "",
    }

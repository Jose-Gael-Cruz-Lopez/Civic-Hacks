"""
calendar_service.py
OCR text extraction + Gemini-powered assignment parser.
"""
import os

from services.extraction_service import extract_text_from_file
from services.gemini_service import call_gemini_json

_PROMPT_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "prompts", "syllabus_extraction.txt",
)


def _load_prompt() -> str:
    with open(_PROMPT_PATH, "r", encoding="utf-8") as f:
        return f.read().strip()


def parse_assignments_with_gemini(text: str) -> dict:
    """Send OCR-extracted text to Gemini and return structured assignment data."""
    prompt = f"{_load_prompt()}\n\n---\n\n{text}"
    try:
        result = call_gemini_json(prompt)
        if not isinstance(result, dict):
            raise ValueError("Gemini returned non-dict response")
        result.setdefault("assignments", [])
        result.setdefault("warnings", [])
        return result
    except Exception as e:
        return {
            "assignments": [],
            "warnings": [f"Gemini parsing failed: {e}"],
        }


def extract_assignments_from_file(file_bytes: bytes, filename: str, content_type: str) -> dict:
    """
    OCR/native-extract text from the uploaded file, then use Gemini to parse
    structured assignment data. Returns {assignments, warnings, raw_text}.
    """
    text = extract_text_from_file(file_bytes, filename, content_type)
    if not text.strip():
        return {
            "assignments": [],
            "warnings": ["No text could be extracted. Try a clearer scan or a text-based PDF."],
            "raw_text": "",
        }
    result = parse_assignments_with_gemini(text)
    result["raw_text"] = text
    return result

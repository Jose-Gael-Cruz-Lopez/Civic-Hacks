import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.extraction_service import extract_text_from_file
from services.gemini_service import call_gemini_json

PROMPT_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "prompts", "syllabus_extraction.txt")


def parse_syllabus(extracted_text: str) -> dict:
    """Use Gemini to parse assignments from extracted text."""
    with open(PROMPT_PATH) as f:
        prompt_template = f.read()
    prompt = prompt_template + f"\n\nDOCUMENT TEXT:\n{extracted_text}"
    return call_gemini_json(prompt)


def extract_assignments_from_file(file_bytes: bytes, filename: str, content_type: str) -> dict:
    """Extract text from file then parse assignments with Gemini."""
    text = extract_text_from_file(file_bytes, filename, content_type)
    if not text.strip():
        return {"assignments": [], "warnings": ["No text could be extracted from the file."]}
    return parse_syllabus(text)

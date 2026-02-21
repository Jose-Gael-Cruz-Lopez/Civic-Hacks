import os
import sys
import requests

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import EXTRACTION_BACKEND_URL
from services.gemini_service import call_gemini_json

PROMPT_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "prompts", "syllabus_extraction.txt")


def extract_text_from_file(file_bytes: bytes, filename: str, content_type: str) -> str:
    """Call the extraction-backend to get raw text from PDF or image."""
    if content_type == "application/pdf" or filename.lower().endswith(".pdf"):
        url = f"{EXTRACTION_BACKEND_URL}/extract/pdf"
        files = {"file": (filename, file_bytes, "application/pdf")}
    else:
        url = f"{EXTRACTION_BACKEND_URL}/extract/image"
        files = {"file": (filename, file_bytes, content_type)}

    resp = requests.post(url, files=files, timeout=60)
    resp.raise_for_status()
    data = resp.json()
    return data.get("text", "")


def parse_syllabus(extracted_text: str) -> dict:
    """Use Gemini to parse assignments from extracted text."""
    with open(PROMPT_PATH) as f:
        prompt_template = f.read()

    prompt = prompt_template + f"\n\nDOCUMENT TEXT:\n{extracted_text}"
    return call_gemini_json(prompt)


def extract_assignments_from_file(file_bytes: bytes, filename: str, content_type: str) -> dict:
    """Full pipeline: extract text via extraction-backend, then parse with Gemini."""
    text = extract_text_from_file(file_bytes, filename, content_type)
    if not text.strip():
        return {"assignments": [], "warnings": ["No text could be extracted from the file."]}
    return parse_syllabus(text)

import json
import re
import time
import os
import sys

from google import genai
from google.genai import types

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import GEMINI_API_KEY

_client = genai.Client(api_key=GEMINI_API_KEY)
_MODEL = "gemini-2.5-flash"


def _strip_backtick_fencing(text: str) -> str:
    """Extract JSON content, handling backtick fences anywhere in the text."""
    text = text.strip()
    # If there's a fenced block anywhere, extract its contents
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    if match:
        return match.group(1).strip()
    return text


def _extract_json(text: str) -> str:
    """Find the first complete JSON object or array in text."""
    text = _strip_backtick_fencing(text)
    # Try as-is first
    try:
        json.loads(text)
        return text
    except json.JSONDecodeError:
        pass
    # Walk forward to find start of JSON
    for start_char in ('{', '['):
        idx = text.find(start_char)
        if idx == -1:
            continue
        end_char = '}' if start_char == '{' else ']'
        depth = 0
        for i, ch in enumerate(text[idx:], idx):
            if ch == start_char:
                depth += 1
            elif ch == end_char:
                depth -= 1
                if depth == 0:
                    candidate = text[idx:i + 1]
                    try:
                        json.loads(candidate)
                        return candidate
                    except json.JSONDecodeError:
                        break
    return text  # give up, let json.loads raise


def call_gemini(prompt: str, retries: int = 1) -> str:
    for attempt in range(retries + 1):
        try:
            response = _client.models.generate_content(
                model=_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.7,
                    max_output_tokens=4096,
                ),
            )
            if response.text is None:
                raise ValueError("Gemini returned empty response (content may have been filtered)")
            return response.text
        except Exception as e:
            err_str = str(e)
            if attempt < retries and ("429" in err_str or "500" in err_str):
                time.sleep(2)
                continue
            raise


def call_gemini_json(prompt: str):
    raw = call_gemini(prompt)
    cleaned = _extract_json(raw)
    return json.loads(cleaned)


def extract_graph_update(response_text: str) -> tuple:
    """
    Extract <graph_update>...</graph_update> block from AI response.
    Returns (conversational_text, graph_update_dict).
    """
    pattern = r"<graph_update>(.*?)</graph_update>"
    match = re.search(pattern, response_text, re.DOTALL)

    graph_update = {
        "new_nodes": [],
        "updated_nodes": [],
        "new_edges": [],
        "recommended_next": [],
    }

    if match:
        raw_json = match.group(1).strip()
        try:
            graph_update = json.loads(_strip_backtick_fencing(raw_json))
        except json.JSONDecodeError:
            pass
        conversational = response_text[: match.start()] + response_text[match.end():]
    else:
        conversational = response_text

    return conversational.strip(), graph_update

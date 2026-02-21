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
_MODEL = "gemini-2.0-flash"


def _strip_backtick_fencing(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    return text.strip()


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
            return response.text
        except Exception as e:
            err_str = str(e)
            if attempt < retries and ("429" in err_str or "500" in err_str):
                time.sleep(2)
                continue
            raise


def call_gemini_json(prompt: str):
    raw = call_gemini(prompt)
    cleaned = _strip_backtick_fencing(raw)
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

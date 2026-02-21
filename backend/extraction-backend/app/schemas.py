from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel


class ExtractionResponse(BaseModel):
    source_type: Literal["pdf", "image"]
    method: Literal["pdf_text", "pdf_ocr", "image_ocr"]
    text: str
    warnings: List[str] = []
    metadata: Dict[str, Any] = {}


class HealthResponse(BaseModel):
    status: Literal["ok"]
    service: str
    version: str
    tesseract_available: bool
    tesseract_path: Optional[str] = None

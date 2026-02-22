import io
import os
import sys
from typing import List, Tuple

import pypdfium2 as pdfium
import pytesseract
from PIL import Image, ImageOps
from pypdf import PdfReader

# ── Tesseract binary path (Windows) ─────────────────────────────────────────
if sys.platform == "win32":
    _CANDIDATES = [
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        os.path.expanduser(r"~\AppData\Local\Programs\Tesseract-OCR\tesseract.exe"),
    ]
    for _p in _CANDIDATES:
        if os.path.exists(_p):
            pytesseract.pytesseract.tesseract_cmd = _p
            break


def _clean_text(value: str) -> str:
    return "\n".join(line.rstrip() for line in value.splitlines()).strip()


def _preprocess_for_ocr(image: Image.Image) -> Image.Image:
    gray = ImageOps.grayscale(image)
    return ImageOps.autocontrast(gray)


def extract_text_from_image_bytes(image_bytes: bytes, lang: str = "eng") -> str:
    image = Image.open(io.BytesIO(image_bytes))
    image = _preprocess_for_ocr(image)
    text = pytesseract.image_to_string(image, lang=lang, config="--psm 6")
    return _clean_text(text)


def extract_text_from_pdf_native(pdf_bytes: bytes, max_pages: int = 50) -> Tuple[str, int]:
    reader = PdfReader(io.BytesIO(pdf_bytes))
    page_count = min(len(reader.pages), max_pages)
    chunks: List[str] = []
    for i in range(page_count):
        chunks.append(reader.pages[i].extract_text() or "")
    return _clean_text("\n\n".join(chunks)), page_count


def extract_text_from_pdf_ocr(
    pdf_bytes: bytes, max_pages: int = 20, lang: str = "eng"
) -> Tuple[str, int]:
    pdf = pdfium.PdfDocument(pdf_bytes)
    page_count = min(len(pdf), max_pages)
    chunks: List[str] = []
    for i in range(page_count):
        page = pdf[i]
        pil_image = page.render(scale=2).to_pil()
        processed = _preprocess_for_ocr(pil_image)
        chunks.append(pytesseract.image_to_string(processed, lang=lang, config="--psm 6"))
        page.close()
    return _clean_text("\n\n".join(chunks)), page_count


def extract_text_from_file(file_bytes: bytes, filename: str, content_type: str) -> str:
    """Extract raw text from a PDF or image file."""
    if content_type == "application/pdf" or filename.lower().endswith(".pdf"):
        try:
            text, _ = extract_text_from_pdf_native(file_bytes)
            if len(text) >= 50:
                return text
        except Exception:
            pass
        text, _ = extract_text_from_pdf_ocr(file_bytes)
        return text
    else:
        return extract_text_from_image_bytes(file_bytes)

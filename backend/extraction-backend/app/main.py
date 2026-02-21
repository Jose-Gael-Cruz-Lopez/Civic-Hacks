from typing import Optional

import pytesseract
from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from extractors import (
    extract_text_from_image_bytes,
    extract_text_from_pdf_native,
    extract_text_from_pdf_ocr,
)
from schemas import ExtractionResponse, HealthResponse

ALLOWED_IMAGE_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/webp"}
ALLOWED_PDF_TYPES = {"application/pdf"}

app = FastAPI(title="Extraction Backend Template", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    try:
        tesseract_path = pytesseract.get_tesseract_version()
        return HealthResponse(
            status="ok",
            service="extraction-backend-template",
            version="1.0.0",
            tesseract_available=True,
            tesseract_path=str(tesseract_path),
        )
    except Exception:
        return HealthResponse(
            status="ok",
            service="extraction-backend-template",
            version="1.0.0",
            tesseract_available=False,
            tesseract_path=None,
        )


@app.post("/extract/image", response_model=ExtractionResponse)
async def extract_image(
    file: UploadFile = File(...),
    lang: str = Query("eng", description="OCR language, e.g. eng, spa, eng+spa"),
) -> ExtractionResponse:
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Only PNG/JPG/WEBP image files are supported")

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Empty file")

    try:
        text = extract_text_from_image_bytes(image_bytes, lang=lang)
        return ExtractionResponse(
            source_type="image",
            method="image_ocr",
            text=text,
            warnings=[] if text else ["No text found in image"],
            metadata={"filename": file.filename, "content_type": file.content_type},
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Image extraction failed: {exc}") from exc


@app.post("/extract/pdf", response_model=ExtractionResponse)
async def extract_pdf(
    file: UploadFile = File(...),
    force_ocr: bool = Query(False, description="Force OCR even if PDF has selectable text"),
    max_pages: int = Query(25, ge=1, le=200),
    lang: str = Query("eng", description="OCR language used only for OCR fallback"),
) -> ExtractionResponse:
    if file.content_type not in ALLOWED_PDF_TYPES:
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    pdf_bytes = await file.read()
    if not pdf_bytes:
        raise HTTPException(status_code=400, detail="Empty file")

    warnings = []
    native_text = ""
    page_count = 0

    if not force_ocr:
        try:
            native_text, page_count = extract_text_from_pdf_native(pdf_bytes, max_pages=max_pages)
        except Exception as exc:
            warnings.append(f"Native PDF text extraction failed: {exc}")

    if force_ocr or len(native_text) < 50:
        try:
            ocr_text, ocr_pages = extract_text_from_pdf_ocr(
                pdf_bytes, max_pages=min(max_pages, 50), lang=lang
            )
            method = "pdf_ocr"
            text = ocr_text
            page_count = ocr_pages
            if not force_ocr and native_text:
                warnings.append("Native text was short; OCR fallback used")
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"PDF OCR failed: {exc}") from exc
    else:
        method = "pdf_text"
        text = native_text

    return ExtractionResponse(
        source_type="pdf",
        method=method,
        text=text,
        warnings=warnings if text else warnings + ["No text found in PDF"],
        metadata={
            "filename": file.filename,
            "content_type": file.content_type,
            "pages_processed": page_count,
            "force_ocr": force_ocr,
        },
    )

from fastapi import APIRouter, File, HTTPException, Query, UploadFile

from services.extraction_service import (
    extract_text_from_image_bytes,
    extract_text_from_pdf_native,
    extract_text_from_pdf_ocr,
)

router = APIRouter()

ALLOWED_IMAGE_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/webp"}
ALLOWED_PDF_TYPES = {"application/pdf"}


@router.get("/health")
def extraction_health():
    try:
        import pytesseract
        ver = pytesseract.get_tesseract_version()
        return {"tesseract_available": True, "tesseract_version": str(ver)}
    except Exception:
        return {"tesseract_available": False, "tesseract_version": None}


@router.post("/pdf")
async def extract_pdf(
    file: UploadFile = File(...),
    force_ocr: bool = Query(False),
    max_pages: int = Query(25, ge=1, le=200),
    lang: str = Query("eng"),
):
    if file.content_type not in ALLOWED_PDF_TYPES:
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    pdf_bytes = await file.read()
    if not pdf_bytes:
        raise HTTPException(status_code=400, detail="Empty file")

    warnings = []
    text = ""
    page_count = 0
    method = "pdf_text"

    if not force_ocr:
        try:
            text, page_count = extract_text_from_pdf_native(pdf_bytes, max_pages=max_pages)
        except Exception as e:
            warnings.append(f"Native extraction failed: {e}")

    if force_ocr or len(text) < 50:
        try:
            text, page_count = extract_text_from_pdf_ocr(
                pdf_bytes, max_pages=min(max_pages, 50), lang=lang
            )
            method = "pdf_ocr"
            if not force_ocr and text:
                warnings.append("Native text was short; OCR fallback used")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"PDF OCR failed: {e}")

    return {
        "source_type": "pdf",
        "method": method,
        "text": text,
        "warnings": warnings,
        "metadata": {"filename": file.filename, "pages_processed": page_count},
    }


@router.post("/image")
async def extract_image(
    file: UploadFile = File(...),
    lang: str = Query("eng"),
):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Only PNG/JPG/WEBP images are supported")
    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Empty file")

    try:
        text = extract_text_from_image_bytes(image_bytes, lang=lang)
        return {
            "source_type": "image",
            "method": "image_ocr",
            "text": text,
            "warnings": [] if text else ["No text found in image"],
            "metadata": {"filename": file.filename},
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image extraction failed: {e}")

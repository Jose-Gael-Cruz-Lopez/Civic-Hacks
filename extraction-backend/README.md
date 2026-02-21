# Extraction Backend Template (PDF + Screenshot OCR)

Reusable FastAPI backend you can drop into any project to extract text from:

- PDFs (native text + OCR fallback)
- Screenshot images (OCR)

## 1) Install

```bash
cd extraction-backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Install Tesseract on your machine:

- macOS: `brew install tesseract`
- Ubuntu: `sudo apt-get install tesseract-ocr`
- Windows: install from UB Mannheim build and add to PATH

## 2) Run

```bash
cd app
uvicorn main:app --reload --port 5055
```

Swagger docs: `http://localhost:5055/docs`

## 3) API

### `POST /extract/pdf`

Form-data:

- `file`: PDF file

Query params:

- `force_ocr` (bool, default `false`)
- `max_pages` (int, default `25`)
- `lang` (default `eng`)

Returns:

- extracted text
- method used (`pdf_text` or `pdf_ocr`)
- metadata (pages processed)
- warnings

### `POST /extract/image`

Form-data:

- `file`: screenshot/image (PNG, JPG, WEBP)

Query params:

- `lang` (default `eng`)

Returns:

- extracted text
- method used (`image_ocr`)
- metadata

## 4) cURL Examples

```bash
curl -X POST "http://localhost:5055/extract/pdf?force_ocr=false&max_pages=25" \
  -F "file=@/absolute/path/to/syllabus.pdf"
```

```bash
curl -X POST "http://localhost:5055/extract/image?lang=eng" \
  -F "file=@/absolute/path/to/screenshot.png"
```

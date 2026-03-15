# AidSync OCR API

Standalone Python OCR service for the AidSync medication preparation workflow.

Purpose:
- accept one page image at a time
- run deterministic OCR
- return raw page text and minimal metadata
- leave medication dissection and merging to the existing LLM session workflow

## Endpoints

### `GET /health`
Returns a simple health payload.

### `POST /ocr-page`
Multipart upload for a single image.

Form field:
- `file`: image upload

### `POST /ocr-page-from-url`
JSON body:

```json
{
  "image_url": "https://example.com/page-1.jpg",
  "filename": "page-1.jpg"
}
```

## Response Shape

```json
{
  "ocr_text": "raw extracted text",
  "warnings": [
    {
      "code": "image_resized",
      "message": "Image resized to max dimension 2400px before OCR."
    }
  ],
  "metadata": {
    "source": "upload",
    "filename": "page-1.jpg",
    "content_type": "image/jpeg",
    "bytes_processed": 1830042,
    "width": 1600,
    "height": 2400,
    "language": "eng"
  }
}
```

## Local Run

```bash
cd aidsync_ocr_api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8080
```

## Docker Build

```bash
cd aidsync_ocr_api
docker build -t aidsync-ocr-api:local .
docker run --rm -p 8080:8080 aidsync-ocr-api:local
```

## GitLab Container Registry Example

Replace the variables with your GitLab project details.

```bash
docker login registry.gitlab.com
docker build -t registry.gitlab.com/<group>/<project>/aidsync-ocr-api:latest .
docker push registry.gitlab.com/<group>/<project>/aidsync-ocr-api:latest
```

## Railway

Use the pushed GitLab image in Railway:
- create a new service
- choose deploy from image
- point Railway at the GitLab Container Registry image
- expose port `8080`
- set `OCR_API_KEY` in Railway and require callers to send `X-API-Key`

## Optional API Key Protection

If `OCR_API_KEY` is set, requests to OCR endpoints must include:

```http
X-API-Key: your_shared_secret
```

## Recommended Integration

1. Dashboard uploads a page image to Supabase Storage.
2. Dashboard or Edge Function calls this API per page.
3. OCR text is written into `leaflet_preparation_pages.ocr_text`.
4. One final LLM call uses all ordered page OCR text for session-level draft generation.

## Database Connectivity

Optional environment variables:

- `DB_URL`
- `DB_PING_TIMEOUT_SECONDS`

Use `GET /ping` to verify the OCR service can reach the ETL/staging database.

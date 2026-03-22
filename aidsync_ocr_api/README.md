# AidSync OCR API

Supporting OCR service for the dashboard medication preparation workflow.

## What This Module Does

`aidsync_ocr_api` accepts single leaflet page images, runs OCR, and returns raw
page text plus light metadata.

It is not the medication safety engine and it is not on the mobile runtime
path. Its role is limited to preparation support for image-based intake.

Typical use:

1. dashboard uploads or references a leaflet page image
2. OCR API extracts raw page text
3. extracted text is written into the preparation session
4. the dashboard and Edge Function build the medication draft from all pages

## Deployment

For the current demo stack, this service is deployed separately and runs on `Railway`.

That deployment is used as an OCR/extraction helper for the online preparation workflow. It is not part of the mobile runtime path and it is not used for on-device medication safety decisions.

## Endpoints

### `GET /health`

Basic service health check.

### `GET /ping`

Optional database connectivity check.

### `POST /ocr-page`

Multipart upload for a single image.

Form field:

- `file`

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
  "warnings": [],
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

## Environment

Copy `.env.example` to `.env`.

Common variables:

```bash
APP_ENV=development
MAX_IMAGE_MB=12
MAX_DIMENSION=2400
TESSERACT_LANG=eng
REQUEST_TIMEOUT_SECONDS=20
OCR_API_KEY=
DB_URL=
DB_PING_TIMEOUT_SECONDS=5
```

If `OCR_API_KEY` is set, OCR endpoints require:

```http
X-API-Key: your_shared_secret
```

## Run Locally

```bash
cd /Users/raven/hackathons/powersync/aidsync_ocr_api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8080
```

## Docker

```bash
cd /Users/raven/hackathons/powersync/aidsync_ocr_api
docker build -t aidsync-ocr-api:local .
docker run --rm -p 8080:8080 aidsync-ocr-api:local
```

## Related Modules

- dashboard: [`/Users/raven/hackathons/powersync/aidsync_dashboard/README.md`](/Users/raven/hackathons/powersync/aidsync_dashboard/README.md)
- backend function and schema: [`/Users/raven/hackathons/powersync/supabase/README.md`](/Users/raven/hackathons/powersync/supabase/README.md)

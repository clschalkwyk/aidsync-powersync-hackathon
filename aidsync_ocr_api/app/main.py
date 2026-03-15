from __future__ import annotations

from pathlib import Path

import httpx
from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from .db import match_active_ingredient, ping_database
from .models import (
    HealthResponse,
    MatchIngredientRequest,
    MatchIngredientResponse,
    OcrMetadata,
    OcrResponse,
    OcrUrlRequest,
    OcrWarning,
    PingResponse,
)
from .ocr import extract_text_from_variants, load_image, prepare_ocr_variants
from .settings import settings

app = FastAPI(title=settings.app_name)


def require_api_key(x_api_key: str | None = Header(default=None)) -> None:
    if not settings.ocr_api_key:
        return
    if x_api_key != settings.ocr_api_key:
        raise HTTPException(status_code=401, detail="Invalid OCR API key.")


def _validate_size(byte_count: int) -> None:
    max_bytes = settings.max_image_mb * 1024 * 1024
    if byte_count > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"Image exceeds max size of {settings.max_image_mb} MB.",
        )


def _build_response(
    *,
    source: str,
    image_bytes: bytes,
    filename: str | None,
    content_type: str | None,
) -> OcrResponse:
    image = load_image(image_bytes)
    variants, warnings = prepare_ocr_variants(image)
    text, ocr_warnings = extract_text_from_variants(variants)
    warnings.extend(ocr_warnings)

    if not text:
        warnings.append(
            OcrWarning(
                code="ocr_empty",
                message="OCR returned no usable text.",
            )
        )

    return OcrResponse(
        ocr_text=text,
        warnings=warnings,
        metadata=OcrMetadata(
            source=source,  # type: ignore[arg-type]
            filename=filename,
            content_type=content_type,
            bytes_processed=len(image_bytes),
            width=image.width,
            height=image.height,
            language=settings.tesseract_lang,
        ),
    )


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok", service=settings.app_name)




@app.get("/ping", response_model=PingResponse)
async def ping() -> PingResponse:
    db_ok, database_scheme, error = ping_database()
    return PingResponse(
        status="ok" if db_ok else "degraded",
        service=settings.app_name,
        database_configured=bool(settings.db_url),
        database_scheme=database_scheme,
        database_ok=db_ok,
        error=error,
    )


@app.post("/rxnorm/match-ingredient", response_model=MatchIngredientResponse)
async def match_ingredient(
    payload: MatchIngredientRequest,
    _auth: None = Depends(require_api_key),
) -> MatchIngredientResponse:
    query = payload.name.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Ingredient name is required.")

    try:
        matched, candidates = match_active_ingredient(query)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    if not matched:
        return MatchIngredientResponse(matched=False, confidence=0, candidates=[])

    return MatchIngredientResponse(
        matched=True,
        match_type=matched.get("match_type"),
        confidence=float(matched.get("confidence") or 0),
        ingredient={
            "rxnorm_rxcui": matched["rxnorm_rxcui"],
            "canonical_name": matched["canonical_name"],
            "normalized_name": matched.get("normalized_name"),
            "common_name": matched.get("common_name"),
            "ingredient_class": matched.get("ingredient_class"),
            "synonyms_json": matched.get("synonyms_json") or [],
        },
        candidates=[
            {
                "rxnorm_rxcui": item["rxnorm_rxcui"],
                "canonical_name": item["canonical_name"],
                "normalized_name": item.get("normalized_name"),
                "common_name": item.get("common_name"),
                "ingredient_class": item.get("ingredient_class"),
                "synonyms_json": item.get("synonyms_json") or [],
            }
            for item in candidates
        ],
    )


@app.post("/ocr-page", response_model=OcrResponse)
async def ocr_page(_auth: None = Depends(require_api_key), file: UploadFile = File(...)) -> OcrResponse:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=415, detail="Only image uploads are supported.")

    image_bytes = await file.read()
    _validate_size(len(image_bytes))

    return _build_response(
        source="upload",
        image_bytes=image_bytes,
        filename=file.filename,
        content_type=file.content_type,
    )


@app.post("/ocr-page-from-url", response_model=OcrResponse)
async def ocr_page_from_url(
    payload: OcrUrlRequest,
    _auth: None = Depends(require_api_key),
) -> OcrResponse:
    timeout = httpx.Timeout(settings.request_timeout_seconds)
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
        response = await client.get(str(payload.image_url))

    if response.status_code >= 400:
        raise HTTPException(status_code=400, detail="Could not fetch remote image.")

    content_type = response.headers.get("content-type", "")
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=415, detail="Remote URL did not return an image.")

    image_bytes = response.content
    _validate_size(len(image_bytes))

    return _build_response(
        source="url",
        image_bytes=image_bytes,
        filename=payload.filename or Path(str(payload.image_url.path)).name,
        content_type=content_type,
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(_request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"error": exc.detail})

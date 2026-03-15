from typing import Literal

from pydantic import BaseModel, Field, HttpUrl


class OcrWarning(BaseModel):
    code: str
    message: str


class OcrMetadata(BaseModel):
    source: Literal["upload", "url"]
    filename: str | None = None
    content_type: str | None = None
    bytes_processed: int | None = None
    width: int | None = None
    height: int | None = None
    language: str = "eng"


class OcrResponse(BaseModel):
    ocr_text: str
    warnings: list[OcrWarning] = Field(default_factory=list)
    metadata: OcrMetadata


class OcrUrlRequest(BaseModel):
    image_url: HttpUrl
    filename: str | None = None


class HealthResponse(BaseModel):
    status: Literal["ok"]
    service: str


class PingResponse(BaseModel):
    status: str
    service: str
    database_configured: bool
    database_scheme: str | None = None
    database_ok: bool
    error: str | None = None


class MatchIngredientRequest(BaseModel):
    name: str


class MatchedIngredient(BaseModel):
    rxnorm_rxcui: str
    canonical_name: str
    normalized_name: str | None = None
    common_name: str | None = None
    ingredient_class: str | None = None
    synonyms_json: list[str] = Field(default_factory=list)


class MatchIngredientResponse(BaseModel):
    matched: bool
    match_type: str | None = None
    confidence: float = 0
    ingredient: MatchedIngredient | None = None
    candidates: list[MatchedIngredient] = Field(default_factory=list)

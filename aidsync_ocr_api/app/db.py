from __future__ import annotations

from urllib.parse import urlparse

from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError

from .settings import settings


def _normalize_sqlalchemy_url(raw_url: str) -> str:
    parsed = urlparse(raw_url)
    scheme = parsed.scheme.lower()

    if scheme in {"postgres", "postgresql"}:
        return raw_url.replace(f"{parsed.scheme}://", "postgresql+psycopg://", 1)

    if scheme in {"mysql", "mysql2"}:
        return raw_url.replace(f"{parsed.scheme}://", "mysql+pymysql://", 1)

    return raw_url


def ping_database() -> tuple[bool, str | None, str | None]:
    if not settings.db_url:
        return False, None, "DB_URL is not configured."

    database_url = _normalize_sqlalchemy_url(settings.db_url)
    engine = create_engine(
        database_url,
        pool_pre_ping=True,
        pool_timeout=settings.db_ping_timeout_seconds,
        connect_args={},
    )

    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return True, database_url.split("://", 1)[0], None
    except SQLAlchemyError as exc:
        return False, database_url.split("://", 1)[0], str(exc)
    finally:
        engine.dispose()


def _normalize_lookup_name(value: str) -> str:
    return (
        value.strip()
        .lower()
        .replace("(", " ")
        .replace(")", " ")
        .replace(",", " ")
        .replace(".", " ")
        .replace("/", " ")
        .replace("-", " ")
    )


def _tokenize(value: str) -> list[str]:
    return [token for token in _normalize_lookup_name(value).split() if len(token) >= 3]


def _score_candidate(query: str, candidate: dict) -> tuple[float, str | None]:
    normalized_query = _normalize_lookup_name(query)
    canonical = _normalize_lookup_name(candidate.get("canonical_name") or "")
    common = _normalize_lookup_name(candidate.get("common_name") or "")
    normalized_name = _normalize_lookup_name(candidate.get("normalized_name") or "")
    synonyms = [
        _normalize_lookup_name(str(item))
        for item in (candidate.get("synonyms_json") or [])
        if str(item).strip()
    ]

    if normalized_query and normalized_query == normalized_name:
        return 1.0, "normalized_exact"
    if normalized_query and normalized_query == canonical:
        return 0.98, "canonical_exact"
    if normalized_query and normalized_query == common:
        return 0.96, "common_exact"
    if normalized_query and normalized_query in synonyms:
        return 0.94, "synonym_exact"

    query_tokens = set(_tokenize(query))
    candidate_tokens = set(_tokenize(candidate.get("canonical_name") or ""))
    synonym_tokens = [set(_tokenize(item)) for item in (candidate.get("synonyms_json") or [])]

    if query_tokens and query_tokens.issubset(candidate_tokens):
        return 0.9, "canonical_token_subset"
    for synonym_set in synonym_tokens:
        if query_tokens and query_tokens.issubset(synonym_set):
            return 0.88, "synonym_token_subset"

    if normalized_query and canonical and normalized_query in canonical:
        return 0.84, "canonical_contains"
    if normalized_query and common and normalized_query in common:
        return 0.82, "common_contains"
    if any(normalized_query and normalized_query in synonym for synonym in synonyms):
        return 0.8, "synonym_contains"

    return 0.0, None


def match_active_ingredient(name: str) -> tuple[dict | None, list[dict]]:
    if not settings.db_url:
        raise RuntimeError("DB_URL is not configured.")

    database_url = _normalize_sqlalchemy_url(settings.db_url)
    engine = create_engine(
        database_url,
        pool_pre_ping=True,
        pool_timeout=settings.db_ping_timeout_seconds,
    )

    normalized_query = _normalize_lookup_name(name)
    like_query = f"%{normalized_query}%"
    sql = text(
        """
        SELECT
          rxnorm_rxcui,
          canonical_name,
          normalized_name,
          common_name,
          ingredient_class,
          synonyms_json
        FROM active_ingredients
        WHERE normalized_name = :normalized_query
           OR lower(coalesce(canonical_name, '')) = :normalized_query
           OR lower(coalesce(common_name, '')) = :normalized_query
           OR lower(coalesce(synonyms_json::text, '')) LIKE :like_query
           OR lower(coalesce(canonical_name, '')) LIKE :like_query
           OR lower(coalesce(common_name, '')) LIKE :like_query
        LIMIT 25
        """
    )

    try:
        with engine.connect() as connection:
            rows = [dict(row._mapping) for row in connection.execute(sql, {"normalized_query": normalized_query, "like_query": like_query})]
    finally:
        engine.dispose()

    scored: list[tuple[float, str | None, dict]] = []
    for row in rows:
        score, match_type = _score_candidate(name, row)
        if score > 0:
            row["synonyms_json"] = row.get("synonyms_json") or []
            scored.append((score, match_type, row))

    scored.sort(key=lambda item: item[0], reverse=True)
    candidates = [candidate for _, _, candidate in scored[:5]]
    best = scored[0] if scored else None

    if not best:
        return None, []

    score, match_type, row = best
    row = {
        **row,
        "confidence": score,
        "match_type": match_type,
    }
    return row, candidates

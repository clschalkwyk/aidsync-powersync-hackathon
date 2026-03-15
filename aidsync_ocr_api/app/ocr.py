from __future__ import annotations

import io
import re
from collections.abc import Sequence
from typing import TypeAlias

import cv2
import numpy as np
import pytesseract
from PIL import Image, ImageOps

from .models import OcrWarning
from .settings import settings

OcrVariant: TypeAlias = tuple[str, Image.Image]


def load_image(image_bytes: bytes) -> Image.Image:
    image = Image.open(io.BytesIO(image_bytes))
    return ImageOps.exif_transpose(image).convert("RGB")


def _order_points(points: np.ndarray) -> np.ndarray:
    sums = points.sum(axis=1)
    diffs = np.diff(points, axis=1)
    return np.array(
        [
            points[np.argmin(sums)],
            points[np.argmin(diffs)],
            points[np.argmax(sums)],
            points[np.argmax(diffs)],
        ],
        dtype=np.float32,
    )


def _four_point_transform(image: np.ndarray, points: np.ndarray) -> np.ndarray:
    rect = _order_points(points)
    top_left, top_right, bottom_right, bottom_left = rect

    width_top = np.linalg.norm(top_right - top_left)
    width_bottom = np.linalg.norm(bottom_right - bottom_left)
    max_width = max(int(width_top), int(width_bottom))

    height_right = np.linalg.norm(top_right - bottom_right)
    height_left = np.linalg.norm(top_left - bottom_left)
    max_height = max(int(height_right), int(height_left))

    if max_width <= 0 or max_height <= 0:
        return image

    destination = np.array(
        [
            [0, 0],
            [max_width - 1, 0],
            [max_width - 1, max_height - 1],
            [0, max_height - 1],
        ],
        dtype=np.float32,
    )

    matrix = cv2.getPerspectiveTransform(rect, destination)
    return cv2.warpPerspective(image, matrix, (max_width, max_height))


def _detect_document_bounds(np_image: np.ndarray) -> tuple[np.ndarray, bool]:
    grayscale = cv2.cvtColor(np_image, cv2.COLOR_RGB2GRAY)
    blurred = cv2.GaussianBlur(grayscale, (5, 5), 0)
    edges = cv2.Canny(blurred, 60, 180)
    edges = cv2.dilate(edges, None, iterations=2)
    edges = cv2.erode(edges, None, iterations=1)

    contours, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    image_area = np_image.shape[0] * np_image.shape[1]

    for contour in sorted(contours, key=cv2.contourArea, reverse=True)[:10]:
        perimeter = cv2.arcLength(contour, True)
        approximation = cv2.approxPolyDP(contour, 0.02 * perimeter, True)
        area = cv2.contourArea(contour)
        if len(approximation) != 4 or area < image_area * 0.2:
            continue

        warped = _four_point_transform(np_image, approximation.reshape(4, 2).astype(np.float32))
        if warped.shape[0] > 0 and warped.shape[1] > 0:
            return warped, True

    return np_image, False


def _deskew_image(np_image: np.ndarray) -> tuple[np.ndarray, float]:
    inverted = cv2.bitwise_not(np_image)
    coords = cv2.findNonZero(inverted)
    if coords is None:
        return np_image, 0.0

    angle = cv2.minAreaRect(coords)[-1]
    if angle < -45:
        angle = 90 + angle

    if abs(angle) < 0.4:
        return np_image, 0.0

    height, width = np_image.shape[:2]
    center = (width // 2, height // 2)
    matrix = cv2.getRotationMatrix2D(center, angle, 1.0)
    rotated = cv2.warpAffine(
        np_image,
        matrix,
        (width, height),
        flags=cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_REPLICATE,
    )
    return rotated, angle


def _build_threshold_variant(
    grayscale: np.ndarray,
    *,
    block_size: int,
    c_value: int,
    use_otsu: bool = False,
) -> np.ndarray:
    if use_otsu:
        _, thresholded = cv2.threshold(
            grayscale,
            0,
            255,
            cv2.THRESH_BINARY + cv2.THRESH_OTSU,
        )
    else:
        thresholded = cv2.adaptiveThreshold(
            grayscale,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            block_size,
            c_value,
        )

    return cv2.medianBlur(thresholded, 3)


def prepare_ocr_variants(image: Image.Image) -> tuple[list[OcrVariant], list[OcrWarning]]:
    warnings: list[OcrWarning] = []
    np_image = np.array(image)
    warped, was_rectified = _detect_document_bounds(np_image)
    if was_rectified:
        image = Image.fromarray(warped)
        warnings.append(
            OcrWarning(
                code="document_rectified",
                message="Detected document edges and corrected page perspective before OCR.",
            )
        )

    width, height = image.size
    max_side = max(width, height)
    if max_side > settings.max_dimension:
        scale = settings.max_dimension / max_side
        image = image.resize(
            (int(width * scale), int(height * scale)),
            Image.Resampling.LANCZOS,
        )
        warnings.append(
            OcrWarning(
                code="image_resized",
                message=f"Image resized to max dimension {settings.max_dimension}px before OCR.",
            )
        )
    elif max_side < 1600:
        upscale = min(settings.max_dimension / max_side, 2.0)
        image = image.resize(
            (max(1, int(width * upscale)), max(1, int(height * upscale))),
            Image.Resampling.LANCZOS,
        )
        warnings.append(
            OcrWarning(
                code="image_upscaled",
                message="Image upscaled to improve OCR on small leaflet text.",
            )
        )

    grayscale = ImageOps.grayscale(image)
    np_gray = np.array(grayscale)
    clahe = cv2.createCLAHE(clipLimit=2.4, tileGridSize=(8, 8))
    contrast = clahe.apply(np_gray)
    denoised = cv2.fastNlMeansDenoising(contrast, None, 10, 7, 21)
    sharpened = cv2.GaussianBlur(denoised, (0, 0), 1.1)
    sharpened = cv2.addWeighted(denoised, 1.75, sharpened, -0.75, 0)

    threshold_variants = [
        ("balanced_threshold", _build_threshold_variant(sharpened, block_size=41, c_value=13)),
        ("contrast_boost_v1", _build_threshold_variant(sharpened, block_size=31, c_value=9)),
        ("contrast_boost_v2", _build_threshold_variant(sharpened, block_size=51, c_value=7)),
        ("otsu_threshold", _build_threshold_variant(sharpened, block_size=0, c_value=0, use_otsu=True)),
    ]

    variants: list[OcrVariant] = []
    deskew_noted = False
    for label, thresholded in threshold_variants:
        deskewed, angle = _deskew_image(thresholded)
        if angle and not deskew_noted:
            warnings.append(
                OcrWarning(
                    code="image_deskewed",
                    message=f"Image rotated by approximately {angle:.1f} degrees before OCR.",
                )
            )
            deskew_noted = True
        variants.append((label, Image.fromarray(deskewed)))

    return variants, warnings


def preprocess_image(image: Image.Image) -> tuple[Image.Image, list[OcrWarning]]:
    variants, warnings = prepare_ocr_variants(image)
    return variants[0][1], warnings


def _normalize_ocr_text(text: str) -> str:
    normalized_lines = [line.rstrip() for line in text.splitlines()]
    normalized = "\n".join(normalized_lines).strip()
    normalized = re.sub(r"\n{3,}", "\n\n", normalized)
    return normalized


def _score_ocr_text(text: str) -> float:
    if not text.strip():
        return 0.0

    total_chars = len(text)
    alpha_chars = sum(character.isalpha() for character in text)
    digit_chars = sum(character.isdigit() for character in text)
    whitespace_chars = sum(character.isspace() for character in text)
    suspicious_chars = sum(character in "`~_^|<>" for character in text)
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    long_lines = sum(len(line) >= 20 for line in lines)
    word_count = len(re.findall(r"\b[\w/-]+\b", text))

    alpha_ratio = alpha_chars / total_chars
    digit_ratio = digit_chars / total_chars
    suspicious_ratio = suspicious_chars / total_chars
    whitespace_ratio = whitespace_chars / total_chars

    score = 0.0
    score += min(word_count / 250, 1.0) * 45
    score += min(long_lines / 12, 1.0) * 20
    score += max(0.0, min(alpha_ratio / 0.55, 1.0)) * 25
    score += max(0.0, 1.0 - min(suspicious_ratio / 0.03, 1.0)) * 10
    score -= max(0.0, (digit_ratio - 0.18) * 20)
    score -= max(0.0, (0.08 - whitespace_ratio) * 120)
    return score


def _column_split(binary_image: Image.Image) -> tuple[Sequence[Image.Image], bool]:
    np_image = np.array(binary_image)
    if np_image.ndim != 2:
        return [binary_image], False

    height, width = np_image.shape
    if width < 900:
        return [binary_image], False

    ink = 255 - np_image
    projection = ink.mean(axis=0)
    search_start = int(width * 0.3)
    search_end = int(width * 0.7)
    window = projection[search_start:search_end]
    if window.size == 0:
        return [binary_image], False

    split_index = int(np.argmin(window)) + search_start
    mean_density = float(np.mean(projection))
    split_density = float(projection[split_index])

    if split_density > mean_density * 0.55:
        return [binary_image], False

    gutter = max(12, width // 80)
    left_end = max(0, split_index - gutter)
    right_start = min(width, split_index + gutter)

    if left_end < width * 0.22 or (width - right_start) < width * 0.22:
        return [binary_image], False

    left_image = Image.fromarray(np_image[:, :left_end])
    right_image = Image.fromarray(np_image[:, right_start:])
    return [left_image, right_image], True


def _ocr_with_config(image: Image.Image, config: str) -> str:
    return pytesseract.image_to_string(
        image,
        lang=settings.tesseract_lang,
        config=config,
    )


def _extract_by_columns(image: Image.Image) -> tuple[str, bool]:
    columns, did_split = _column_split(image)
    if not did_split:
        return "", False

    column_text = [
        _normalize_ocr_text(_ocr_with_config(column, "--oem 1 --psm 6"))
        for column in columns
    ]
    return "\n\n".join(text for text in column_text if text), True


def extract_text_from_variants(variants: Sequence[OcrVariant]) -> tuple[str, list[OcrWarning]]:
    psm_attempts = [
        ("block_text", "--oem 1 --psm 6"),
        ("column_text", "--oem 1 --psm 4"),
        ("sparse_text", "--oem 1 --psm 11"),
    ]

    best_text = ""
    best_score = -1.0
    best_label = ""
    best_variant_label = ""
    used_column_split = False

    for variant_label, image in variants:
        for label, config in psm_attempts:
            raw_text = _ocr_with_config(image, config)
            normalized = _normalize_ocr_text(raw_text)
            score = _score_ocr_text(normalized)
            if score > best_score:
                best_text = normalized
                best_score = score
                best_label = label
                best_variant_label = variant_label
                used_column_split = False

        column_text, did_split = _extract_by_columns(image)
        if did_split:
            column_score = _score_ocr_text(column_text)
            if column_score > best_score:
                best_text = column_text
                best_score = column_score
                best_label = "two_column_layout"
                best_variant_label = variant_label
                used_column_split = True

    warnings: list[OcrWarning] = []
    if best_label:
        warnings.append(
            OcrWarning(
                code="ocr_mode_selected",
                message=f"Selected OCR layout mode: {best_label}.",
            )
        )

    if best_variant_label:
        warnings.append(
            OcrWarning(
                code="ocr_variant_selected",
                message=f"Selected OCR preprocessing variant: {best_variant_label}.",
            )
        )

    if used_column_split and best_label == "two_column_layout":
        warnings.append(
            OcrWarning(
                code="ocr_column_split",
                message="Detected a likely two-column layout and OCRed columns separately.",
            )
        )

    if best_score < 30:
        warnings.append(
            OcrWarning(
                code="ocr_low_quality",
                message="OCR quality looks weak. Review this page before relying on the text.",
            )
        )

    return best_text, warnings


def extract_text(image: Image.Image) -> tuple[str, list[OcrWarning]]:
    return extract_text_from_variants([("default", image)])

"""
Core AI/ML logic for SheMarket Member 2.

This module is dependency-light and works offline for hackathon demos. If API keys
are configured later, api.py can route voice/description/image calls to real
providers while keeping these fallback functions for reliable local demos.
"""

from __future__ import annotations

import csv
import json
import math
import pickle
import re
from collections import defaultdict
from pathlib import Path
from typing import Any

import numpy as np


ROOT_DIR = Path(__file__).resolve().parent
DATA_DIR = ROOT_DIR / "outputs" / "datasets"
MODEL_DIR = ROOT_DIR / "outputs" / "models"
MODEL_PATH = MODEL_DIR / "price_model.pkl"

DEMAND_SCORE = {"Low": 0.0, "Medium": 1.0, "High": 2.0, "Very_High": 3.0}

CATEGORY_KEYWORDS = {
    "Skincare Products": ["soap", "skincare", "cream", "gel", "oil", "face", "hair", "rose", "neem", "turmeric"],
    "Pickles": ["pickle", "achar", "chilli", "mango pickle", "lemon pickle"],
    "Homemade Food": ["chips", "papad", "khakhra", "jam", "ghee", "cookies", "chutney", "podi"],
    "Handloom": ["saree", "dupatta", "shawl", "scarf", "kurta", "bed cover", "handloom", "stole"],
    "Jewellery": ["necklace", "bracelet", "bangle", "earring", "jhumka", "anklet", "pendant"],
    "Tailoring Items": ["blouse", "uniform", "cloth bag", "apron", "sleeve", "kurti", "mask"],
    "Organic Products": ["organic", "honey", "jaggery", "moringa", "cold pressed", "flax", "millet"],
    "Bamboo Products": ["bamboo", "cane"],
    "Spices": ["masala", "powder", "spice", "turmeric", "chilli", "coriander", "cumin", "pepper"],
    "Handicrafts": ["jute", "terracotta", "macrame", "clay", "wooden", "crochet", "mirror work", "hand painted"],
}

PROJECT_AI_ENDPOINTS = {
    "voice": "/api/ai/voice-to-text",
    "description": "/api/ai/generate-description",
    "price": "/api/ai/predict-price",
    "recommend": "/api/ai/recommend",
}

SUPPORTED_LANGUAGES = [
    "Hindi",
    "Kannada",
    "English",
    "Tulu",
    "Malayalam",
    "Telugu",
    "Tamil",
    "Marathi",
    "Rajasthani",
    "Konkani",
    "Beary",
    "Urdu",
    "Bengali",
    "Gujarati",
    "Punjabi",
    "Assamese",
    "Odia",
    "Maithili",
    "Bhojpuri",
    "Haryanvi",
    "Sanskrit",
    "Nepali",
]


def load_csv(name: str) -> list[dict[str, str]]:
    path = DATA_DIR / name
    with path.open("r", encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def normalize_price(value: float) -> int:
    return int(round(value / 5) * 5)


def detect_language(text: str) -> str:
    lowered = text.lower()
    markers = {
        "Hindi": ["yeh", "hai", "banaya", "haath"],
        "Kannada": ["idu", "madida", "kaiyinda"],
        "Malayalam": ["ithu", "aanu"],
        "Tamil": ["idhu", "seiyappatta"],
        "Telugu": ["idi", "chesina"],
        "Marathi": ["ha", "banavlela"],
        "Urdu": ["samaan"],
        "Bengali": ["eta", "hoyeche"],
        "Gujarati": ["aa", "che"],
        "Punjabi": ["eh", "hai"],
        "Assamese": ["ei", "hoi"],
        "Odia": ["eha", "ate"],
        "Maithili": ["ee", "achhi"],
        "Bhojpuri": ["ee", "ba"],
        "Haryanvi": ["yo", "se"],
        "Sanskrit": ["idam"],
        "Nepali": ["yo", "ho"],
        "English": ["this", "handmade", "product", "made"],
    }
    scores = {lang: sum(1 for token in tokens if token in lowered) for lang, tokens in markers.items()}
    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else "English"


def transcribe_voice_demo(audio_base64: str | None = None, text_hint: str | None = None, language_hint: str = "auto") -> dict[str, Any]:
    """Offline demo STT fallback.

    Real production integration should call Whisper, Google Speech-to-Text, or
    Bhashini before falling back here. For demos, Member 1 can pass text_hint.
    """
    text = text_hint or "This is handmade coconut soap"
    language = language_hint if language_hint and language_hint != "auto" else detect_language(text)
    if language not in SUPPORTED_LANGUAGES:
        language = "English"
    return {
        "text": text,
        "language": language,
        "confidence": 0.93,
        "provider": "local_demo_fallback",
        "supported_languages": SUPPORTED_LANGUAGES,
    }


def detect_category(text: str) -> str:
    lowered = text.lower()
    scores = {}
    for category, keywords in CATEGORY_KEYWORDS.items():
        scores[category] = sum(1 for keyword in keywords if keyword in lowered)
    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else "Handicrafts"


def clean_product_name(text: str) -> str:
    text = re.sub(r"\b(this is|this|made in|from|using|organic|handmade|product|item)\b", " ", text, flags=re.I)
    text = re.sub(r"[^A-Za-z0-9 &-]", " ", text)
    words = [w.capitalize() if w.lower() not in {"and", "of"} else w.lower() for w in text.split()[:6]]
    return " ".join(words).strip() or "Handmade Product"


def generate_product_description(product_input: str, seller_state: str = "", language: str = "English", seed: Any = None) -> dict[str, Any]:
    category = detect_category(product_input)
    product_name = clean_product_name(product_input)
    state_part = f" from {seller_state}" if seller_state else ""
    material_hint = product_input.strip().rstrip(".")
    tags = sorted({tag for tag in re.split(r"[^A-Za-z0-9]+", f"{product_name} {category} handmade rural women") if tag})[:8]
    seo_keywords = [f"{category} online", f"handmade {product_name}", "women entrepreneur product", "SHG product"]
    variants = [
        (
            f"{product_name} is a locally made {category.lower()} item{state_part}. "
            f"It is prepared by rural women entrepreneurs using details provided by the seller: {material_hint}. "
            f"Suitable for direct online purchase and gifting."
        ),
        (
            f"Bring home {product_name}, a women-led {category.lower()} product{state_part}. "
            f"The listing is based on the seller's input: {material_hint}. "
            f"It is designed for buyers who value handmade quality and fair pricing."
        ),
        (
            f"{product_name} comes from SheMarket's rural entrepreneur network{state_part}. "
            f"Made with care and described from seller details: {material_hint}. "
            f"A practical choice for customers looking for authentic SHG products."
        ),
    ]
    variant_index = int(str(seed or "0")[-2:] or 0) % len(variants)
    return {
        "product_name": product_name,
        "category": category,
        "description": variants[variant_index],
        "tags": [tag.lower() for tag in tags],
        "seo_keywords": seo_keywords,
        "language": language,
    }


def feature_row(row: dict[str, Any], categories: list[str]) -> list[float]:
    demand = DEMAND_SCORE.get(str(row.get("demand_level", "Medium")), 1.0)
    base = [
        float(row.get("raw_material_cost", 0)),
        float(row.get("labour_cost", 0)),
        float(row.get("packaging_cost", 0)),
        float(row.get("market_price", 0)),
        demand,
        float(row.get("rating", 4.0)),
        1.0,
    ]
    category = str(row.get("category", ""))
    return base + [1.0 if category == c else 0.0 for c in categories]


def train_price_model(model_type: str = "linear_regression") -> dict[str, Any]:
    rows = load_csv("price_training_data.csv")
    categories = sorted({row["category"] for row in rows})
    x = np.array([feature_row(row, categories) for row in rows], dtype=float)
    y = np.array([float(row["selling_price"]) for row in rows], dtype=float)
    coefficients = np.linalg.pinv(x.T @ x) @ x.T @ y

    predictions = x @ coefficients
    mae = float(np.mean(np.abs(predictions - y)))
    rmse = float(math.sqrt(np.mean((predictions - y) ** 2)))
    model = {
        "model_type": model_type,
        "categories": categories,
        "coefficients": coefficients.tolist(),
        "mae": round(mae, 2),
        "rmse": round(rmse, 2),
        "rows": len(rows),
    }
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    with MODEL_PATH.open("wb") as f:
        pickle.dump(model, f)
    return model


def load_or_train_model() -> dict[str, Any]:
    if MODEL_PATH.exists():
        with MODEL_PATH.open("rb") as f:
            return pickle.load(f)
    return train_price_model()


def predict_price(payload: dict[str, Any]) -> dict[str, Any]:
    model = load_or_train_model()
    row = {
        "category": payload.get("category", "Skincare Products"),
        "raw_material_cost": payload.get("raw_material_cost", 0),
        "labour_cost": payload.get("labour_cost", 0),
        "packaging_cost": payload.get("packaging_cost", 0),
        "market_price": payload.get("market_price", 0),
        "demand_level": payload.get("demand_level", "Medium"),
        "rating": payload.get("rating", 4.0),
    }
    features = np.array(feature_row(row, model["categories"]), dtype=float)
    predicted = float(features @ np.array(model["coefficients"], dtype=float))
    cost = float(row["raw_material_cost"]) + float(row["labour_cost"]) + float(row["packaging_cost"])
    min_price = cost * 1.15
    demand_cap = {"Low": 0.84, "Medium": 0.9, "High": 0.94, "Very_High": 1.02}.get(str(row["demand_level"]), 0.9)
    max_price = float(row["market_price"]) * demand_cap if float(row["market_price"]) > 0 else predicted * 1.25
    recommended = normalize_price(max(min_price, min(predicted, max_price)))
    return {
        "recommended_price": recommended,
        "model": model["model_type"],
        "mae": model["mae"],
        "explanation": {
            "total_cost": round(cost, 2),
            "market_price": float(row["market_price"]),
            "demand_level": row["demand_level"],
            "rating": float(row["rating"]),
        },
    }


def recommend_products(product_id: str | None = None, category: str | None = None, limit: int = 6) -> dict[str, Any]:
    rows = load_csv("recommendation_data.csv")
    products = load_csv("products.csv")
    product_lookup = {p["product_id"]: p for p in products}
    viewed = product_lookup.get(product_id or "")
    target_category = category or (viewed["category"] if viewed else None)

    def score(row: dict[str, str]) -> float:
        rating = float(row["rating"])
        orders = float(row["orders_count"])
        views = float(row["views_count"])
        same_category = 250 if target_category and row["category"] == target_category else 0
        return same_category + rating * 40 + orders * 0.7 + views * 0.03

    candidates = [r for r in rows if r["product_id"] != product_id]
    ranked = sorted(candidates, key=score, reverse=True)[:limit]
    return {
        "viewed_product_id": product_id,
        "category_used": target_category or "trending",
        "items": [
            {
                "product_id": r["product_id"],
                "product_name": r["product_name"],
                "category": r["category"],
                "price": int(float(r["price"])),
                "rating": float(r["rating"]),
                "score": round(score(r), 2),
                "reason": "same category + high rating/orders" if target_category and r["category"] == target_category else "trending product",
            }
            for r in ranked
        ],
    }


def translate_text(text: str, target_language: str = "English", source_language: str = "auto") -> dict[str, Any]:
    detected = detect_language(text) if source_language == "auto" else source_language
    if target_language.lower() == "english":
        translated = re.sub(r"\b[Yy]eh\b", "This", text)
        translated = re.sub(r"\bhai\b", "is", translated, flags=re.I)
    else:
        translated = text
    return {
        "source_language": detected,
        "target_language": target_language,
        "translated_text": translated,
        "provider": "local_demo_fallback",
    }


def classify_image_demo(filename: str, hint: str | None = None) -> dict[str, Any]:
    text = f"{filename} {hint or ''}"
    category = detect_category(text)
    return {
        "category": category,
        "confidence": 0.78,
        "provider": "local_filename_hint_fallback",
        "note": "Connect Google Vision, Gemini Vision, or OpenAI Vision for real image classification.",
    }


def training_lessons(language: str | None = None, module: str | None = None, limit: int = 8) -> dict[str, Any]:
    rows = load_csv("training_content.csv")
    if language:
        rows = [row for row in rows if row["language"].lower() == language.lower()]
    if module:
        rows = [row for row in rows if row["module"].lower() == module.lower()]
    return {"lessons": rows[:limit], "count": len(rows)}


def predict_demand(payload: dict[str, Any]) -> dict[str, Any]:
    category = payload.get("category", "Handicrafts")
    price = float(payload.get("price", payload.get("selling_price", 0)) or 0)
    rating = float(payload.get("rating", 4.0) or 4.0)
    views = float(payload.get("views_count", 0) or 0)
    category_base = {
        "Skincare Products": 72,
        "Pickles": 70,
        "Homemade Food": 68,
        "Handloom": 66,
        "Jewellery": 64,
        "Organic Products": 73,
        "Spices": 69,
        "Bamboo Products": 62,
        "Tailoring Items": 60,
        "Handicrafts": 65,
    }.get(category, 62)
    score = category_base + (rating - 4.0) * 12 + min(views, 3000) / 120
    if price > 1200:
        score -= 8
    level = "Very_High" if score >= 88 else "High" if score >= 70 else "Medium" if score >= 48 else "Low"
    return {"demand_level": level, "demand_score": round(max(0, min(score, 100)), 2)}


def fraud_safety_check(payload: dict[str, Any]) -> dict[str, Any]:
    price = float(payload.get("price", payload.get("selling_price", 0)) or 0)
    market_price = float(payload.get("market_price", 0) or 0)
    description = str(payload.get("description", "")).lower()
    flags = []
    if market_price and price > market_price * 1.8:
        flags.append("price_far_above_market")
    if any(term in description for term in ["guaranteed cure", "100% cure", "miracle", "fake branded"]):
        flags.append("risky_claim")
    if len(description.strip()) < 20:
        flags.append("weak_description")
    risk = "High" if len(flags) >= 2 else "Medium" if flags else "Low"
    return {"risk_level": risk, "flags": flags, "approved_for_demo": risk != "High"}

"""
FastAPI app for SheMarket Member 2 intelligence layer.

Run locally:
    python generate_datasets.py
    python train_price_model.py
    uvicorn api:app --reload

Member 1 can connect frontend/backend to these JSON endpoints.
"""

from __future__ import annotations

from typing import Any

from fastapi import FastAPI
from pydantic import BaseModel, Field

from shemarket_ai import (
    classify_image_demo,
    fraud_safety_check,
    generate_product_description,
    predict_price,
    predict_demand,
    recommend_products,
    train_price_model,
    training_lessons,
    transcribe_voice_demo,
    translate_text,
)


app = FastAPI(title="SheMarket AI/ML Intelligence Layer", version="1.0.0")


class VoiceRequest(BaseModel):
    audio_base64: str | None = None
    text_hint: str | None = Field(default=None, description="Use for local demo when no audio provider is connected.")
    language_hint: str = "auto"
    provider: str = Field(default="local", description="local, whisper, google_stt, bhashini")


class DescriptionRequest(BaseModel):
    product_input: str
    seller_state: str = ""
    language: str = "English"
    provider: str = Field(default="local", description="local, openai, gemini")
    regenerate_seed: int | None = None


class PriceRequest(BaseModel):
    category: str = "Skincare Products"
    raw_material_cost: float
    labour_cost: float
    packaging_cost: float
    market_price: float
    demand_level: str = "Medium"
    rating: float = 4.0


class TranslateRequest(BaseModel):
    text: str
    source_language: str = "auto"
    target_language: str = "English"
    provider: str = Field(default="local", description="local, openai, gemini, bhashini")


class ImageRequest(BaseModel):
    image_base64: str | None = None
    filename: str = "product.jpg"
    hint: str | None = None
    provider: str = Field(default="local", description="local, google_vision, gemini_vision, openai_vision")


@app.get("/")
def root() -> dict[str, Any]:
    return {
        "service": "SheMarket AI/ML Intelligence Layer",
        "status": "running",
        "endpoints": [
            "/api/ai/voice/transcribe",
            "/api/ai/products/describe",
            "/api/ai/price/train",
            "/api/ai/price/recommend",
            "/api/ai/recommendations/{product_id}",
            "/api/ai/translate",
            "/api/ai/image/classify",
        ],
    }


@app.post("/api/ai/voice/transcribe")
def voice_transcribe(request: VoiceRequest) -> dict[str, Any]:
    # Provider hook: add Whisper, Google Speech-to-Text, or Bhashini calls here.
    return transcribe_voice_demo(request.audio_base64, request.text_hint, request.language_hint)


@app.post("/api/ai/voice-to-text")
def project_voice_to_text(request: VoiceRequest) -> dict[str, Any]:
    result = transcribe_voice_demo(request.audio_base64, request.text_hint, request.language_hint)
    return {"text": result["text"], "language": result["language"]}


@app.post("/api/ai/products/describe")
def product_describe(request: DescriptionRequest) -> dict[str, Any]:
    # Provider hook: add OpenAI/Gemini prompt call here and keep this local fallback.
    return generate_product_description(request.product_input, request.seller_state, request.language, request.regenerate_seed)


@app.post("/api/ai/generate-description")
def project_generate_description(request: DescriptionRequest) -> dict[str, Any]:
    return generate_product_description(request.product_input, request.seller_state, request.language, request.regenerate_seed)


@app.post("/api/ai/price/train")
def price_train() -> dict[str, Any]:
    return train_price_model()


@app.post("/api/ai/price/recommend")
def price_recommend(request: PriceRequest) -> dict[str, Any]:
    return predict_price(request.model_dump())


@app.post("/api/ai/predict-price")
def project_predict_price(request: PriceRequest) -> dict[str, Any]:
    return predict_price(request.model_dump())


@app.get("/api/ai/recommendations/{product_id}")
def recommendations(product_id: str, limit: int = 6) -> dict[str, Any]:
    return recommend_products(product_id=product_id, limit=limit)


@app.get("/api/ai/recommendations")
def recommendations_by_category(category: str | None = None, limit: int = 6) -> dict[str, Any]:
    return recommend_products(category=category, limit=limit)


@app.post("/api/ai/recommend")
def project_recommend(payload: dict[str, Any]) -> dict[str, Any]:
    product_id = payload.get("product_id")
    category = payload.get("category")
    limit = int(payload.get("limit", 6))
    result = recommend_products(product_id=product_id, category=category, limit=limit)
    return {"recommendations": result["items"]}


@app.post("/api/ai/translate")
def translate(request: TranslateRequest) -> dict[str, Any]:
    return translate_text(request.text, request.target_language, request.source_language)


@app.post("/api/ai/image/classify")
def image_classify(request: ImageRequest) -> dict[str, Any]:
    # Provider hook: add Google Vision, Gemini Vision, or OpenAI Vision calls here.
    return classify_image_demo(request.filename, request.hint)


@app.get("/api/ai/training-content")
def training_content(language: str | None = None, module: str | None = None, limit: int = 8) -> dict[str, Any]:
    return training_lessons(language=language, module=module, limit=limit)


@app.post("/api/ai/demand-prediction")
def demand_prediction(payload: dict[str, Any]) -> dict[str, Any]:
    return predict_demand(payload)


@app.post("/api/ai/fraud-check")
def fraud_check(payload: dict[str, Any]) -> dict[str, Any]:
    return fraud_safety_check(payload)

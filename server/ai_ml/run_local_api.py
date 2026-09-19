"""
Dependency-free local HTTP API server for SheMarket Member 2.

Use this when uvicorn is not installed:
    python run_local_api.py

It exposes demo-compatible JSON endpoints on:
    http://127.0.0.1:8000
"""

from __future__ import annotations

import json
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import parse_qs, urlparse

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


HOST = "127.0.0.1"
PORT = 8000


class SheMarketHandler(BaseHTTPRequestHandler):
    def _send_json(self, payload: dict, status: int = 200) -> None:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _read_json(self) -> dict:
        length = int(self.headers.get("Content-Length", "0"))
        if length == 0:
            return {}
        raw = self.rfile.read(length).decode("utf-8")
        return json.loads(raw or "{}")

    def do_OPTIONS(self) -> None:
        self._send_json({"ok": True})

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        query = parse_qs(parsed.query)
        if parsed.path == "/":
            self._send_json(
                {
                    "service": "SheMarket AI/ML Intelligence Layer",
                    "status": "running",
                    "server": "dependency_free_http",
                }
            )
            return
        if parsed.path.startswith("/api/ai/recommendations/"):
            product_id = parsed.path.rsplit("/", 1)[-1]
            limit = int(query.get("limit", ["6"])[0])
            self._send_json(recommend_products(product_id=product_id, limit=limit))
            return
        if parsed.path == "/api/ai/recommendations":
            category = query.get("category", [None])[0]
            limit = int(query.get("limit", ["6"])[0])
            self._send_json(recommend_products(category=category, limit=limit))
            return
        if parsed.path == "/api/ai/training-content":
            language = query.get("language", [None])[0]
            module = query.get("module", [None])[0]
            limit = int(query.get("limit", ["8"])[0])
            self._send_json(training_lessons(language=language, module=module, limit=limit))
            return
        self._send_json({"error": "Not found", "path": parsed.path}, 404)

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        payload = self._read_json()
        try:
            if parsed.path == "/api/ai/voice/transcribe":
                self._send_json(
                    transcribe_voice_demo(
                        payload.get("audio_base64"),
                        payload.get("text_hint"),
                        payload.get("language_hint", "auto"),
                    )
                )
                return
            if parsed.path == "/api/ai/voice-to-text":
                result = transcribe_voice_demo(
                    payload.get("audio_base64"),
                    payload.get("text_hint"),
                    payload.get("language_hint", "auto"),
                )
                self._send_json({"text": result["text"], "language": result["language"]})
                return
            if parsed.path == "/api/ai/products/describe":
                self._send_json(
                    generate_product_description(
                        payload.get("product_input", ""),
                        payload.get("seller_state", ""),
                        payload.get("language", "English"),
                        payload.get("regenerate_seed"),
                    )
                )
                return
            if parsed.path == "/api/ai/generate-description":
                self._send_json(
                    generate_product_description(
                        payload.get("product_input", payload.get("input", "")),
                        payload.get("seller_state", ""),
                        payload.get("language", "English"),
                        payload.get("regenerate_seed"),
                    )
                )
                return
            if parsed.path == "/api/ai/price/train":
                self._send_json(train_price_model())
                return
            if parsed.path == "/api/ai/price/recommend":
                self._send_json(predict_price(payload))
                return
            if parsed.path == "/api/ai/predict-price":
                self._send_json(predict_price(payload))
                return
            if parsed.path == "/api/ai/recommend":
                result = recommend_products(
                    product_id=payload.get("product_id"),
                    category=payload.get("category"),
                    limit=int(payload.get("limit", 6)),
                )
                self._send_json({"recommendations": result["items"]})
                return
            if parsed.path == "/api/ai/translate":
                self._send_json(
                    translate_text(
                        payload.get("text", ""),
                        payload.get("target_language", "English"),
                        payload.get("source_language", "auto"),
                    )
                )
                return
            if parsed.path == "/api/ai/image/classify":
                self._send_json(classify_image_demo(payload.get("filename", "product.jpg"), payload.get("hint")))
                return
            if parsed.path == "/api/ai/demand-prediction":
                self._send_json(predict_demand(payload))
                return
            if parsed.path == "/api/ai/fraud-check":
                self._send_json(fraud_safety_check(payload))
                return
            self._send_json({"error": "Not found", "path": parsed.path}, 404)
        except Exception as exc:
            self._send_json({"error": str(exc)}, 500)


def main() -> None:
    server = HTTPServer((HOST, PORT), SheMarketHandler)
    print(f"SheMarket local API running at http://{HOST}:{PORT}")
    print("Press Ctrl+C to stop.")
    server.serve_forever()


if __name__ == "__main__":
    main()

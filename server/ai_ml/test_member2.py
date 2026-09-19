"""Smoke tests for the SheMarket Member 2 local intelligence layer."""

from __future__ import annotations

from shemarket_ai import (
    generate_product_description,
    predict_price,
    recommend_products,
    train_price_model,
    transcribe_voice_demo,
    translate_text,
)


def main() -> None:
    train_price_model()

    voice = transcribe_voice_demo(text_hint="This is handmade coconut soap", language_hint="auto")
    assert voice["text"] == "This is handmade coconut soap"
    assert voice["language"] == "English"

    description = generate_product_description("Handmade coconut soap made in Kerala", "Kerala")
    assert description["category"] == "Skincare Products"
    assert "description" in description
    assert description["tags"]

    price = predict_price(
        {
            "category": "Skincare Products",
            "raw_material_cost": 40,
            "labour_cost": 20,
            "packaging_cost": 10,
            "market_price": 130,
            "demand_level": "High",
            "rating": 4.5,
        }
    )
    assert price["recommended_price"] > 0

    reco = recommend_products(product_id="P0271", limit=4)
    assert len(reco["items"]) == 4

    translated = translate_text("Yeh handmade coconut soap hai")
    assert translated["target_language"] == "English"

    print("All Member 2 smoke tests passed.")


if __name__ == "__main__":
    main()

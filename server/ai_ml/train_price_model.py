"""Train and test the SheMarket smart price prediction model."""

from __future__ import annotations

from shemarket_ai import predict_price, train_price_model


def main() -> None:
    model = train_price_model()
    print("Price model trained.")
    print(f"Rows: {model['rows']}")
    print(f"Model: {model['model_type']}")
    print(f"MAE: {model['mae']}")
    print(f"RMSE: {model['rmse']}")
    demo = predict_price(
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
    print("Demo prediction:")
    print(demo)


if __name__ == "__main__":
    main()

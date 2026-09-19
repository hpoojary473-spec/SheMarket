# Member 2 Integration Contract

The existing Express app mounts AI routes at `/api/ai`. The route file `server/routes/ai.js` now proxies those requests to the Python AI service at `AI_SERVICE_URL` or `http://127.0.0.1:8000` by default.

Run the Python AI service before using the AI buttons:

```powershell
cd server\ai_ml
python train_price_model.py
python run_local_api.py
```

Then run Member 1's Express app normally from the project root:

```powershell
npm run dev
```

## Routes Used By Frontend

- `POST /api/ai/voice-to-text`
- `POST /api/ai/generate-description`
- `POST /api/ai/predict-price`
- `POST /api/ai/recommend`

## Voice Response

```json
{
  "text": "This is handmade coconut soap",
  "language": "English"
}
```

## Description Response

```json
{
  "product_name": "Coconut Soap Kerala",
  "category": "Skincare Products",
  "description": "Generated marketplace listing text",
  "tags": ["coconut", "soap", "skincare"],
  "seo_keywords": ["Skincare Products online"]
}
```

## Price Response

```json
{
  "recommended_price": 120
}
```

## Recommendation Response

```json
{
  "recommendations": [
    {
      "_id": "mock-ai-rec-P0452",
      "name": "Turmeric Face Pack 200g",
      "category": "Skincare Products",
      "description": "same category + high rating/orders",
      "price": 255,
      "image_url": "",
      "rating": 4.5
    }
  ]
}
```

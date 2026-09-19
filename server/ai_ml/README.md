# SheMarket Dataset Generator and AI/ML Layer

SheMarket is an AI marketplace concept for rural women entrepreneurs and SHG groups. This folder contains the Member 2 AI/ML work: datasets, prompts, smart price prediction, recommendation logic, voice/translation/description APIs, and optional image category detection.

## Generate Data

```powershell
python generate_datasets.py
```

The original file name is also kept as a compatibility wrapper:

```powershell
python "Generate datasets·PY"
```

All generated files are written to:

```text
outputs/
```

Important folders:

- `outputs/datasets` contains CSV, TXT, and JSON files for training and API integration.
- `outputs/pdf_documents` contains 8 separate detailed PDF documents.
- `outputs/images` contains separate SVG visuals for the app concept and AI/ML explanation.
- `outputs/models` contains the trained price model after running `train_price_model.py`.

## Member 2 Required Files

- `products.csv`
- `price_training_data.csv`
- `sample_voice_inputs.txt`
- `training_prompts.json`
- `recommendation_data.csv`
- `market_research_sources.csv`

Extra integration datasets are also generated: sellers, buyers, orders, reviews, product description samples, translation samples, training content, source-market research, and API contracts.

The current generated product dataset has 500 rows: 50 records each for Handicrafts, Pickles, Homemade Food, Handloom, Jewellery, Tailoring Items, Organic Products, Bamboo Products, Spices, and Skincare Products.

## Runtime Files

- `api.py` exposes the FastAPI intelligence layer for Member 1.
- `shemarket_ai.py` contains voice, description, price, recommendation, translation, and image-classification logic.
- `train_price_model.py` trains the local smart price prediction model.
- `test_member2.py` runs smoke tests for the AI/ML features.

## Train Model

```powershell
python train_price_model.py
```

## Run API Server

If `uvicorn` is installed:

```powershell
uvicorn api:app --reload
```

If `uvicorn` is not installed, use the dependency-free local server:

```powershell
python run_local_api.py
```

Important endpoints:

- `POST /api/ai/voice-to-text`
- `POST /api/ai/generate-description`
- `POST /api/ai/predict-price`
- `POST /api/ai/recommend`
- `POST /api/ai/voice/transcribe`
- `POST /api/ai/products/describe`
- `POST /api/ai/price/recommend`
- `GET /api/ai/recommendations/{product_id}`
- `POST /api/ai/translate`
- `POST /api/ai/image/classify`

## Provider Hooks

The API currently runs locally without paid keys. Provider hook comments are included for:

- OpenAI Whisper API
- Google Speech-to-Text
- Bhashini API
- OpenAI API / Gemini API for descriptions and translation
- Google Vision, Gemini Vision, or OpenAI Vision for image classification

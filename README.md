# SheMarket

SheMarket is an AI-assisted marketplace web app for rural women entrepreneurs and self-help groups. It includes a static HTML/CSS/JavaScript frontend, an Express + MySQL backend, Razorpay payment hooks, and a local Python AI/ML layer for product descriptions, translation, recommendations, price prediction, and training content.

## Features

- Buyer, seller, SHG, and admin pages
- Product listing, cart, checkout, orders, reviews, and dashboards
- MySQL database setup through Sequelize models
- JWT authentication and role-based routes
- Local AI service with deterministic fallbacks
- Optional OpenAI, Anthropic, Google Maps, and Razorpay integrations through environment variables
- Multilingual UI assets for English, Hindi, and Kannada

## Tech Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express, Sequelize, MySQL
- AI/ML: Python, NumPy, optional FastAPI/Uvicorn
- Payments: Razorpay

## Project Structure

```text
SheMarket/
  client/             Frontend pages, styles, and browser scripts
  server/             Express API, models, routes, controllers, and AI bridge
  server/ai_ml/       Local Python AI/ML service and dataset generation scripts
  .env.example        Environment variable template
  .gitignore          Files GitHub should ignore
  package.json        Root helper scripts
  requirements.txt    Python AI service dependencies
```

## Prerequisites

- Node.js 18 or newer
- MySQL 8 or compatible MySQL server
- Python 3.10 or newer, only if you want to run the AI service

## Setup

1. Install backend dependencies:

```bash
npm run install:server
```

2. Create your local environment file:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

3. Update `.env` with your MySQL password and any optional API keys.

4. Start MySQL and run the app:

```bash
npm run dev
```

The app runs at:

```text
http://localhost:5000
```

The server automatically creates the configured MySQL database if the credentials are valid.

## AI Service

The main app works without paid AI keys because several routes include local fallbacks. To run the local Python AI service:

```bash
pip install -r requirements.txt
npm run ai:train
npm run ai
```

The local AI service runs at:

```text
http://127.0.0.1:8000
```

## Environment Variables

Use `.env.example` as the template. Important variables:

- `PORT`: Express server port
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`: MySQL connection
- `JWT_SECRET`: secret key for authentication tokens
- `CLIENT_URL`: frontend origin for CORS
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`: payment integration keys
- `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_MAPS_API_KEY`: optional AI and map integrations
- `AI_SERVICE_URL`: optional local AI service URL, defaults to `http://127.0.0.1:8000`

Never upload your real `.env` file to GitHub.

## Files To Upload To GitHub

Upload these items:

- `client/`
- `server/`
- `.env.example`
- `.gitignore`
- `package.json`
- `requirements.txt`
- `README.md`

Do not upload these:

- `.env`
- `node_modules/`
- `server/node_modules/`
- `server/ai_ml/outputs/`
- `__pycache__/`
- `*.log`
- `.zip` files
- local screenshots, recordings, or rebuild notes

## Useful Commands

```bash
npm run install:server
npm run dev
npm start
npm run ai:train
npm run ai
```

## License

MIT

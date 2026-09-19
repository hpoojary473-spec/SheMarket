# SheMarket

SheMarket is a full-stack marketplace for rural women entrepreneurs in India, especially SHG members. It includes seller, buyer, and admin/SHG dashboards, JWT authentication, MySQL models through Sequelize, Razorpay test payment flow, and mock AI endpoints ready for a teammate to replace later.

## Folder Structure

```txt
shemarket/
├── client/
│   ├── pages/
│   ├── components/
│   └── assets/
│       ├── css/
│       └── js/
├── server/
│   ├── routes/
│   ├── models/
│   ├── controllers/
│   ├── middleware/
│   ├── utils/
│   └── index.js
├── .env
├── .env.example
├── package.json
└── README.md
```

## Tech Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js + Express
- Database: MySQL with Sequelize
- Auth: JWT + bcrypt password hashing
- Payments: Razorpay test mode with mock fallback
- AI: OpenAI transcription/text generation when keys are configured, deterministic local fallback otherwise
- Charts: Chart.js
- Styling: Custom warm palette using saffron, turmeric yellow, terracotta, cream white, and deep brown

## Setup

1. Install backend dependencies:

```bash
npm run install:server
```

2. Start MySQL locally.

3. Update `.env` with your MySQL username and password. The app will create the `shemarket` database automatically if the MySQL user has permission.

4. Start the app:

```bash
npm run dev
```

5. Open:

```txt
http://localhost:5000
```

Express serves the frontend from `client/`, so one server is enough for the hackathon demo.

## Environment Variables

The included `.env` uses safe development placeholders:

```env
PORT=5000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=shemarket
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_SYNC_ALTER=false
DB_LOGGING=false
JWT_SECRET=change-this-hackathon-secret
CLIENT_URL=http://localhost:5000
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=rzp_test_your_key_secret
OPENAI_API_KEY=
OPENAI_TRANSCRIBE_MODEL=gpt-4o-mini-transcribe
OPENAI_TEXT_MODEL=gpt-4o-mini
ANTHROPIC_API_KEY=
ANTHROPIC_VISION_MODEL=claude-sonnet-4-20250514
GOOGLE_MAPS_API_KEY=
```

If your MySQL root account has no password, leave `DB_PASSWORD=` blank. If table definitions change during development, set `DB_SYNC_ALTER=true` once, start the server, then switch it back to `false`.

Replace Razorpay keys with test mode keys from your Razorpay dashboard. If placeholder keys are used, checkout falls back to a mock payment success response so the demo flow still works.

Set `OPENAI_API_KEY` to enable server-side speech-to-text and AI listing generation. Without it, the browser speech recognizer can still pass text into the same API route, and the backend returns varied local Hindi/Kannada/English listing copy for demos.

Set `ANTHROPIC_API_KEY` to enable camera-based product image analysis on the seller Add Product page. If it is blank, captured photos are still saved and the seller can fill the form manually.

`GOOGLE_MAPS_API_KEY` is optional. Shop location links fall back to a Google Maps search URL built from shop address, city, state, and PIN.

Products store multilingual listing fields for English, Hindi, and Kannada alongside the original text. On create/update, the backend fills `name_i18n`, `description_i18n`, `category_i18n`, and `tags_i18n` using configured AI where available and a deterministic local translation fallback otherwise. The buyer marketplace, product details, cart, seller listings, orders, and analytics choose visible product text from the current language dropdown.

Seller analytics at `/api/dashboard/seller` is calculated from real seller orders and product costs. Demo chart data is used only when the seller has no non-cancelled orders.

Camera capture uses the browser `navigator.mediaDevices.getUserMedia({ video: true })` API and works in Chrome on `http://localhost:5000`. Normal file upload remains available as a backup.

Voice entry uses browser speech recognition first, then a short microphone recording sent to `/api/ai/voice-to-text` if supported. Product voice entry sends transcripts to `/api/ai/extract-product-details`; shop-location voice entry sends transcripts to `/api/ai/extract-shop-location`.

## Main Pages

Seller:

- `/pages/login.html`
- `/pages/seller-dashboard.html`
- `/pages/add-product.html`
- `/pages/seller-products.html`
- `/pages/seller-orders.html`
- `/pages/seller-analytics.html`
- `/pages/profile.html`

Buyer:

- `/index.html`
- `/pages/product-details.html?id=<product_id>`
- `/pages/cart.html`
- `/pages/checkout.html`
- `/pages/buyer-orders.html`
- `/pages/reviews.html?product_id=<product_id>`

SHG/Admin:

- `/pages/shg-dashboard.html`
- `/pages/seller-management.html`
- `/pages/reports.html`

## API Routes

Auth:

- `POST /api/auth/register`
- `POST /api/auth/login`

Products:

- `POST /api/products/add`
- `GET /api/products`
- `GET /api/products/:id`
- `PUT /api/products/:id`
- `DELETE /api/products/:id`

Orders:

- `POST /api/orders/create`
- `GET /api/orders`
- `PUT /api/orders/:id/status`

Reviews:

- `POST /api/reviews/add`
- `GET /api/reviews/:product_id`

Dashboard:

- `GET /api/dashboard/seller`
- `GET /api/dashboard/admin`

Payments:

- `POST /api/payments/create-order`
- `POST /api/payments/verify`

Admin helpers:

- `GET /api/admin/sellers`
- `PUT /api/admin/sellers/:id/approve`
- `GET /api/admin/shg-overview`

## AI, Language, And Media

Translations live in:

```txt
client/assets/i18n/en.json
client/assets/i18n/hi.json
client/assets/i18n/kn.json
```

The frontend loads these files through `client/assets/js/api.js`, stores the selected language in `localStorage`, and applies translations across static HTML, rendered cards, form placeholders, options, toasts, and role portals. Only English, Hindi, and Kannada are supported.

AI routes live in:


```txt
server/routes/ai.js
```

- `POST /api/ai/voice-to-text`
- `POST /api/ai/generate-description`
- `POST /api/ai/extract-product-details`
- `POST /api/ai/extract-shop-location`
- `POST /api/ai/predict-price`
- `POST /api/ai/recommend`
- `POST /api/ai/translate`

Missing product images are filled by `server/utils/imageMapper.js` and mirrored on the frontend, so product cards and detail pages do not render broken image slots.

## Demo Flow

1. Register a seller at `/pages/login.html`.
2. Add a product from `/pages/add-product.html`.
3. Try the microphone, description generator, and price suggestion buttons. Voice uses browser capture plus the backend transcription route; description generation varies by language and click.
4. Register a buyer, add the product to cart, and checkout.
5. Register an admin account and approve sellers from `/pages/seller-management.html`.

For a real deployment, do not allow public admin registration. Add an invite code or seed the first admin manually.

## MySQL Notes

This version uses Sequelize models in `server/models/`. The tables are:

- `users`
- `products`
- `orders`
- `reviews`
- `payments`
- `shg_groups`

The primary key column is `_id` with UUID values so the frontend can keep using a simple document-style API shape while the data lives in MySQL.

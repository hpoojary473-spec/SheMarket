# AI/ML Dataset Sources

Generated datasets include 500 product records: 50 per required category.

Categories:

- Handicrafts
- Pickles
- Homemade Food
- Handloom
- Jewellery
- Tailoring Items
- Organic Products
- Bamboo Products
- Spices
- Skincare Products

Reference marketplaces included in `market_research_sources.csv`:

- Amazon India
- Flipkart
- Meesho
- IndiaMART
- Etsy
- Local SHG product websites
- Instagram small businesses

The generated records are normalized hackathon training rows. They include `source_marketplace`, `source_url`, `reference_price_range`, `material`, `location_state`, `rating`, and `demand_level` so the ML model has clean and consistent fields.

Important files:

- `outputs/datasets/products.csv`
- `outputs/datasets/price_training_data.csv`
- `outputs/datasets/sample_voice_inputs.txt`
- `outputs/datasets/training_prompts.json`
- `outputs/datasets/recommendation_data.csv`
- `outputs/datasets/market_research_sources.csv`
- `outputs/models/price_model.pkl`

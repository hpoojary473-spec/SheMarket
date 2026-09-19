"""
SheMarket AI/ML dataset and documentation generator.

Run:
    python generate_datasets.py

Outputs are written to:
    ./outputs

This file is intentionally dependency-free so it runs on a normal Windows
Python install without ReportLab.
"""

from __future__ import annotations

import csv
import html
import json
import math
import random
import textwrap
from datetime import date, timedelta
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = ROOT_DIR / "outputs"
DATA_DIR = OUTPUT_DIR / "datasets"
PDF_DIR = OUTPUT_DIR / "pdf_documents"
IMAGE_DIR = OUTPUT_DIR / "images"

RANDOM_SEED = 20260506
random.seed(RANDOM_SEED)

RECORDS_PER_CATEGORY = 50

MARKET_REFERENCES = [
    {
        "source_marketplace": "Amazon",
        "source_url": "https://www.amazon.in/",
        "collection_method": "manual marketplace reference",
        "notes": "Used for broad Indian retail benchmark ranges.",
    },
    {
        "source_marketplace": "Flipkart",
        "source_url": "https://www.flipkart.com/",
        "collection_method": "manual marketplace reference",
        "notes": "Used for popular consumer-price benchmark ranges.",
    },
    {
        "source_marketplace": "Meesho",
        "source_url": "https://www.meesho.com/",
        "collection_method": "manual marketplace reference",
        "notes": "Used for budget Indian marketplace benchmark ranges.",
    },
    {
        "source_marketplace": "IndiaMART",
        "source_url": "https://www.indiamart.com/",
        "collection_method": "manual marketplace reference",
        "notes": "Used for wholesale/raw-material and supplier benchmark ranges.",
    },
    {
        "source_marketplace": "Etsy",
        "source_url": "https://www.etsy.com/in-en/",
        "collection_method": "manual marketplace reference",
        "notes": "Used for premium handmade/export benchmark ranges.",
    },
    {
        "source_marketplace": "Local SHG product websites",
        "source_url": "https://tribalecoshop.com/",
        "collection_method": "manual SHG/social-commerce reference",
        "notes": "Used for rural/tribal/self-help-group product benchmark ranges.",
    },
    {
        "source_marketplace": "Instagram small businesses",
        "source_url": "https://www.instagram.com/",
        "collection_method": "manual small-business observation",
        "notes": "Used for handmade boutique demand and pricing signals.",
    },
]

PRICE_RANGES = {
    "Handicrafts": (90, 1800),
    "Pickles": (90, 520),
    "Homemade Food": (70, 650),
    "Handloom": (250, 2800),
    "Jewellery": (80, 1600),
    "Tailoring Items": (90, 1200),
    "Organic Products": (120, 900),
    "Bamboo Products": (160, 1800),
    "Spices": (60, 520),
    "Skincare Products": (80, 650),
}

SOURCE_PRICE_MULTIPLIER = {
    "Amazon": 1.08,
    "Flipkart": 1.0,
    "Meesho": 0.78,
    "IndiaMART": 0.68,
    "Etsy": 2.45,
    "Local SHG product websites": 1.15,
    "Instagram small businesses": 1.28,
}


CATEGORIES = {
    "Handicrafts": [
        "Jute Basket",
        "Terracotta Pot",
        "Macrame Wall Hanging",
        "Clay Diya Set",
        "Wooden Coaster Set",
        "Paper Mache Bowl",
        "Crochet Market Bag",
        "Mirror Work Pouch",
        "Hand Painted Tray",
        "Cane Storage Box",
    ],
    "Pickles": [
        "Mango Pickle",
        "Lemon Pickle",
        "Mixed Vegetable Pickle",
        "Garlic Pickle",
        "Green Chilli Pickle",
        "Amla Pickle",
        "Bamboo Shoot Pickle",
        "Tomato Pickle",
        "Gongura Pickle",
        "Carrot Pickle",
    ],
    "Homemade Food": [
        "Banana Chips",
        "Jackfruit Chips",
        "Papad",
        "Khakhra",
        "Millet Cookies",
        "Amla Murabba",
        "Coconut Chutney Powder",
        "Gunpowder Podi",
        "Mango Jam",
        "Homemade Ghee",
    ],
    "Handloom": [
        "Cotton Saree",
        "Block Printed Dupatta",
        "Woolen Shawl",
        "Silk Scarf",
        "Handloom Kurta",
        "Cotton Bed Cover",
        "Table Runner",
        "Embroidered Stole",
        "Towel Set",
        "Cushion Cover",
    ],
    "Jewellery": [
        "Terracotta Necklace",
        "Beaded Bracelet",
        "Lac Bangle Set",
        "Thread Earrings",
        "Silver Dipped Jhumkas",
        "Beaded Anklet",
        "Fabric Hairband",
        "Clay Pendant",
        "Shell Necklace",
        "Maang Tikka",
    ],
    "Tailoring Items": [
        "Cotton Blouse",
        "School Uniform Set",
        "Reusable Cloth Bag",
        "Apron",
        "Laptop Sleeve",
        "Embroidery Pouch",
        "Kids Frock",
        "Kurti",
        "Pillow Cover",
        "Cloth Mask Pack",
    ],
    "Organic Products": [
        "Organic Honey",
        "Cold Pressed Coconut Oil",
        "Organic Ghee",
        "Herbal Tea Blend",
        "Moringa Powder",
        "Aloe Vera Juice",
        "Organic Jaggery",
        "Flax Seeds",
        "Millet Flour",
        "Cold Pressed Sesame Oil",
    ],
    "Bamboo Products": [
        "Bamboo Basket",
        "Bamboo Mat",
        "Bamboo Tray",
        "Bamboo Pen Stand",
        "Bamboo Lamp Shade",
        "Bamboo Coaster Set",
        "Bamboo Wall Clock",
        "Bamboo Cutlery Set",
        "Bamboo Plant Stand",
        "Bamboo Desk Organizer",
    ],
    "Spices": [
        "Turmeric Powder",
        "Red Chilli Powder",
        "Coriander Powder",
        "Garam Masala",
        "Sambar Powder",
        "Rasam Powder",
        "Pepper Powder",
        "Cumin Powder",
        "Tea Masala",
        "Fish Curry Masala",
    ],
    "Skincare Products": [
        "Handmade Coconut Soap",
        "Turmeric Face Pack",
        "Neem Tulsi Soap",
        "Rose Petal Scrub",
        "Aloe Vera Gel",
        "Herbal Hair Oil",
        "Multani Mitti Pack",
        "Sandalwood Cream",
        "Lip Balm",
        "Organic Rose Water",
    ],
}

STATES = [
    "Kerala",
    "Karnataka",
    "Tamil Nadu",
    "Andhra Pradesh",
    "Telangana",
    "Maharashtra",
    "Rajasthan",
    "Gujarat",
    "West Bengal",
    "Assam",
    "Uttar Pradesh",
    "Himachal Pradesh",
    "Madhya Pradesh",
    "Odisha",
]

SELLER_TYPES = ["individual", "SHG_member", "SHG_group"]
DEMAND_LEVELS = ["Low", "Medium", "High", "Very_High"]
LANGUAGES = [
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


class SimplePdf:
    """Tiny text-focused PDF writer for dependency-free local generation."""

    def __init__(self, title: str):
        self.title = title
        self.pages: list[list[tuple[int, int, int, str]]] = []
        self.lines: list[tuple[int, int, int, str]] = []
        self.y = 790
        self.page_width = 595
        self.page_height = 842
        self.margin_left = 48
        self.margin_right = 48
        self.line_height = 13
        self.new_page()

    def new_page(self) -> None:
        if self.lines:
            self.pages.append(self.lines)
        self.lines = []
        self.y = 790
        self._raw(10, 48, 818, "SheMarket AI/ML Training Dataset")
        self._raw(8, 450, 818, f"Page {len(self.pages) + 1}")
        self.y = 775

    def _raw(self, size: int, x: int, y: int, text: str) -> None:
        self.lines.append((size, x, y, text))

    def _ensure_space(self, needed: int = 16) -> None:
        if self.y - needed < 52:
            self.new_page()

    def add_title(self, text: str, subtitle: str = "") -> None:
        self._ensure_space(80)
        for line in textwrap.wrap(text, 36):
            self._raw(22, self.margin_left, self.y, line)
            self.y -= 28
        if subtitle:
            for line in textwrap.wrap(subtitle, 72):
                self._raw(11, self.margin_left, self.y, line)
                self.y -= 16
        self.y -= 12

    def add_heading(self, text: str) -> None:
        self._ensure_space(30)
        self.y -= 4
        self._raw(14, self.margin_left, self.y, text)
        self.y -= 20

    def add_small_heading(self, text: str) -> None:
        self._ensure_space(22)
        self._raw(11, self.margin_left, self.y, text)
        self.y -= 15

    def add_para(self, text: str, size: int = 9, width: int = 92) -> None:
        for para in text.split("\n"):
            if not para.strip():
                self.y -= self.line_height
                continue
            for line in textwrap.wrap(para, width):
                self._ensure_space()
                self._raw(size, self.margin_left, self.y, line)
                self.y -= self.line_height
            self.y -= 3

    def add_bullets(self, items: list[str]) -> None:
        for item in items:
            wrapped = textwrap.wrap(item, 88)
            for i, line in enumerate(wrapped):
                self._ensure_space()
                prefix = "- " if i == 0 else "  "
                self._raw(9, self.margin_left + 8, self.y, prefix + line)
                self.y -= self.line_height
            self.y -= 2

    def add_table(self, headers: list[str], rows: list[list[object]], max_rows: int | None = None) -> None:
        display_rows = rows if max_rows is None else rows[:max_rows]
        widths = self._column_widths(headers)
        self._table_line(headers, widths, header=True)
        for row in display_rows:
            self._table_line([str(v) for v in row], widths, header=False)
        if max_rows is not None and len(rows) > max_rows:
            self.add_para(f"... plus {len(rows) - max_rows} more rows in the generated CSV file.", size=8)
        self.y -= 6

    def _column_widths(self, headers: list[str]) -> list[int]:
        usable_chars = 92
        base = max(8, usable_chars // len(headers))
        widths = [base for _ in headers]
        if len(headers) >= 5:
            widths[0] = min(widths[0], 6)
            widths[1] = max(widths[1] + 8, 18)
        return widths

    def _table_line(self, values: list[object], widths: list[int], header: bool) -> None:
        parts = []
        for value, width in zip(values, widths):
            text = str(value).replace("\n", " ")
            parts.append(text[: width - 1].ljust(width))
        line = " | ".join(parts)
        self._ensure_space()
        self._raw(8 if not header else 8, self.margin_left, self.y, line)
        self.y -= 11

    @staticmethod
    def _escape(text: str) -> str:
        return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")

    def save(self, path: Path) -> None:
        if self.lines:
            self.pages.append(self.lines)
            self.lines = []
        objects: list[str] = []
        page_ids = []
        font_obj_id = 3
        next_id = 4

        objects.append("<< /Type /Catalog /Pages 2 0 R >>")
        objects.append("<< /Type /Pages /Kids [] /Count 0 >>")
        objects.append("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")

        for page in self.pages:
            content_id = next_id
            page_id = next_id + 1
            next_id += 2
            page_ids.append(page_id)
            stream_lines = ["BT"]
            for size, x, y, text in page:
                stream_lines.append(f"/F1 {size} Tf")
                stream_lines.append(f"1 0 0 1 {x} {y} Tm")
                stream_lines.append(f"({self._escape(text)}) Tj")
            stream_lines.append("ET")
            stream = "\n".join(stream_lines)
            objects.append(f"<< /Length {len(stream.encode('latin-1', 'replace'))} >>\nstream\n{stream}\nendstream")
            objects.append(
                f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {self.page_width} {self.page_height}] "
                f"/Resources << /Font << /F1 {font_obj_id} 0 R >> >> /Contents {content_id} 0 R >>"
            )

        kids = " ".join(f"{pid} 0 R" for pid in page_ids)
        objects[1] = f"<< /Type /Pages /Kids [{kids}] /Count {len(page_ids)} >>"

        path.parent.mkdir(parents=True, exist_ok=True)
        pdf = bytearray(b"%PDF-1.4\n")
        offsets = [0]
        for i, obj in enumerate(objects, start=1):
            offsets.append(len(pdf))
            pdf.extend(f"{i} 0 obj\n".encode("latin-1"))
            pdf.extend(obj.encode("latin-1", "replace"))
            pdf.extend(b"\nendobj\n")
        xref_pos = len(pdf)
        pdf.extend(f"xref\n0 {len(objects) + 1}\n".encode("latin-1"))
        pdf.extend(b"0000000000 65535 f \n")
        for offset in offsets[1:]:
            pdf.extend(f"{offset:010d} 00000 n \n".encode("latin-1"))
        pdf.extend(
            f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_pos}\n%%EOF".encode(
                "latin-1"
            )
        )
        path.write_bytes(pdf)


def ensure_dirs() -> None:
    for path in [OUTPUT_DIR, DATA_DIR, PDF_DIR, IMAGE_DIR]:
        path.mkdir(parents=True, exist_ok=True)


def price_multiplier(category: str) -> float:
    return {
        "Handloom": 2.65,
        "Jewellery": 2.25,
        "Organic Products": 2.15,
        "Bamboo Products": 2.05,
        "Handicrafts": 2.15,
        "Tailoring Items": 2.0,
        "Spices": 1.9,
        "Skincare Products": 2.1,
        "Pickles": 1.85,
        "Homemade Food": 1.8,
    }[category]


def referenced_market_price(category: str, source_name: str, row_index: int) -> tuple[int, str]:
    low, high = PRICE_RANGES[category]
    span = high - low
    base = low + ((row_index * 37 + len(category) * 19) % max(span, 1))
    adjusted = base * SOURCE_PRICE_MULTIPLIER[source_name]
    price = max(35, int(round(adjusted / 5) * 5))
    if source_name == "IndiaMART":
        price_range = f"Rs {max(25, int(price * 0.75))}-Rs {int(price * 1.1)} wholesale"
    elif source_name == "Etsy":
        price_range = f"Rs {int(price * 0.8)}-Rs {int(price * 1.35)} premium handmade"
    else:
        price_range = f"Rs {int(price * 0.85)}-Rs {int(price * 1.15)} retail"
    return price, price_range


def generate_products() -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    product_id = 1
    for category, names in CATEGORIES.items():
        for i in range(RECORDS_PER_CATEGORY):
            base_name = names[i % len(names)]
            size = ["100g", "200g", "250g", "500g", "set", "large", "small", "premium", "classic", "family pack"][i % 10]
            product_name = f"{base_name} {size}".strip()
            source = MARKET_REFERENCES[(product_id + i) % len(MARKET_REFERENCES)]
            reference_price, price_range = referenced_market_price(category, source["source_marketplace"], product_id)
            raw = random.randint(18, 180)
            if category == "Handloom":
                raw += random.randint(120, 420)
            if category in ["Jewellery", "Organic Products"]:
                raw += random.randint(30, 180)
            labour = max(10, int(raw * random.uniform(0.28, 0.62)))
            packaging = random.randint(6, 35)
            cost = raw + labour + packaging
            model_market = int(round(cost * price_multiplier(category) / 5) * 5)
            market = int(round(((model_market * 0.55) + (reference_price * 0.45)) / 5) * 5)
            demand = random.choices(DEMAND_LEVELS, weights=[8, 32, 45, 15])[0]
            demand_boost = {"Low": -0.08, "Medium": -0.03, "High": 0.03, "Very_High": 0.08}[demand]
            rating = round(random.uniform(3.8, 4.9), 1)
            selling = int(round(market * (0.86 + demand_boost + (rating - 4.2) * 0.025) / 5) * 5)
            state = STATES[(product_id + i) % len(STATES)]
            seller_type = SELLER_TYPES[(product_id + i * 2) % len(SELLER_TYPES)]
            stock = random.randint(8, 180)
            material = material_for(category, product_name)
            tags = ",".join(tagify([category, base_name, material, state, seller_type]))
            rows.append(
                {
                    "product_id": f"P{product_id:04d}",
                    "product_name": product_name,
                    "category": category,
                    "description": (
                        f"{product_name} made by rural women entrepreneurs in {state}. "
                        f"Uses {material.lower()} and is suitable for online direct-to-customer sales."
                    ),
                    "raw_material_cost": raw,
                    "labour_cost": labour,
                    "packaging_cost": packaging,
                    "market_price": market,
                    "selling_price": selling,
                    "stock_quantity": stock,
                    "location_state": state,
                    "seller_type": seller_type,
                    "rating": rating,
                    "demand_level": demand,
                    "material": material,
                    "tags": tags,
                    "source_marketplace": source["source_marketplace"],
                    "source_url": source["source_url"],
                    "reference_price_range": price_range,
                    "collection_method": source["collection_method"],
                }
            )
            product_id += 1
    return rows


def material_for(category: str, product_name: str) -> str:
    materials = {
        "Handicrafts": "jute, clay, cotton thread, natural colors",
        "Pickles": "seasonal vegetables, oil, salt, homemade spices",
        "Homemade Food": "local grains, fruit, oil, jaggery, spices",
        "Handloom": "cotton yarn, wool, silk blend, natural dye",
        "Jewellery": "terracotta, beads, lac, thread, metal hooks",
        "Tailoring Items": "cotton fabric, thread, buttons, lining",
        "Organic Products": "farm produce, herbs, cold pressed oils",
        "Bamboo Products": "bamboo cane, natural polish, cotton cord",
        "Spices": "cleaned whole spices, roasted spice blend",
        "Skincare Products": "coconut oil, herbs, essential oils, natural base",
    }
    return materials[category]


def tagify(values: list[str]) -> list[str]:
    tags = []
    for value in values:
        for part in value.replace("/", " ").replace(",", " ").split():
            clean = "".join(ch.lower() for ch in part if ch.isalnum() or ch == "_")
            if clean and clean not in tags:
                tags.append(clean)
    return tags[:8]


def write_csv(path: Path, rows: list[dict[str, object]], fieldnames: list[str] | None = None) -> None:
    if not rows:
        return
    fieldnames = fieldnames or list(rows[0].keys())
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def generate_sellers() -> list[dict[str, object]]:
    districts = ["Udupi", "Mysuru", "Kozhikode", "Madurai", "Jaipur", "Pune", "Guwahati", "Kutch", "Warangal", "Kolkata"]
    rows = []
    for i in range(1, 61):
        state = STATES[i % len(STATES)]
        seller_type = SELLER_TYPES[i % len(SELLER_TYPES)]
        rows.append(
            {
                "seller_id": f"S{i:03d}",
                "seller_name": f"SheMarket Seller {i:03d}",
                "seller_type": seller_type,
                "shg_name": f"Udyogini SHG {((i - 1) % 15) + 1}" if seller_type != "individual" else "",
                "state": state,
                "district": districts[i % len(districts)],
                "primary_language": LANGUAGES[i % len(LANGUAGES)],
                "upi_enabled": "yes" if i % 4 != 0 else "no",
                "bank_account_linked": "yes",
                "avg_dispatch_days": (i % 4) + 1,
                "trust_score": round(3.8 + (i % 12) * 0.09, 2),
            }
        )
    return rows


def generate_buyers() -> list[dict[str, object]]:
    rows = []
    city_types = ["metro", "tier_1", "tier_2", "tier_3"]
    for i in range(1, 121):
        rows.append(
            {
                "buyer_id": f"B{i:04d}",
                "buyer_name": f"Buyer {i:04d}",
                "state": STATES[(i * 3) % len(STATES)],
                "city_type": city_types[i % len(city_types)],
                "preferred_categories": "|".join(random.sample(list(CATEGORIES), 3)),
                "avg_order_value": random.randint(220, 1600),
                "payment_preference": random.choice(["UPI", "card", "wallet", "bank_transfer", "COD"]),
            }
        )
    return rows


def generate_orders(products: list[dict[str, object]], buyers: list[dict[str, object]], sellers: list[dict[str, object]]) -> list[dict[str, object]]:
    rows = []
    start = date(2026, 1, 1)
    for i in range(1, 251):
        product = products[(i * 7) % len(products)]
        qty = random.randint(1, 5)
        rows.append(
            {
                "order_id": f"O{i:05d}",
                "product_id": product["product_id"],
                "buyer_id": buyers[i % len(buyers)]["buyer_id"],
                "seller_id": sellers[i % len(sellers)]["seller_id"],
                "order_date": (start + timedelta(days=i % 120)).isoformat(),
                "quantity": qty,
                "unit_price": product["selling_price"],
                "total_amount": int(product["selling_price"]) * qty,
                "payment_mode": random.choice(["UPI", "wallet", "card", "bank_transfer"]),
                "logistics_partner": random.choice(["India Post", "Delhivery", "Blue Dart", "Shadowfax"]),
                "status": random.choice(["delivered", "shipped", "processing", "cancelled"]),
            }
        )
    return rows


def generate_reviews(orders: list[dict[str, object]]) -> list[dict[str, object]]:
    comments = [
        "Good quality and careful packing.",
        "Product matched the description.",
        "Fresh homemade taste and fast dispatch.",
        "Beautiful handmade finish.",
        "Value for money and authentic product.",
        "Packaging can improve but product is good.",
    ]
    rows = []
    for i, order in enumerate(orders[:180], start=1):
        rows.append(
            {
                "review_id": f"R{i:04d}",
                "order_id": order["order_id"],
                "product_id": order["product_id"],
                "rating": round(random.uniform(3.7, 5.0), 1),
                "review_text": comments[i % len(comments)],
                "sentiment_label": random.choices(["positive", "neutral", "negative"], weights=[78, 18, 4])[0],
            }
        )
    return rows


def generate_voice_samples(products: list[dict[str, object]]) -> list[dict[str, object]]:
    patterns = [
        "This is {product}.",
        "This {category} product is made by our SHG group.",
        "Please list {product} from {state}.",
        "The raw material cost is Rs {raw} and selling price should be near Rs {price}.",
        "This item is handmade using {material}.",
        "Stock available is {stock} pieces.",
        "Translate and create a product listing for {product}.",
        "My product is {product}, made at home with good quality.",
    ]
    rows = []
    for i in range(120):
        product = products[(i * 5) % len(products)]
        sentence = patterns[i % len(patterns)].format(
            product=product["product_name"],
            category=product["category"],
            state=product["location_state"],
            raw=product["raw_material_cost"],
            price=product["selling_price"],
            material=str(product["material"]).split(",")[0],
            stock=product["stock_quantity"],
        )
        rows.append(
            {
                "sample_id": f"V{i + 1:03d}",
                "language": LANGUAGES[i % len(LANGUAGES)],
                "transcript_romanized": sentence,
                "intent": random.choice(["create_listing", "set_price", "update_stock", "translate_listing"]),
                "target_fields": "product_name,category,description,price,stock",
            }
        )
    return rows


def generate_description_training(products: list[dict[str, object]]) -> list[dict[str, object]]:
    rows = []
    for i, product in enumerate(products[:150], start=1):
        tags = str(product["tags"]).split(",")[:5]
        rows.append(
            {
                "sample_id": f"D{i:03d}",
                "input_text": f"{product['product_name']}, {product['category']}, {product['material']}, made in {product['location_state']}",
                "expected_product_name": product["product_name"],
                "expected_category": product["category"],
                "expected_description": (
                    f"{product['product_name']} is a locally made {product['category'].lower()} item "
                    f"from {product['location_state']}. It is prepared by women entrepreneurs using "
                    f"{str(product['material']).lower()} and is suitable for direct online sale."
                ),
                "expected_tags": ",".join(tags),
            }
        )
    return rows


def generate_training_content() -> list[dict[str, object]]:
    lessons = [
        ("pricing", "How to calculate raw material, labour, packaging, platform fee, and profit margin."),
        ("packaging", "How to pack fragile, food, textile, and skincare products for courier pickup."),
        ("product_photography", "How to take clean product photos using natural light and a phone camera."),
        ("customer_service", "How to answer buyer questions and handle returns politely."),
        ("digital_payments", "How to verify UPI payments and bank settlement status."),
        ("inventory", "How to update stock quantity after local and online sales."),
        ("voice_upload", "How to speak product details clearly in local language."),
        ("translation", "How translated listings help reach national buyers."),
    ]
    rows = []
    for i in range(40):
        topic, content = lessons[i % len(lessons)]
        rows.append(
            {
                "lesson_id": f"T{i + 1:03d}",
                "module": topic,
                "title": f"{topic.replace('_', ' ').title()} Lesson {i // len(lessons) + 1}",
                "content": content,
                "language": LANGUAGES[i % len(LANGUAGES)],
                "difficulty": random.choice(["basic", "basic", "intermediate"]),
            }
        )
    return rows


def generate_recommendation_rows(products: list[dict[str, object]]) -> list[dict[str, object]]:
    rows = []
    for product in products:
        views = random.randint(40, 4500)
        orders = max(1, int(views * random.uniform(0.015, 0.09)))
        rows.append(
            {
                "product_id": product["product_id"],
                "product_name": product["product_name"],
                "category": product["category"],
                "rating": product["rating"],
                "orders_count": orders,
                "views_count": views,
                "price": product["selling_price"],
                "demand_level": product["demand_level"],
                "trend_score": round((orders * 0.55) + (views * 0.02) + (float(product["rating"]) * 20), 2),
            }
        )
    return rows


def generate_market_research_rows(products: list[dict[str, object]]) -> list[dict[str, object]]:
    rows = []
    for product in products:
        rows.append(
            {
                "product_id": product["product_id"],
                "product_name": product["product_name"],
                "category": product["category"],
                "source_marketplace": product["source_marketplace"],
                "source_url": product["source_url"],
                "reference_price_range": product["reference_price_range"],
                "material": product["material"],
                "location_state": product["location_state"],
                "rating": product["rating"],
                "demand_level": product["demand_level"],
                "collection_method": product["collection_method"],
            }
        )
    return rows


def generate_image_label_rows(products: list[dict[str, object]]) -> list[dict[str, object]]:
    rows = []
    image_root = OUTPUT_DIR / "image_dataset"
    for category in CATEGORIES:
        folder = image_root / category.lower().replace(" ", "_")
        folder.mkdir(parents=True, exist_ok=True)
        (folder / "README.txt").write_text(
            "Place 100-300 real product photos for this category here. "
            "Use filenames from image_labels.csv when possible.\n",
            encoding="utf-8",
        )

    for product in products:
        category_slug = str(product["category"]).lower().replace(" ", "_")
        filename = f"{product['product_id']}_{category_slug}.jpg"
        rows.append(
            {
                "image_id": f"IMG_{product['product_id']}",
                "product_id": product["product_id"],
                "file_path": f"outputs/image_dataset/{category_slug}/{filename}",
                "category": product["category"],
                "product_name": product["product_name"],
                "source_marketplace": product["source_marketplace"],
                "label_status": "needs_real_photo",
                "quality_score": "",
                "background_type": "",
                "lighting": "",
                "contains_person": "",
                "usable_for_listing": "",
            }
        )
    return rows


def generate_translation_rows(products: list[dict[str, object]]) -> list[dict[str, object]]:
    phrase_bank = {
        "Hindi": "Yeh haath se bana hua product hai.",
        "Kannada": "Idu kaiyinda madida utpanna.",
        "Malayalam": "Ithu kaiyil undakkiya ulpannam aanu.",
        "Tamil": "Idhu kaiyala seiyappatta porul.",
        "Telugu": "Idi chetitho tayaru chesina utpatti.",
        "Marathi": "Ha hatane banavlela utpadan aahe.",
        "Urdu": "Yeh haath se bana hua samaan hai.",
        "Tulu": "Idu kaiyinda madpu product.",
        "Konkani": "Ho hatan kelolo product asa.",
        "Beary": "Idu kaiyinda madida maal.",
        "Rajasthani": "Yo haathan banyo maal hai.",
        "English": "This is a handmade product.",
        "Bengali": "Eta hate toiri ponno.",
        "Gujarati": "Aa haath thi banavel product che.",
        "Punjabi": "Eh hath naal banaya product hai.",
        "Assamese": "Ei hate bonuwa product hoi.",
        "Odia": "Eha hatare tiari utpad ate.",
        "Maithili": "Ee haath se banail product achhi.",
        "Bhojpuri": "Ee haath se banawal product ba.",
        "Haryanvi": "Yo haath te banaya product se.",
        "Sanskrit": "Idam hastena nirmitam vastu.",
        "Nepali": "Yo haatle baneko product ho.",
    }
    rows = []
    for i, product in enumerate(products[:96], start=1):
        lang = LANGUAGES[i % len(LANGUAGES)]
        rows.append(
            {
                "sample_id": f"L{i:03d}",
                "source_language": lang,
                "source_text_romanized": f"{phrase_bank[lang]} Product: {product['product_name']}. Price Rs {product['selling_price']}.",
                "english_translation": f"This is a handmade product. Product: {product['product_name']}. Price Rs {product['selling_price']}.",
                "target_task": "listing_translation",
            }
        )
    return rows


def api_contracts() -> dict[str, object]:
    return {
        "service_name": "SheMarket Intelligence Layer",
        "base_path": "/api/ai",
        "endpoints": [
            {
                "method": "POST",
                "path": "/voice/transcribe",
                "purpose": "Convert seller voice upload to structured text fields.",
                "request": {"audio_base64": "string", "language_hint": "Hindi|Kannada|English|auto"},
                "response": {"transcript": "string", "detected_language": "string", "confidence": 0.0},
            },
            {
                "method": "POST",
                "path": "/products/describe",
                "purpose": "Generate product name, category, description, and tags.",
                "request": {"transcript": "string", "language": "string", "seller_state": "string"},
                "response": {"product_name": "string", "category": "string", "description": "string", "tags": ["string"]},
            },
            {
                "method": "POST",
                "path": "/price/recommend",
                "purpose": "Predict recommended selling price.",
                "request": {
                    "category": "string",
                    "raw_material_cost": 40,
                    "labour_cost": 20,
                    "packaging_cost": 10,
                    "market_price": 130,
                    "demand_level": "High",
                    "rating": 4.5,
                },
                "response": {"recommended_selling_price": 120, "model": "RandomForestRegressor|LinearRegression"},
            },
            {
                "method": "GET",
                "path": "/recommendations/{product_id}",
                "purpose": "Return same-category and trending product recommendations.",
                "response": {"items": [{"product_id": "P0001", "score": 98.5, "reason": "same category + high orders"}]},
            },
            {
                "method": "POST",
                "path": "/translate",
                "purpose": "Translate local-language listing text to English or another buyer language.",
                "request": {"text": "string", "source_language": "auto", "target_language": "English"},
                "response": {"translated_text": "string", "confidence": 0.0},
            },
        ],
    }


def training_prompts() -> dict[str, object]:
    return {
        "voice_ai": {
            "purpose": "Convert seller speech into text and structured product fields.",
            "system_prompt": "You are SheMarket Voice AI. Extract product_name, category, material, price, stock, and state from rural seller speech. Return strict JSON only.",
            "user_template": "Language hint: {language}. Seller speech transcript: {transcript}",
            "output_schema": {
                "text": "string",
                "language": "string",
                "product_name": "string|null",
                "category": "string|null",
                "price": "number|null",
                "stock_quantity": "number|null",
            },
        },
        "product_description_ai": {
            "purpose": "Generate product listing content from short seller input.",
            "system_prompt": "You are SheMarket Listing AI for rural women entrepreneurs. Create honest marketplace listings. Do not invent certifications or claims.",
            "user_template": "Product input: {product_input}. Seller state: {seller_state}. Language: {language}.",
            "output_schema": {
                "product_name": "string",
                "category": "string",
                "description": "string",
                "tags": ["string"],
                "seo_keywords": ["string"],
            },
        },
        "translation_ai": {
            "purpose": "Translate local-language seller text for national buyers.",
            "system_prompt": "Translate seller product text clearly. Preserve product names, quantities, prices, and locations.",
            "user_template": "Translate from {source_language} to {target_language}: {text}",
            "output_schema": {"translated_text": "string", "source_language": "string", "target_language": "string"},
        },
        "image_ai": {
            "purpose": "Detect likely product category from uploaded product photo.",
            "system_prompt": "Classify the uploaded product image into one SheMarket category. Return category, confidence, and visible evidence.",
            "categories": list(CATEGORIES.keys()),
            "output_schema": {"category": "string", "confidence": "number", "evidence": ["string"]},
        },
        "price_ml": {
            "purpose": "Predict recommended selling price from cost and market fields.",
            "features": [
                "category",
                "raw_material_cost",
                "labour_cost",
                "packaging_cost",
                "market_price",
                "demand_level",
                "rating",
            ],
            "label": "selling_price",
            "models": ["Linear Regression", "Random Forest Regressor"],
        },
        "recommendation_logic": {
            "purpose": "Recommend related and trending products.",
            "ranking_rule": "Same category first, then sort by rating, orders_count, views_count, demand_level, and price fit.",
            "output_schema": {"items": [{"product_id": "string", "score": "number", "reason": "string"}]},
        },
    }


def write_text_files(voice_rows: list[dict[str, object]]) -> None:
    lines = [
        f"{row['sample_id']} | {row['language']} | {row['intent']} | {row['transcript_romanized']}"
        for row in voice_rows
    ]
    (DATA_DIR / "sample_voice_inputs.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_svgs() -> None:
    app_svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="900" viewBox="0 0 1400 900">
<rect width="1400" height="900" fill="#f7fbf4"/>
<text x="70" y="80" font-family="Arial" font-size="46" font-weight="700" fill="#1b5e20">SheMarket App Concept</text>
<text x="70" y="120" font-family="Arial" font-size="22" fill="#555">AI marketplace for rural women entrepreneurs and SHG groups</text>
<rect x="90" y="180" width="360" height="640" rx="34" fill="#202124"/>
<rect x="112" y="216" width="316" height="568" rx="22" fill="#ffffff"/>
<rect x="112" y="216" width="316" height="88" rx="22" fill="#2e7d32"/>
<text x="142" y="268" font-family="Arial" font-size="28" font-weight="700" fill="#fff">Sell Product</text>
<circle cx="270" cy="392" r="66" fill="#ff8f00"/>
<text x="232" y="404" font-family="Arial" font-size="54" font-weight="700" fill="#fff">mic</text>
<text x="142" y="506" font-family="Arial" font-size="19" fill="#1a1a1a">"This is handmade coconut soap"</text>
<rect x="142" y="548" width="256" height="54" rx="10" fill="#e8f5e9"/>
<text x="160" y="582" font-family="Arial" font-size="18" fill="#1b5e20">AI category: Skincare</text>
<rect x="142" y="618" width="256" height="54" rx="10" fill="#fff3e0"/>
<text x="160" y="652" font-family="Arial" font-size="18" fill="#e65100">Price: Rs 120</text>
<rect x="142" y="688" width="256" height="54" rx="10" fill="#e3f2fd"/>
<text x="160" y="722" font-family="Arial" font-size="18" fill="#0d47a1">Publish Listing</text>
<rect x="540" y="190" width="780" height="100" rx="14" fill="#ffffff" stroke="#c8e6c9"/>
<text x="575" y="232" font-family="Arial" font-size="26" font-weight="700" fill="#1b5e20">Seller flow</text>
<text x="575" y="266" font-family="Arial" font-size="20" fill="#333">Voice upload -> AI description -> price prediction -> translation -> listing publish</text>
<rect x="540" y="335" width="230" height="170" rx="12" fill="#e8f5e9"/>
<text x="575" y="388" font-family="Arial" font-size="23" font-weight="700" fill="#1b5e20">Voice AI</text>
<text x="575" y="428" font-family="Arial" font-size="18" fill="#333">Hindi, Kannada,</text>
<text x="575" y="456" font-family="Arial" font-size="18" fill="#333">Tamil, Tulu and more</text>
<rect x="810" y="335" width="230" height="170" rx="12" fill="#fff3e0"/>
<text x="845" y="388" font-family="Arial" font-size="23" font-weight="700" fill="#e65100">Price ML</text>
<text x="845" y="428" font-family="Arial" font-size="18" fill="#333">Cost + demand +</text>
<text x="845" y="456" font-family="Arial" font-size="18" fill="#333">market price</text>
<rect x="1080" y="335" width="230" height="170" rx="12" fill="#e3f2fd"/>
<text x="1115" y="388" font-family="Arial" font-size="23" font-weight="700" fill="#0d47a1">APIs</text>
<text x="1115" y="428" font-family="Arial" font-size="18" fill="#333">Frontend calls the</text>
<text x="1115" y="456" font-family="Arial" font-size="18" fill="#333">intelligence layer</text>
<rect x="540" y="555" width="770" height="190" rx="12" fill="#ffffff" stroke="#c8e6c9"/>
<text x="575" y="610" font-family="Arial" font-size="25" font-weight="700" fill="#1b5e20">Buyer marketplace</text>
<text x="575" y="650" font-family="Arial" font-size="19" fill="#333">Search rural products, view ratings, order directly, pay with UPI, ship through courier partners.</text>
<text x="575" y="690" font-family="Arial" font-size="19" fill="#333">Recommendation logic shows same-category and trending products based on views, orders and rating.</text>
</svg>"""
    explanation_svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="900" viewBox="0 0 1400 900">
<rect width="1400" height="900" fill="#fbfbf8"/>
<text x="70" y="80" font-family="Arial" font-size="44" font-weight="700" fill="#1b5e20">SheMarket AI/ML + API Intelligence Layer</text>
<text x="70" y="120" font-family="Arial" font-size="22" fill="#555">Member 2 build scope for hackathon integration</text>
<g font-family="Arial" font-size="20" fill="#1a1a1a">
<rect x="80" y="190" width="230" height="110" rx="12" fill="#e8f5e9" stroke="#81c784"/>
<text x="115" y="238" font-weight="700">1. Voice AI</text><text x="115" y="270">speech to fields</text>
<rect x="370" y="190" width="230" height="110" rx="12" fill="#fff3e0" stroke="#ffb74d"/>
<text x="405" y="238" font-weight="700">2. Description AI</text><text x="405" y="270">listing text + tags</text>
<rect x="660" y="190" width="230" height="110" rx="12" fill="#e3f2fd" stroke="#64b5f6"/>
<text x="695" y="238" font-weight="700">3. Price ML</text><text x="695" y="270">recommended price</text>
<rect x="950" y="190" width="230" height="110" rx="12" fill="#f3e5f5" stroke="#ba68c8"/>
<text x="985" y="238" font-weight="700">4. Translation</text><text x="985" y="270">local to buyer lang</text>
<rect x="520" y="390" width="330" height="120" rx="12" fill="#ffffff" stroke="#c8e6c9"/>
<text x="555" y="440" font-weight="700">AI API Server</text><text x="555" y="474">FastAPI/Flask endpoints for frontend/backend</text>
<rect x="140" y="610" width="260" height="110" rx="12" fill="#e0f2f1" stroke="#4db6ac"/>
<text x="175" y="655" font-weight="700">Datasets</text><text x="175" y="687">CSV, TXT, JSON, PDFs</text>
<rect x="555" y="610" width="260" height="110" rx="12" fill="#fffde7" stroke="#d4c157"/>
<text x="590" y="655" font-weight="700">Models</text><text x="590" y="687">Regression + NLP logic</text>
<rect x="970" y="610" width="260" height="110" rx="12" fill="#fce4ec" stroke="#f06292"/>
<text x="1005" y="655" font-weight="700">Frontend Output</text><text x="1005" y="687">listing, price, suggestions</text>
</g>
<path d="M310 245 H370" stroke="#555" stroke-width="4" marker-end="url(#arrow)"/>
<path d="M600 245 H660" stroke="#555" stroke-width="4" marker-end="url(#arrow)"/>
<path d="M890 245 H950" stroke="#555" stroke-width="4" marker-end="url(#arrow)"/>
<path d="M685 300 V390" stroke="#555" stroke-width="4" marker-end="url(#arrow)"/>
<path d="M400 665 H555" stroke="#555" stroke-width="4" marker-end="url(#arrow)"/>
<path d="M815 665 H970" stroke="#555" stroke-width="4" marker-end="url(#arrow)"/>
<defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#555"/></marker></defs>
<text x="80" y="805" font-family="Arial" font-size="21" fill="#333">Integration promise: Member 1 sends product text/audio/cost fields to APIs. Member 2 returns structured listing, price, translation and recommendations.</text>
</svg>"""
    (IMAGE_DIR / "app_concept_image.svg").write_text(app_svg, encoding="utf-8")
    (IMAGE_DIR / "ai_ml_explanation_infographic.svg").write_text(explanation_svg, encoding="utf-8")


def build_pdf_1(products: list[dict[str, object]]) -> Path:
    pdf = SimplePdf("Product Dataset")
    pdf.add_title("Document 1 of 8: Product Dataset", "500 valid product records for SheMarket AI/ML demos")
    pdf.add_para(
        "This document defines the main products.csv dataset used by the category classifier, price model, search tags, "
        "recommendation system, and product listing screens. Each row is synthetic but realistic for a national hackathon demo."
    )
    pdf.add_heading("Required Fields")
    pdf.add_table(
        ["Field", "Purpose", "Example"],
        [
            ["product_name", "Seller-facing product title", "Handmade Coconut Soap 100g"],
            ["category", "One of the marketplace categories", "Skincare Products"],
            ["description", "Generated or curated listing text", "Natural handmade soap from Kerala"],
            ["raw_material_cost", "Input cost in Rs", 40],
            ["labour_cost", "Artisan labour in Rs", 20],
            ["packaging_cost", "Packing cost in Rs", 10],
            ["market_price", "Approximate competitor price", 130],
            ["selling_price", "Final or ML label price", 120],
            ["stock_quantity", "Current seller inventory", 50],
            ["location_state", "State where product is made", "Kerala"],
            ["seller_type", "individual, SHG_member, SHG_group", "SHG_member"],
            ["rating", "Buyer rating", 4.5],
            ["demand_level", "Low, Medium, High, Very_High", "High"],
        ],
    )
    pdf.add_heading("Category Coverage")
    pdf.add_table(["Category", "Rows", "Usage"], [[c, RECORDS_PER_CATEGORY, "training + demo search"] for c in CATEGORIES])
    pdf.add_heading("Sample Product Rows")
    pdf.add_table(
        ["ID", "Name", "Category", "Raw", "Lab", "Pack", "Market", "Sell", "State", "Demand"],
        [
            [
                p["product_id"],
                p["product_name"],
                p["category"],
                p["raw_material_cost"],
                p["labour_cost"],
                p["packaging_cost"],
                p["market_price"],
                p["selling_price"],
                p["location_state"],
                p["demand_level"],
            ]
            for p in products[:45]
        ],
        max_rows=45,
    )
    path = PDF_DIR / "01_Product_Dataset.pdf"
    pdf.save(path)
    return path


def build_pdf_2(voice_rows: list[dict[str, object]]) -> Path:
    pdf = SimplePdf("Voice AI Dataset")
    pdf.add_title("Document 2 of 8: Voice AI Dataset", "120 multilingual voice transcript prompts")
    pdf.add_para(
        "Use these lines to record voice clips or simulate speech-to-text during the hackathon. For real training, store audio "
        "as WAV/MP3 and keep this transcript file as the label. Start with clean speech, then add noisy outdoor samples."
    )
    pdf.add_heading("Voice AI Collection Rules")
    pdf.add_bullets(
        [
            "Collect 5 to 10 speakers per language where possible.",
            "Record product name, price, stock, material, state, and category in natural seller language.",
            "Keep transcript labels romanized if native script OCR/font support is not ready.",
            "Capture confidence, detected language, and extracted fields from the API response.",
        ]
    )
    pdf.add_heading("Sample Voice Inputs")
    pdf.add_table(["ID", "Language", "Intent", "Transcript"], [[r["sample_id"], r["language"], r["intent"], r["transcript_romanized"]] for r in voice_rows], max_rows=80)
    path = PDF_DIR / "02_Voice_AI_Dataset.pdf"
    pdf.save(path)
    return path


def build_pdf_3(desc_rows: list[dict[str, object]]) -> Path:
    pdf = SimplePdf("Product Description Generator")
    pdf.add_title("Document 3 of 8: Product Description Generator", "150 input-output examples for listing generation")
    pdf.add_para(
        "This dataset trains or evaluates the AI feature that turns a short seller phrase into a polished marketplace listing. "
        "The frontend can show the generated output before the seller publishes it."
    )
    pdf.add_heading("Model Input and Expected Output")
    pdf.add_bullets(
        [
            "Input: short seller phrase, product material, state, optional language.",
            "Output: product_name, category, description, and search tags.",
            "Guardrail: do not invent certifications such as organic, GI tag, FSSAI, or handmade unless the seller said it.",
            "Post-processing: limit title to 70 characters and tags to 5 to 8 keywords.",
        ]
    )
    pdf.add_table(
        ["ID", "Input", "Product", "Category", "Expected Description", "Tags"],
        [[r["sample_id"], r["input_text"], r["expected_product_name"], r["expected_category"], r["expected_description"], r["expected_tags"]] for r in desc_rows],
        max_rows=55,
    )
    path = PDF_DIR / "03_Product_Description_AI.pdf"
    pdf.save(path)
    return path


def build_pdf_4(products: list[dict[str, object]]) -> Path:
    pdf = SimplePdf("Smart Price Recommendation")
    pdf.add_title("Document 4 of 8: Smart Price Recommendation ML", "price_training_data.csv for Linear Regression or Random Forest")
    pdf.add_para(
        "This is the cleanest feature to implement as a classical ML model. Train selling_price from product cost, market price, "
        "demand level, rating, and category. For the hackathon, RandomForestRegressor usually performs well without heavy tuning."
    )
    pdf.add_heading("Recommended Training Columns")
    pdf.add_table(
        ["Column", "Role", "Notes"],
        [
            ["category", "categorical feature", "one-hot encode"],
            ["raw_material_cost", "numeric feature", "seller input"],
            ["labour_cost", "numeric feature", "seller input"],
            ["packaging_cost", "numeric feature", "seller input"],
            ["market_price", "numeric feature", "competitor/market estimate"],
            ["demand_level", "categorical feature", "Low to Very_High"],
            ["rating", "numeric feature", "use default 4.0 for new product"],
            ["selling_price", "label", "recommended output"],
        ],
    )
    pdf.add_heading("Model API Behavior")
    pdf.add_bullets(
        [
            "Validate that costs and market_price are positive numbers.",
            "Predict recommended_selling_price.",
            "Round output to nearest Rs 5 or Rs 10 for seller-friendly pricing.",
            "Return an explanation such as cost margin, demand boost, and market comparison.",
        ]
    )
    pdf.add_table(
        ["Name", "Cat", "Raw", "Lab", "Pack", "Market", "Demand", "Rating", "Sell"],
        [[p["product_name"], p["category"], p["raw_material_cost"], p["labour_cost"], p["packaging_cost"], p["market_price"], p["demand_level"], p["rating"], p["selling_price"]] for p in products],
        max_rows=75,
    )
    path = PDF_DIR / "04_Smart_Price_Recommendation_ML.pdf"
    pdf.save(path)
    return path


def build_pdf_5(reco_rows: list[dict[str, object]]) -> Path:
    pdf = SimplePdf("Recommendation System")
    pdf.add_title("Document 5 of 8: Recommendation System Dataset", "same-category, rating, orders, views, and trend score")
    pdf.add_para(
        "For a hackathon, a simple recommendation system is enough: when a buyer views a product, show products from the same "
        "category sorted by rating, orders_count, views_count, and price fit. Also keep a trending carousel across all categories."
    )
    pdf.add_heading("Recommendation Logic")
    pdf.add_bullets(
        [
            "Candidate filter: same category first, then organic or handcrafted related categories.",
            "Ranking: 40 percent rating, 35 percent orders, 15 percent views, 10 percent demand level.",
            "Cold start: use category popularity and seller state.",
            "API response should include reason text for the frontend card.",
        ]
    )
    pdf.add_table(["Product", "Category", "Rating", "Orders", "Views", "Price", "Trend"], [[r["product_name"], r["category"], r["rating"], r["orders_count"], r["views_count"], r["price"], r["trend_score"]] for r in reco_rows], max_rows=80)
    path = PDF_DIR / "05_Recommendation_System.pdf"
    pdf.save(path)
    return path


def build_pdf_6() -> Path:
    pdf = SimplePdf("Image Recognition")
    pdf.add_title("Document 6 of 8: Image Recognition Data Plan", "100 to 300 images per category for future visual category detection")
    pdf.add_para(
        "This document is a collection plan because image files are too large to embed in a dataset generator. The goal is to "
        "test whether an uploaded product photo belongs to the claimed category and whether the image quality is usable."
    )
    pdf.add_heading("Folder Structure")
    pdf.add_table(
        ["Folder", "Images", "Examples"],
        [[f"images/{category.lower().replace(' ', '_')}", "100-300", ", ".join(items[:3])] for category, items in CATEGORIES.items()],
    )
    pdf.add_heading("Label File")
    pdf.add_para(
        "Create image_labels.csv with columns: image_id, file_path, category, product_name, state, quality_score, "
        "background_type, lighting, contains_person, usable_for_listing."
    )
    pdf.add_heading("Collection Rules")
    pdf.add_bullets(
        [
            "Use seller-owned photos or copyright-safe demo photos.",
            "Collect front view, close-up, packaging view, and scale/reference view.",
            "Avoid watermarks and marketplace screenshots for model training.",
            "For demo, image recognition can run as quality check plus category suggestion.",
        ]
    )
    path = PDF_DIR / "06_Image_Recognition_Data_Plan.pdf"
    pdf.save(path)
    return path


def build_pdf_7() -> Path:
    pdf = SimplePdf("Dataset File Dictionary")
    pdf.add_title("Document 7 of 8: Most Important Dataset Files", "CSV, TXT, and JSON files generated for Member 2")
    pdf.add_para(
        "These are the files your AI/ML and API layer can use immediately. Keep these filenames stable so Member 1 can call "
        "your API and read sample responses during integration."
    )
    files = [
        ["products.csv", "500 rows", "core marketplace + category + source-reference price data"],
        ["sellers.csv", "60 rows", "seller profiles and SHG metadata"],
        ["buyers.csv", "120 rows", "buyer preferences for demo recommendation testing"],
        ["orders.csv", "250 rows", "order history for analytics and recommendations"],
        ["reviews.csv", "180 rows", "rating and sentiment examples"],
        ["training_content.csv", "40 rows", "seller training module content"],
        ["price_training_data.csv", "500 rows", "ML regression training data"],
        ["sample_voice_inputs.txt", "120 lines", "voice AI recording/transcript prompts"],
        ["product_description_training.csv", "150 rows", "NLP listing generation examples"],
        ["recommendation_data.csv", "500 rows", "views, orders, ratings, trend score"],
        ["market_research_sources.csv", "500 rows", "source marketplace, URL, material, price range"],
        ["image_labels.csv", "500 rows", "image category labels and collection paths"],
        ["translation_samples.csv", "96 rows", "local-language translation examples"],
        ["api_contracts.json", "5 endpoints", "contract between Member 1 and Member 2"],
    ]
    pdf.add_table(["File", "Size", "Use"], files)
    pdf.add_heading("Integration Notes")
    pdf.add_bullets(
        [
            "Frontend sends audio/text and product costs to the API layer.",
            "AI layer returns JSON only; avoid returning raw model text to the frontend.",
            "Keep product_id, seller_id, buyer_id, and order_id stable for joins.",
            "Use products.csv during demos when the backend database is not ready.",
        ]
    )
    path = PDF_DIR / "07_Dataset_File_Dictionary.pdf"
    pdf.save(path)
    return path


def build_pdf_8() -> Path:
    pdf = SimplePdf("Collection Sources and APIs")
    pdf.add_title("Document 8 of 8: Data Collection Sources and API Plan", "market price references, API contracts, and Member 2 checklist")
    pdf.add_para(
        "Use approximate market prices from public marketplace browsing and local SHG references. For hackathon datasets, store "
        "source names and price ranges instead of scraping private or copyrighted data."
    )
    pdf.add_heading("Suggested Price Sources")
    pdf.add_table(
        ["Source", "Collect", "Notes"],
        [
            ["Amazon", "price range, rating, category", "manual reference for popular products"],
            ["Flipkart", "price range and title patterns", "compare common food/skincare items"],
            ["Meesho", "low-cost rural and handmade categories", "use as mass-market benchmark"],
            ["IndiaMART", "bulk price and supplier type", "use for raw material and wholesale signals"],
            ["Etsy", "premium handmade benchmark", "use carefully for export-like pricing"],
            ["Local SHG websites", "authentic product names and states", "best source for social-impact relevance"],
            ["Instagram small businesses", "visual style and demand signals", "manual observation only"],
        ],
    )
    pdf.add_heading("Member 2 API Checklist")
    pdf.add_bullets(
        [
            "Voice AI endpoint: accepts audio and returns transcript plus extracted product fields.",
            "Description endpoint: accepts transcript and returns product_name, category, description, tags.",
            "Price endpoint: accepts cost fields and returns recommended selling price.",
            "Recommendation endpoint: accepts product_id and returns ranked products with reasons.",
            "Translation endpoint: accepts text and target language and returns translated listing.",
            "Keep all endpoints JSON-based so Member 1 frontend/backend can connect without model-specific logic.",
        ]
    )
    pdf.add_heading("Demo Story for Judges")
    pdf.add_para(
        "A rural seller speaks in her local language. The intelligence layer converts her speech into a professional listing, "
        "suggests a fair price, translates the listing for national buyers, and recommends related products. This directly "
        "reduces dependency on middlemen and makes digital selling easier for SHG members."
    )
    path = PDF_DIR / "08_Data_Collection_and_API_Integration.pdf"
    pdf.save(path)
    return path


def generate_all() -> dict[str, list[str]]:
    ensure_dirs()
    products = generate_products()
    sellers = generate_sellers()
    buyers = generate_buyers()
    orders = generate_orders(products, buyers, sellers)
    reviews = generate_reviews(orders)
    voice_rows = generate_voice_samples(products)
    desc_rows = generate_description_training(products)
    training_content = generate_training_content()
    reco_rows = generate_recommendation_rows(products)
    market_rows = generate_market_research_rows(products)
    image_rows = generate_image_label_rows(products)
    translation_rows = generate_translation_rows(products)

    write_csv(DATA_DIR / "products.csv", products)
    write_csv(DATA_DIR / "sellers.csv", sellers)
    write_csv(DATA_DIR / "buyers.csv", buyers)
    write_csv(DATA_DIR / "orders.csv", orders)
    write_csv(DATA_DIR / "reviews.csv", reviews)
    write_csv(DATA_DIR / "training_content.csv", training_content)
    write_csv(
        DATA_DIR / "price_training_data.csv",
        [
            {
                "product_name": p["product_name"],
                "category": p["category"],
                "raw_material_cost": p["raw_material_cost"],
                "labour_cost": p["labour_cost"],
                "packaging_cost": p["packaging_cost"],
                "market_price": p["market_price"],
                "demand_level": p["demand_level"],
                "rating": p["rating"],
                "selling_price": p["selling_price"],
            }
            for p in products
        ],
    )
    write_csv(DATA_DIR / "product_description_training.csv", desc_rows)
    write_csv(DATA_DIR / "recommendation_data.csv", reco_rows)
    write_csv(DATA_DIR / "market_research_sources.csv", market_rows)
    write_csv(DATA_DIR / "image_labels.csv", image_rows)
    write_csv(DATA_DIR / "translation_samples.csv", translation_rows)
    write_text_files(voice_rows)
    (DATA_DIR / "api_contracts.json").write_text(json.dumps(api_contracts(), indent=2), encoding="utf-8")
    (DATA_DIR / "training_prompts.json").write_text(json.dumps(training_prompts(), indent=2), encoding="utf-8")
    write_svgs()

    pdfs = [
        build_pdf_1(products),
        build_pdf_2(voice_rows),
        build_pdf_3(desc_rows),
        build_pdf_4(products),
        build_pdf_5(reco_rows),
        build_pdf_6(),
        build_pdf_7(),
        build_pdf_8(),
    ]

    return {
        "datasets": sorted(str(p) for p in DATA_DIR.iterdir() if p.is_file()),
        "pdfs": [str(p) for p in pdfs],
        "images": sorted(str(p) for p in IMAGE_DIR.iterdir() if p.is_file()),
    }


def print_summary(outputs: dict[str, list[str]]) -> None:
    print("SheMarket dataset generation complete.")
    print(f"Output folder: {OUTPUT_DIR}")
    print(f"Dataset files: {len(outputs['datasets'])}")
    print(f"PDF documents: {len(outputs['pdfs'])}")
    print(f"Image files: {len(outputs['images'])}")
    print("\nPDF documents:")
    for path in outputs["pdfs"]:
        print(f"  - {path}")
    print("\nDatasets:")
    for path in outputs["datasets"]:
        print(f"  - {path}")
    print("\nImages:")
    for path in outputs["images"]:
        print(f"  - {path}")


def main() -> None:
    outputs = generate_all()
    print_summary(outputs)


if __name__ == "__main__":
    main()

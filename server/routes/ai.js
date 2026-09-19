const http = require('http');
const https = require('https');
const express = require('express');
const { productImageDataUrl, inferImageCategory } = require('../utils/imageMapper');
const {
  getLocalMarketStats,
  getDemandScore,
  getRegionalMultiplier,
  getActiveFestival,
  calculateFinalPrice
} = require('../utils/pricingIntelligence');

const router = express.Router();

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_TEXT_MODEL = process.env.OPENAI_TEXT_MODEL || 'gpt-4o-mini';
const OPENAI_TRANSCRIBE_MODEL = process.env.OPENAI_TRANSCRIBE_MODEL || 'gpt-4o-mini-transcribe';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const ANTHROPIC_VISION_MODEL = process.env.ANTHROPIC_VISION_MODEL || 'claude-sonnet-4-20250514';
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';

const categories = [
  'Handicrafts',
  'Pickles',
  'Homemade Food',
  'Handloom',
  'Jewellery',
  'Tailoring Items',
  'Organic Products',
  'Bamboo Products',
  'Spices',
  'Skincare Products'
];

const languageMeta = {
  English: { code: 'en', label: 'English' },
  Hindi: { code: 'hi', label: 'Hindi' },
  Kannada: { code: 'kn', label: 'Kannada' }
};

const wordTranslations = {
  Hindi: {
    Handmade: 'हस्तनिर्मित',
    Coconut: 'नारियल',
    Soap: 'साबुन',
    Pickle: 'अचार',
    Pickles: 'अचार',
    Saree: 'साड़ी',
    Dupatta: 'दुपट्टा',
    Jute: 'जूट',
    Bag: 'बैग',
    Bamboo: 'बांस',
    Basket: 'टोकरी',
    Spice: 'मसाला',
    Spices: 'मसाले',
    Millet: 'बाजरा',
    Laddoo: 'लड्डू',
    Diya: 'दीया',
    Terracotta: 'मिट्टी',
    Candle: 'मोमबत्ती',
    Natural: 'प्राकृतिक',
    Organic: 'जैविक',
    Handicrafts: 'हस्तशिल्प'
  },
  Kannada: {
    Handmade: 'ಕೈಯಿಂದ ಮಾಡಿದ',
    Coconut: 'ತೆಂಗಿನ',
    Soap: 'ಸಾಬೂನು',
    Pickle: 'ಉಪ್ಪಿನಕಾಯಿ',
    Pickles: 'ಉಪ್ಪಿನಕಾಯಿ',
    Saree: 'ಸೀರೆ',
    Dupatta: 'ದುಪಟ್ಟಾ',
    Jute: 'ಜೂಟ್',
    Bag: 'ಚೀಲ',
    Bamboo: 'ಬಿದಿರು',
    Basket: 'ಟೊಕರಿ',
    Spice: 'ಮಸಾಲೆ',
    Spices: 'ಮಸಾಲೆಗಳು',
    Millet: 'ಸಿರಿಧಾನ್ಯ',
    Laddoo: 'ಲಡ್ಡು',
    Diya: 'ದೀಪ',
    Terracotta: 'ಮಣ್ಣಿನ',
    Candle: 'ಮೆಣಬತ್ತಿ',
    Natural: 'ಸ್ವಾಭಾವಿಕ',
    Organic: 'ಸಾವಯವ',
    Handicrafts: 'ಕರಕುಶಲ'
  }
};

const categoryTranslations = {
  Hindi: {
    Handicrafts: 'हस्तशिल्प',
    Pickles: 'अचार',
    'Homemade Food': 'घर का बना भोजन',
    Handloom: 'हथकरघा',
    Jewellery: 'आभूषण',
    'Tailoring Items': 'सिलाई सामग्री',
    'Organic Products': 'जैविक उत्पाद',
    'Bamboo Products': 'बांस उत्पाद',
    Spices: 'मसाले',
    'Skincare Products': 'त्वचा देखभाल उत्पाद'
  },
  Kannada: {
    Handicrafts: 'ಕರಕುಶಲ',
    Pickles: 'ಉಪ್ಪಿನಕಾಯಿ',
    'Homemade Food': 'ಮನೆಯ ಆಹಾರ',
    Handloom: 'ಕೈಮಗ್ಗ',
    Jewellery: 'ಆಭರಣ',
    'Tailoring Items': 'ಹೊಲಿಗೆ ವಸ್ತುಗಳು',
    'Organic Products': 'ಸಾವಯವ ಉತ್ಪನ್ನಗಳು',
    'Bamboo Products': 'ಬಿದಿರು ಉತ್ಪನ್ನಗಳು',
    Spices: 'ಮಸಾಲೆಗಳು',
    'Skincare Products': 'ಚರ್ಮ ಆರೈಕೆ ಉತ್ಪನ್ನಗಳು'
  }
};

const descriptionTemplates = {
  English: [
    '{name} is a carefully made {category} product from a women-led SHG. It highlights local materials, small-batch preparation, and dependable quality for everyday use or thoughtful gifting.',
    'Made by rural women entrepreneurs, {name} brings together traditional skill and practical finish. This {category} listing is suitable for direct online purchase, home use, and festive gifting.',
    '{name} is prepared in small batches with attention to quality, packaging, and fair pricing. The product carries the story of women-led enterprise while staying useful for modern buyers.'
  ],
  Hindi: [
    '{name} महिला-नेतृत्व वाले SHG द्वारा सावधानी से बनाया गया {category} उत्पाद है। इसमें स्थानीय सामग्री, छोटे बैच की तैयारी और रोजमर्रा के उपयोग या उपहार के लिए भरोसेमंद गुणवत्ता मिलती है।',
    'ग्रामीण महिला उद्यमियों द्वारा बनाया गया {name} पारंपरिक कौशल और साफ फिनिश को जोड़ता है। यह {category} उत्पाद ऑनलाइन खरीद, घर के उपयोग और त्योहारों के उपहार के लिए उपयुक्त है।',
    '{name} छोटे बैच में गुणवत्ता, पैकेजिंग और उचित मूल्य का ध्यान रखकर बनाया जाता है। यह उत्पाद महिला उद्यमिता की कहानी को आधुनिक खरीदारों तक पहुंचाता है।'
  ],
  Kannada: [
    '{name} ಮಹಿಳೆಯರು ನಡೆಸುವ SHG ಮೂಲಕ যত್ನದಿಂದ ತಯಾರಿಸಿದ {category} ಉತ್ಪನ್ನವಾಗಿದೆ. ಸ್ಥಳೀಯ ಸಾಮಗ್ರಿ, ಸಣ್ಣ ಪ್ರಮಾಣದ ತಯಾರಿ ಮತ್ತು ದೈನಂದಿನ ಬಳಕೆ ಅಥವಾ ಉಡುಗೊರೆಗೆ ನಂಬಿಕಸ್ಥ ಗುಣಮಟ್ಟ ಹೊಂದಿದೆ.',
    'ಗ್ರಾಮೀಣ ಮಹಿಳಾ ಉದ್ಯಮಿಗಳಿಂದ ತಯಾರಾದ {name} ಪರಂಪರೆಯ ಕೌಶಲ್ಯ ಮತ್ತು ಉತ್ತಮ ಪೂರ್ಣತೆಯನ್ನು ಒಟ್ಟುಗೂಡಿಸುತ್ತದೆ. ಈ {category} ಉತ್ಪನ್ನ ಆನ್‌ಲೈನ್ ಖರೀದಿ, ಮನೆ ಬಳಕೆ ಮತ್ತು ಹಬ್ಬದ ಉಡುಗೊರೆಗೆ ಸೂಕ್ತವಾಗಿದೆ.',
    '{name} ಗುಣಮಟ್ಟ, ಪ್ಯಾಕೇಜಿಂಗ್ ಮತ್ತು ನ್ಯಾಯಯುತ ಬೆಲೆಯನ್ನು ಗಮನದಲ್ಲಿಟ್ಟುಕೊಂಡು ಸಣ್ಣ ಬ್ಯಾಚ್‌ನಲ್ಲಿ ತಯಾರಿಸಲಾಗುತ್ತದೆ. ಈ ಉತ್ಪನ್ನ ಮಹಿಳಾ ಉದ್ಯಮಶೀಲತೆಯ ಕಥೆಯನ್ನು ಆಧುನಿಕ ಖರೀದಿದಾರರಿಗೆ ತಲುಪಿಸುತ್ತದೆ.'
  ]
};

function postToAiService(path, payload) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, AI_SERVICE_URL);
    const data = JSON.stringify(payload || {});
    const client = url.protocol === 'https:' ? https : http;
    const request = client.request(
      {
        method: 'POST',
        hostname: url.hostname,
        port: url.port,
        path: `${url.pathname}${url.search}`,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        },
        timeout: 2800
      },
      (response) => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          body += chunk;
        });
        response.on('end', () => {
          try {
            const parsed = body ? JSON.parse(body) : {};
            if (response.statusCode >= 400) {
              reject(new Error(parsed.error || parsed.message || 'AI service request failed'));
              return;
            }
            resolve(parsed);
          } catch (error) {
            reject(error);
          }
        });
      }
    );

    request.on('timeout', () => request.destroy(new Error('AI service timeout')));
    request.on('error', reject);
    request.write(data);
    request.end();
  });
}

function normalizeLanguage(language) {
  const value = String(language || '').trim().toLowerCase();
  if (value === 'hi' || value === 'hindi' || value === 'हिंदी') return 'Hindi';
  if (value === 'kn' || value === 'kannada' || value === 'ಕನ್ನಡ') return 'Kannada';
  return 'English';
}

function normalizeDescriptionBody(body) {
  return {
    product_input: body.product_input || body.product_text || body.input || body.text || '',
    previous_description: body.previous_description || '',
    seller_state: body.seller_state || body.state || '',
    language: normalizeLanguage(body.language || body.language_hint || body.language_code),
    regenerate_seed: body.regenerate_seed || `${Date.now()}-${Math.random()}`
  };
}

function normalizeRecommendation(item, index) {
  const category = item.category || inferImageCategory(item);
  const name = item.name || item.product_name || 'Recommended SHG Product';
  return {
    _id: item._id || `mock-ai-rec-${item.product_id || index + 1}`,
    name,
    category,
    description: item.description || item.reason || 'Recommended from SheMarket AI based on similar product interest.',
    price: Number(item.price || item.selling_price || 0),
    image_url: item.image_url || productImageDataUrl(category, name),
    rating: Number(item.rating || 0)
  };
}

async function transcribeWithOpenAI(body) {
  if (!OPENAI_API_KEY || !globalThis.fetch || !globalThis.FormData || !globalThis.Blob || !body.audio_data_url) return null;
  const audio = parseDataUrl(body.audio_data_url);
  if (!audio) return null;

  const form = new FormData();
  const blob = new Blob([audio.buffer], { type: audio.mimeType });
  form.append('file', blob, `speech.${audio.extension}`);
  form.append('model', OPENAI_TRANSCRIBE_MODEL);

  const language = languageMeta[normalizeLanguage(body.language_hint || body.language_code)]?.code;
  if (language) form.append('language', language);
  form.append('prompt', 'Full spoken description for an Indian rural women entrepreneur marketplace product listing. Transcribe everything the speaker says completely and accurately.');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`
    },
    body: form
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || 'OpenAI transcription failed');
  }

  return {
    text: cleanVoiceText(data.text),
    language: normalizeLanguage(body.language_hint || body.language_code),
    provider: 'openai'
  };
}

async function generateWithOpenAI(body) {
  if (!OPENAI_API_KEY || !globalThis.fetch) return null;
  const language = normalizeLanguage(body.language);
  const prompt = [
    `Generate a marketplace listing in ${languageMeta[language].label}.`,
    `Return strict JSON with keys: product_name, category, description, tags, seo_keywords.`,
    `category must be one of: ${categories.join(', ')}.`,
    'product_name, description, tags, and seo_keywords must be fully in the selected language.',
    'Use warm but professional copy for rural women entrepreneurs in India.',
    'Do not repeat the previous description. Add a fresh angle and natural variation.',
    `Product input: ${body.product_input || 'handmade product'}`,
    `Previous description: ${body.previous_description || 'none'}`,
    `Variation seed: ${body.regenerate_seed}`
  ].join('\n');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: OPENAI_TEXT_MODEL,
      temperature: 0.92,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You create concise, buyer-ready ecommerce listings for SheMarket. Always obey the requested output language.'
        },
        { role: 'user', content: prompt }
      ]
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || 'OpenAI description generation failed');
  }

  const content = data.choices?.[0]?.message?.content || '{}';
  return normalizeGeneratedListing(JSON.parse(content), body);
}

function buildGeneratedListing(body) {
  const language = normalizeLanguage(body.language);
  const seed = seedNumber(body.regenerate_seed);
  const input = cleanInput(body.product_input) || 'Handmade Product';
  const category = categories.includes(inferImageCategory({ name: input, category: '' }))
    ? inferImageCategory({ name: input, category: '' })
    : inferCategory(input);
  const productName = localizeName(toTitleCase(input), language);
  const localizedCategory = categoryTranslations[language]?.[category] || category;
  const templateList = descriptionTemplates[language] || descriptionTemplates.English;
  const template = templateList[seed % templateList.length];
  const description = template
    .replaceAll('{name}', productName)
    .replaceAll('{category}', localizedCategory);

  const tagSets = buildTagSets(category, language);
  const tags = tagSets[seed % tagSets.length];
  const seo = buildSeoKeywords(productName, category, language, seed);

  return {
    product_name: productName,
    category,
    display_category: localizedCategory,
    description,
    tags,
    seo_keywords: seo,
    variation_seed: body.regenerate_seed,
    fallback: true
  };
}

function normalizeGeneratedListing(result, body) {
  const fallback = buildGeneratedListing(body);
  const category = categories.includes(result.category) ? result.category : inferCategory(result.category || body.product_input);
  return {
    product_name: result.product_name || fallback.product_name,
    category,
    display_category: result.display_category || categoryTranslations[normalizeLanguage(body.language)]?.[category] || category,
    description: result.description || fallback.description,
    tags: Array.isArray(result.tags) ? result.tags.slice(0, 8) : fallback.tags,
    seo_keywords: Array.isArray(result.seo_keywords) ? result.seo_keywords.slice(0, 8) : fallback.seo_keywords
  };
}

function inferCategory(input) {
  if (String(input || '').toLowerCase().includes('skincare')) return 'Skincare Products';
  const category = inferImageCategory({ name: input, category: '' });
  return categories.includes(category) ? category : 'Handicrafts';
}

function buildTagSets(category, language) {
  const localizedCategory = categoryTranslations[language]?.[category] || category;
  const base = {
    English: [
      ['handmade', 'women-led', 'SHG', localizedCategory, 'rural enterprise'],
      ['local craft', 'small batch', 'fair price', localizedCategory, 'India'],
      ['artisan made', 'self help group', 'gift ready', localizedCategory, 'ethical']
    ],
    Hindi: [
      ['हस्तनिर्मित', 'महिला नेतृत्व', 'SHG', localizedCategory, 'ग्रामीण उद्यम'],
      ['स्थानीय कला', 'छोटा बैच', 'उचित मूल्य', localizedCategory, 'भारत'],
      ['कारीगर निर्मित', 'स्वयं सहायता समूह', 'उपहार योग्य', localizedCategory, 'विश्वसनीय']
    ],
    Kannada: [
      ['ಕೈಯಿಂದ ಮಾಡಿದ', 'ಮಹಿಳಾ ನೇತೃತ್ವ', 'SHG', localizedCategory, 'ಗ್ರಾಮೀಣ ಉದ್ಯಮ'],
      ['ಸ್ಥಳೀಯ ಕಲೆ', 'ಸಣ್ಣ ಬ್ಯಾಚ್', 'ನ್ಯಾಯಯುತ ಬೆಲೆ', localizedCategory, 'ಭಾರತ'],
      ['ಕರಕುಶಲ ತಯಾರಿ', 'ಸ್ವಸಹಾಯ ಗುಂಪು', 'ಉಡುಗೊರೆಗೆ ಸಿದ್ಧ', localizedCategory, 'ನಂಬಿಕಸ್ಥ']
    ]
  };
  return base[language] || base.English;
}

function buildSeoKeywords(productName, category, language, seed) {
  const localizedCategory = categoryTranslations[language]?.[category] || category;
  const keywords = {
    English: [
      `${productName} online`,
      `${localizedCategory} by women SHG`,
      `handmade ${localizedCategory} India`,
      'rural women entrepreneur products'
    ],
    Hindi: [
      `${productName} ऑनलाइन`,
      `महिला SHG ${localizedCategory}`,
      `हस्तनिर्मित ${localizedCategory}`,
      'ग्रामीण महिला उद्यमी उत्पाद'
    ],
    Kannada: [
      `${productName} ಆನ್‌ಲೈನ್`,
      `ಮಹಿಳಾ SHG ${localizedCategory}`,
      `ಕೈಯಿಂದ ಮಾಡಿದ ${localizedCategory}`,
      'ಗ್ರಾಮೀಣ ಮಹಿಳಾ ಉದ್ಯಮಿ ಉತ್ಪನ್ನಗಳು'
    ]
  };
  const list = keywords[language] || keywords.English;
  return seed % 2 ? list.reverse() : list;
}

function localizeName(name, language) {
  if (language === 'English') return name;
  const words = wordTranslations[language] || {};
  return name.replace(/\b[A-Za-z]+\b/g, (word) => words[word] || words[word.replace(/s$/, '')] || word);
}

function cleanInput(value) {
  return String(value || '')
    .replace(/[<>{}[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanVoiceText(value) {
  return cleanInput(value).replace(/[.।]+$/g, '');
}

function toTitleCase(value) {
  return cleanInput(value)
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function seedNumber(value) {
  const text = String(value || Date.now());
  let seed = 0;
  for (let index = 0; index < text.length; index += 1) {
    seed = (seed * 31 + text.charCodeAt(index)) >>> 0;
  }
  return seed;
}

function extractProductDetails(transcript, language) {
  const text = String(transcript || '');
  const lower = text.toLowerCase();
  const category = inferCategory(extractAfter(lower, ['category', 'category is', 'in category']) || text);
  const productName = toTitleCase(
    extractAfter(text, ['this is', 'product name is', 'name is'])
      || text.split(/[.]/)[0]
      || 'Handmade Product'
  ).replace(/\b(Category|It Is Made|Raw Material|Labour|Labor|Packaging|Selling Price|Tags)\b.*$/i, '').trim();
  const descriptivePart = cleanInput(text.split(/\b(raw material cost|labour cost|labor cost|packaging cost|selling price|tags?)\b/i)[0]);
  const description = cleanInput(
    descriptivePart
      || extractSentenceContaining(text, ['made with', 'made of', 'ingredients'])
      || `${productName} is a handmade ${category} product made by a women producer.`
  );
  const raw = extractMoney(lower, ['raw material cost', 'raw material', 'material cost']);
  const labour = extractMoney(lower, ['labour cost', 'labor cost', 'labour', 'labor']);
  const packaging = extractMoney(lower, ['packaging cost', 'packaging']);
  const selling = extractMoney(lower, ['selling price', 'price is', 'price']);
  const tagsText = extractAfter(text, ['tags', 'tag']);
  const tags = tagsText
    ? tagsText.split(/[,\s]+/).map((tag) => cleanInput(tag)).filter((tag) => tag && !/^(and|rupees?|rs)$/i.test(tag)).slice(0, 8)
    : buildFallbackTags(productName, category);

  const recommended = selling || Math.round(((raw + labour + packaging) * 1.7) / 5) * 5 || 0;
  return {
    product_name: productName || defaultVoiceText(language),
    category,
    description,
    raw_material_cost: raw,
    labour_cost: labour,
    packaging_cost: packaging,
    selling_price: selling || recommended,
    recommended_price: recommended || selling,
    tags,
    seo_keywords: [
      productName,
      `${productName} online`,
      `handmade ${category}`,
      `${category} by women producers`
    ].filter(Boolean),
    raw_transcript: text,
    missing_fields: [
      raw ? '' : 'raw_material_cost',
      labour ? '' : 'labour_cost',
      packaging ? '' : 'packaging_cost',
      (selling || recommended) ? '' : 'selling_price'
    ].filter(Boolean)
  };
}

async function extractShopLocation(transcript) {
  const text = cleanInput(String(transcript || '').replace(/[_|]+/g, ' '));
  const phone = extractPhone(text);
  const pincode = text.match(/\b\d{6}\b/)?.[0] || '';
  const inferredLocation = inferLocationParts(text, pincode);
  const shopName = cleanShopName(
    extractBetween(
      text,
      ['my shop name is', 'shop name is', 'store name is', 'business name is', 'shop name', 'store name'],
      ['phone', 'mobile', 'contact', 'number', 'address', 'location', 'city', 'pincode', 'pin code', 'pin']
    )
      || extractAfter(text, ['my shop is', 'shop is', 'store is'])
      || ''
  );
  const address = cleanInput(
    extractBetween(text, ['address is', 'shop address is', 'location is', 'located at'], ['city', 'state', 'pincode', 'pin code', 'pin', 'timing', 'hours'])
      || inferredLocation.address
      || ''
  );
  const city = cleanInput(
    extractBetween(text, ['city is', 'city'], ['state', 'pincode', 'pin code', 'pin', 'timing', 'hours'])
      || inferredLocation.city
      || ''
  );
  const state = cleanInput(
    extractBetween(text, ['state is', 'state'], ['pincode', 'pin code', 'pin', 'timing', 'hours'])
      || inferredLocation.state
      || ''
  );
  const hours = extractShopHours(text);
  const query = [address, city, state, pincode].filter(Boolean).join(' ');

  return {
    shop_name: shopName,
    shop_phone: phone,
    shop_address: address,
    city,
    state,
    pincode,
    shop_hours: normalizeHours(hours),
    google_maps_link: await googleMapsLink(query)
  };
}

function extractPhone(text) {
  const direct = String(text || '').match(/(?:phone|mobile|contact|number|no\.?)\D*(\+?91[-\s]?)?([6-9]\d{9}|\d{10})/i);
  if (direct) return direct[2].replace(/\D/g, '').slice(-10);
  return String(text || '').match(/\b(?:\+91[-\s]?)?\d{10}\b/)?.[0]?.replace(/\D/g, '').slice(-10) || '';
}

function cleanShopName(value) {
  return cleanInput(value).replace(/^[,.\s]+|[,.\s]+$/g, '');
}

function extractShopHours(text) {
  const source = String(text || '').replace(/_/g, ' ');
  const explicit = extractAfter(source, ['timing is', 'timings are', 'timing', 'timings', 'shop hours are', 'shop hours', 'hours are', 'hours']);
  const hoursText = explicit || source.match(/\b(?:mon|monday|tue|tues|tuesday|wed|wednesday|thu|thursday|fri|friday|sat|saturday|sun|sunday)[a-z\s,-]*\d{1,2}\s*(?:am|pm)\s*(?:-|to)\s*\d{1,2}\s*(?:am|pm)\b/i)?.[0] || '';
  return normalizeHours(hoursText);
}

function inferLocationParts(text, pincode) {
  const result = { address: '', city: '', state: '' };
  const source = String(text || '');
  const pinIndex = pincode ? source.indexOf(pincode) : -1;
  if (pinIndex === -1) return result;

  const beforePin = source
    .slice(0, pinIndex)
    .replace(/\b(?:phone|mobile|contact|number|no\.?)\D*(?:\+?91[-\s]?)?\d{10}\b/i, ' ')
    .replace(/\b(?:my shop name is|shop name is|store name is|business name is|my name is)\b[^,.;]*/ig, ' ')
    .replace(/\b(?:direction of it and|directions? of it and|address is|shop address is|located at|location is)\b/ig, ' ');

  const parts = beforePin
    .split(/[,\n.;]+/)
    .map((part) => cleanInput(part))
    .filter(Boolean);

  if (parts.length >= 2) {
    const stateCandidate = parts[parts.length - 1];
    const cityCandidate = parts[parts.length - 2];
    result.state = normalizeState(stateCandidate);
    result.city = toTitleCase(cityCandidate);
    result.address = cleanInferredAddress(parts.slice(0, -2).join(', '));
    return result;
  }

  const tokens = cleanInput(beforePin).split(/\s+/).filter(Boolean);
  if (tokens.length >= 2) {
    result.state = normalizeState(tokens[tokens.length - 1]);
    result.city = toTitleCase(tokens[tokens.length - 2]);
    result.address = cleanInferredAddress(tokens.slice(0, -2).join(' '));
  }

  return result;
}

function cleanInferredAddress(value) {
  const address = cleanInput(value)
    .replace(/\b(?:hi|hello|hey|my name is|i am|and|please)\b/ig, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return address.length > 2 ? address : '';
}

function normalizeState(value) {
  const text = cleanInput(value);
  if (/^dk$/i.test(text)) return 'Dakshina Kannada';
  if (/^ka$/i.test(text)) return 'Karnataka';
  return toTitleCase(text);
}

async function normalizeShopLocationDetails(details = {}) {
  const normalized = {
    shop_name: cleanInput(details.shop_name),
    shop_phone: cleanInput(details.shop_phone).replace(/\D/g, '').slice(-10),
    shop_address: cleanInput(details.shop_address),
    city: cleanInput(details.city),
    state: cleanInput(details.state),
    pincode: cleanInput(details.pincode),
    shop_hours: normalizeHours(details.shop_hours),
    google_maps_link: cleanInput(details.google_maps_link)
  };
  if (!normalized.google_maps_link) {
    normalized.google_maps_link = await googleMapsLink([
      normalized.shop_address,
      normalized.city,
      normalized.state,
      normalized.pincode
    ].filter(Boolean).join(' '));
  }
  return normalized;
}

function extractAfter(text, markers) {
  const source = String(text || '');
  const lower = source.toLowerCase();
  for (const marker of markers) {
    const index = lower.indexOf(marker.toLowerCase());
    if (index !== -1) {
      return cleanInput(source.slice(index + marker.length).split(/[.;]/)[0]);
    }
  }
  return '';
}

function extractBetween(text, startMarkers, endMarkers) {
  const source = String(text || '');
  const lower = source.toLowerCase();
  for (const start of startMarkers) {
    const startIndex = lower.indexOf(start.toLowerCase());
    if (startIndex === -1) continue;
    const bodyStart = startIndex + start.length;
    const restLower = lower.slice(bodyStart);
    const endOffsets = endMarkers
      .map((end) => restLower.indexOf(end.toLowerCase()))
      .filter((index) => index >= 0);
    const endIndex = endOffsets.length ? bodyStart + Math.min(...endOffsets) : source.length;
    return source.slice(bodyStart, endIndex);
  }
  return '';
}

function extractMoney(text, markers) {
  for (const marker of markers) {
    const pattern = new RegExp(`${marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*(?:is|of|:)?\\s*(?:rs\\.?|rupees?|inr)?\\s*(\\d+(?:\\.\\d+)?)`, 'i');
    const match = String(text || '').match(pattern);
    if (match) return Number(match[1]);
  }
  return 0;
}

function extractSentenceContaining(text, needles) {
  return String(text || '').split(/[.]/).find((sentence) => (
    needles.some((needle) => sentence.toLowerCase().includes(needle))
  ));
}

function buildFallbackTags(productName, category) {
  return [category, 'handmade', ...String(productName || '').split(/\s+/)]
    .map((tag) => cleanInput(tag).toLowerCase())
    .filter(Boolean)
    .slice(0, 6);
}

function normalizeHours(hours) {
  const text = cleanInput(hours)
    .replace(/_/g, ' ')
    .replace(/\s*-\s*/g, ' - ')
    .replace(/\bto\b/ig, ' - ')
    .replace(/\s+/g, ' ');
  if (!text) return '';
  return text
    .replace(/\bmonday to saturday\b/i, 'Mon-Sat')
    .replace(/\bmon(?:day)?\s*[-,]\s*sat(?:urday)?\b/i, 'Mon-Sat')
    .replace(/\btue(?:sday)?\b/i, 'Tue')
    .replace(/\bmon(?:day)?\b/i, 'Mon')
    .replace(/\bwed(?:nesday)?\b/i, 'Wed')
    .replace(/\bthu(?:rsday)?\b/i, 'Thu')
    .replace(/\bfri(?:day)?\b/i, 'Fri')
    .replace(/\bsat(?:urday)?\b/i, 'Sat')
    .replace(/\bsun(?:day)?\b/i, 'Sun')
    .replace(/\b(\d{1,2})\s*am\b/ig, '$1 AM')
    .replace(/\b(\d{1,2})\s*pm\b/ig, '$1 PM')
    .replace(/\b10 AM - 6 PM\b/i, '10 AM - 6 PM');
}

async function googleMapsLink(query) {
  const cleanQuery = cleanInput(query);
  if (!cleanQuery) return '';
  if (GOOGLE_MAPS_API_KEY && globalThis.fetch) {
    try {
      const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(cleanQuery)}&key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}`);
      const data = await response.json();
      const placeId = data.results?.[0]?.place_id;
      if (placeId) {
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanQuery)}&query_place_id=${encodeURIComponent(placeId)}`;
      }
    } catch (error) {
      // Fall back to a normal Maps search URL below.
    }
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanQuery)}`;
}

function parseDataUrl(dataUrl) {
  const match = String(dataUrl || '').match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  const mimeType = match[1];
  const extension = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('mpeg') ? 'mp3' : mimeType.includes('wav') ? 'wav' : 'webm';
  return {
    mimeType,
    extension,
    buffer: Buffer.from(match[2], 'base64')
  };
}

function parseImageDataUrl(dataUrl) {
  const match = String(dataUrl || '').match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;
  return {
    mediaType: match[1],
    data: match[2]
  };
}

function extractJsonObject(value) {
  const text = String(value || '').trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Image analysis did not return JSON.');
  }
  return JSON.parse(text.slice(start, end + 1));
}

async function analyzeProductImageWithClaude(imageDataUrl) {
  if (!ANTHROPIC_API_KEY || !globalThis.fetch) {
    throw new Error('Claude image analysis is not configured.');
  }

  const image = parseImageDataUrl(imageDataUrl);
  if (!image) {
    throw new Error('Invalid product image.');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: ANTHROPIC_VISION_MODEL,
      max_tokens: 700,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: image.mediaType,
              data: image.data
            }
          },
          {
            type: 'text',
            text: 'Analyze this product image and return ONLY a JSON object with these keys: productName, shortDescription (max 60 words), detailedDescription (max 150 words), suggestedCategory, suggestedPriceRangeINR.'
          }
        ]
      }]
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || 'Claude image analysis failed.');
  }

  const content = data.content?.map((part) => part.text || '').join('\n') || '';
  const parsed = extractJsonObject(content);
  return {
    productName: cleanInput(parsed.productName),
    shortDescription: cleanInput(parsed.shortDescription),
    detailedDescription: cleanInput(parsed.detailedDescription),
    suggestedCategory: categories.includes(parsed.suggestedCategory) ? parsed.suggestedCategory : inferCategory(parsed.suggestedCategory || parsed.productName),
    suggestedPriceRangeINR: cleanInput(parsed.suggestedPriceRangeINR)
  };
}

router.post('/voice-to-text', async (req, res) => {
  const language = normalizeLanguage(req.body?.language_hint || req.body?.language_code || req.body?.language);
  try {
    const openAiResult = await transcribeWithOpenAI(req.body || {});
    if (openAiResult?.text) return res.json(openAiResult);
  } catch (error) {
    // Fall through to browser/local transcript so demos keep moving if credentials are absent or invalid.
  }

  try {
    const result = await postToAiService('/api/ai/voice-to-text', req.body);
    return res.json({
      text: cleanVoiceText(result.text || req.body?.text_hint || defaultVoiceText(language)),
      language: normalizeLanguage(result.language || language),
      provider: result.provider || 'local'
    });
  } catch (error) {
    return res.json({
      text: cleanVoiceText(req.body?.text_hint || defaultVoiceText(language)),
      language,
      fallback: true
    });
  }
});

router.post('/generate-description', async (req, res) => {
  const body = normalizeDescriptionBody(req.body || {});
  try {
    const openAiResult = await generateWithOpenAI(body);
    if (openAiResult) return res.json(openAiResult);
  } catch (error) {
    // Use deterministic local generation below.
  }

  res.json(buildGeneratedListing(body));
});

router.post('/analyze-product-image', async (req, res) => {
  try {
    const result = await analyzeProductImageWithClaude(req.body?.image_data_url);
    res.json(result);
  } catch (error) {
    res.status(502).json({ message: 'Could not read image, please fill manually.' });
  }
});

router.post('/extract-product-details', async (req, res) => {
  const transcript = cleanInput(req.body?.transcript || req.body?.text || '');
  const language = normalizeLanguage(req.body?.language);
  if (!transcript) {
    return res.status(400).json({ message: 'Transcript is required.' });
  }

  res.json(extractProductDetails(transcript, language));
});

router.post('/extract-shop-location', async (req, res) => {
  const transcript = cleanInput(req.body?.transcript || req.body?.text || '');
  if (!transcript) {
    return res.status(400).json({ message: 'Transcript is required.' });
  }

  if (OPENAI_API_KEY && globalThis.fetch) {
    try {
      const prompt = `Extract shop/business location details from this spoken transcript and return ONLY a JSON object with these exact keys: shop_name, shop_phone, shop_address, city, state, pincode, shop_hours, google_maps_link. Use empty string "" for any field not mentioned. Transcript: ${JSON.stringify(transcript)}`;
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: OPENAI_TEXT_MODEL,
          temperature: 0.1,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: 'You extract structured address data from spoken text. Return only valid JSON.' },
            { role: 'user', content: prompt }
          ]
        })
      });
      const data = await response.json();
      if (response.ok) {
        const content = data.choices?.[0]?.message?.content || '{}';
        const parsed = JSON.parse(content);
        return res.json(await normalizeShopLocationDetails(parsed));
      }
    } catch (aiError) {
      // Fall through to local extraction so the app keeps working without AI credentials.
    }
  }

  const details = await extractShopLocation(transcript);
  res.json(details);
});

router.post('/translate', async (req, res) => {
  const language = normalizeLanguage(req.body?.target_language || req.body?.language);
  const text = cleanInput(req.body?.text);
  res.json({
    text: localizeName(text, language),
    target_language: language,
    fallback: true
  });
});

router.post('/predict-price', async (req, res) => {
  try {
    const body = req.body || {};
    const raw = Number(body.raw_material_cost || body.raw_material || 0);
    const labour = Number(body.labour_cost || body.labor_cost || body.labour || 0);
    const pack = Number(body.packaging_cost || body.packaging || 0);
    const cost = raw + labour + pack;
    const category = body.category || inferCategory(body.product_name || body.name || body.product_input || '');
    const area = body.area || body.city || body.region || body.seller_city || body.shopCity || '';
    const productId = body.product_id || body._id || body.id || null;

    const localStats = await getLocalMarketStats(category, area);
    const demand = await getDemandScore(productId, area);
    const regionMultiplier = await getRegionalMultiplier(area);
    const festival = await getActiveFestival(area, category);
    const localAverage = Number(localStats.local_avg || body.market_price || (cost > 0 ? cost * 1.3 : 120));

    return res.json(calculateFinalPrice({
      raw_material: raw,
      labour,
      packaging: pack,
      local_avg: localAverage,
      demand_score: demand.score,
      demand_level: demand.demand_level,
      region_multiplier: regionMultiplier,
      seasonal_multiplier: festival?.multiplier || 1.0,
      festival: festival?.festival || null,
      region: area || null,
      local_market_available: Boolean(localStats.local_avg),
      demand_available: Boolean(demand.has_data),
      region_available: Boolean(area && regionMultiplier !== 1.0),
      seasonal_available: Boolean(festival)
    }));
  } catch (error) {
    const body = req.body || {};
    const raw = Number(body.raw_material_cost || body.raw_material || 0);
    const labour = Number(body.labour_cost || body.labor_cost || body.labour || 0);
    const pack = Number(body.packaging_cost || body.packaging || 0);
    const cost = raw + labour + pack;

    return res.json(calculateFinalPrice({
      raw_material: raw,
      labour,
      packaging: pack,
      local_avg: Number(body.market_price || (cost > 0 ? cost * 1.3 : 120)),
      demand_score: 0,
      demand_level: 'LOW',
      region_multiplier: 1.0,
      seasonal_multiplier: 1.0,
      festival: null,
      region: body.area || body.city || body.region || null,
      local_market_available: Boolean(body.market_price),
      demand_available: false,
      region_available: false,
      seasonal_available: false
    }));
  }
});

router.post('/recommend', async (req, res) => {
  try {
    const result = await postToAiService('/api/ai/recommend', req.body);
    const recommendations = (result.recommendations || result.items || []).map(normalizeRecommendation);
    res.json({ recommendations });
  } catch (error) {
    res.json({
      recommendations: [
        normalizeRecommendation({
          _id: 'mock-rec-1',
          name: 'Terracotta Diya Set',
          category: 'Handicrafts',
          description: 'Hand-painted festive diyas made by SHG artisans.',
          price: 180,
          rating: 4.7
        }, 0),
        normalizeRecommendation({
          _id: 'mock-rec-2',
          name: 'Organic Millet Laddoo',
          category: 'Homemade Food',
          description: 'Traditional millet sweets prepared in small batches.',
          price: 150,
          rating: 4.6
        }, 1)
      ],
      fallback: true
    });
  }
});

router.get('/training-content', async (req, res) => {
  try {
    const query = new URLSearchParams(req.query).toString();
    const url = new URL(`/api/ai/training-content${query ? `?${query}` : ''}`, AI_SERVICE_URL);
    const client = url.protocol === 'https:' ? https : http;
    const request = client.request(
      {
        method: 'GET',
        hostname: url.hostname,
        port: url.port,
        path: `${url.pathname}${url.search}`,
        timeout: 2500
      },
      (response) => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          body += chunk;
        });
        response.on('end', () => res.json(body ? JSON.parse(body) : { lessons: [] }));
      }
    );
    request.on('timeout', () => request.destroy(new Error('AI service timeout')));
    request.on('error', () => res.json({ lessons: [] }));
    request.end();
  } catch (error) {
    res.json({ lessons: [] });
  }
});

router.post('/demand-prediction', async (req, res) => {
  try {
    res.json(await postToAiService('/api/ai/demand-prediction', req.body));
  } catch (error) {
    res.json({ demand_level: 'Medium', demand_score: 55, fallback: true });
  }
});

router.post('/fraud-check', async (req, res) => {
  try {
    res.json(await postToAiService('/api/ai/fraud-check', req.body));
  } catch (error) {
    res.json({ risk_level: 'Low', flags: [], approved_for_demo: true, fallback: true });
  }
});

router.post('/image-classify', async (req, res) => {
  try {
    res.json(await postToAiService('/api/ai/image/classify', req.body));
  } catch (error) {
    res.json({ category: req.body?.category || inferImageCategory(req.body?.hint || ''), confidence: 0.72, fallback: true });
  }
});

function defaultVoiceText(language) {
  if (language === 'Hindi') return 'हस्तनिर्मित नारियल साबुन';
  if (language === 'Kannada') return 'ಕೈಯಿಂದ ಮಾಡಿದ ತೆಂಗಿನ ಸಾಬೂನು';
  return 'Handmade coconut soap';
}

module.exports = router;

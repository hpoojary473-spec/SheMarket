const imageProfiles = {
  'Skincare Products': ['#f8dcc8', '#7fb069', 'SOAP'],
  Pickles: ['#d95d39', '#f2b84b', 'PICKLE'],
  'Homemade Food': ['#c9832b', '#f7d774', 'FOOD'],
  Handloom: ['#7e3f8f', '#e6a75a', 'WEAVE'],
  Jewellery: ['#3d405b', '#e9c46a', 'JEWEL'],
  'Tailoring Items': ['#5b8e7d', '#f4a261', 'STITCH'],
  'Organic Products': ['#4f772d', '#d8f3a5', 'ORGANIC'],
  'Bamboo Products': ['#8a9a5b', '#e5d4a1', 'BAMBOO'],
  Spices: ['#b85c38', '#f2a65a', 'SPICE'],
  Handicrafts: ['#c15a2b', '#f4a300', 'CRAFT'],
  Textiles: ['#7e3f8f', '#f4a261', 'TEXTILE'],
  Food: ['#c9832b', '#f7d774', 'FOOD']
};

const categoryKeywords = [
  ['Skincare Products', ['soap', 'coconut oil', 'oil', 'cream', 'lotion', 'shampoo', 'candle']],
  ['Pickles', ['pickle', 'achaar', 'mango pickle', 'lemon pickle']],
  ['Handloom', ['saree', 'dupatta', 'shawl', 'stole', 'cloth', 'textile', 'weave', 'handloom']],
  ['Jewellery', ['jewellery', 'jewelry', 'earring', 'necklace', 'bangle', 'bracelet']],
  ['Bamboo Products', ['bamboo', 'basket', 'tray', 'mat']],
  ['Spices', ['spice', 'masala', 'turmeric', 'chilli', 'pepper']],
  ['Homemade Food', ['laddoo', 'laddu', 'papad', 'snack', 'millet', 'sweet', 'food']],
  ['Organic Products', ['organic', 'honey', 'grain', 'seed']],
  ['Tailoring Items', ['stitch', 'tailor', 'embroidery', 'thread']],
  ['Handicrafts', ['craft', 'diya', 'terracotta', 'pottery', 'candle']]
];

function inferImageCategory(productOrCategory, productName = '') {
  const category = typeof productOrCategory === 'object' ? productOrCategory.category : productOrCategory;
  const name = typeof productOrCategory === 'object' ? productOrCategory.name : productName;
  const haystack = `${name || ''} ${category || ''}`.toLowerCase();
  const match = categoryKeywords.find(([, keywords]) => keywords.some((keyword) => haystack.includes(keyword)));
  return match?.[0] || category || 'Handicrafts';
}

function productImageDataUrl(category = 'Handicrafts', name = 'SheMarket Product') {
  const inferred = inferImageCategory(category, name);
  const [a, b, label] = imageProfiles[inferred] || imageProfiles.Handicrafts;
  const safeName = sanitize(name).slice(0, 34);
  const safeCategory = sanitize(inferred);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="480" viewBox="0 0 720 480"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient><pattern id="p" width="42" height="42" patternUnits="userSpaceOnUse"><path d="M0 21h42M21 0v42" stroke="rgba(255,255,255,.18)" stroke-width="1"/></pattern></defs><rect width="720" height="480" rx="30" fill="url(#g)"/><rect width="720" height="480" fill="url(#p)" opacity=".55"/><circle cx="585" cy="92" r="88" fill="rgba(255,255,255,.24)"/><circle cx="106" cy="392" r="120" fill="rgba(255,255,255,.16)"/><rect x="76" y="72" width="568" height="334" rx="30" fill="rgba(255,255,255,.86)"/><circle cx="360" cy="164" r="58" fill="rgba(244,163,0,.25)" stroke="#3b1f0c" stroke-width="10"/><text x="360" y="177" text-anchor="middle" font-family="Arial,sans-serif" font-size="25" font-weight="800" fill="#3b1f0c">${label}</text><text x="360" y="260" text-anchor="middle" font-family="Arial,sans-serif" font-size="34" font-weight="800" fill="#3b1f0c">${safeName}</text><text x="360" y="306" text-anchor="middle" font-family="Arial,sans-serif" font-size="23" font-weight="700" fill="#8b4a24">${safeCategory}</text><text x="360" y="348" text-anchor="middle" font-family="Arial,sans-serif" font-size="18" fill="#5f7f3a">Women-led SHG Product</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function ensureProductImage(product) {
  if (!product) return product;
  if (product.image_url) return product.image_url;
  return productImageDataUrl(product.category, product.name);
}

function sanitize(value) {
  return String(value || '')
    .replace(/[<>&"']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = {
  ensureProductImage,
  inferImageCategory,
  productImageDataUrl
};

const supportedProductLanguages = ['en', 'hi', 'kn'];

const languageNames = {
  en: 'English',
  hi: 'Hindi',
  kn: 'Kannada'
};

const categoryTranslations = {
  Handicrafts: {
    en: 'Handicrafts',
    hi: '\u0939\u0938\u094d\u0924\u0936\u093f\u0932\u094d\u092a',
    kn: '\u0c95\u0cb0\u0c95\u0cc1\u0cb6\u0cb2'
  },
  Pickles: {
    en: 'Pickles',
    hi: '\u0905\u091a\u093e\u0930',
    kn: '\u0c89\u0caa\u0ccd\u0caa\u0cbf\u0ca8\u0c95\u0cbe\u0caf\u0cbf'
  },
  'Homemade Food': {
    en: 'Homemade Food',
    hi: '\u0918\u0930 \u0915\u093e \u092c\u0928\u093e \u092d\u094b\u091c\u0928',
    kn: '\u0cae\u0ca8\u0cc6\u0caf \u0c86\u0cb9\u0cbe\u0cb0'
  },
  Handloom: {
    en: 'Handloom',
    hi: '\u0939\u0925\u0915\u0930\u0918\u093e',
    kn: '\u0c95\u0cc8\u0cae\u0c97\u0ccd\u0c97'
  },
  Jewellery: {
    en: 'Jewellery',
    hi: '\u0906\u092d\u0942\u0937\u0923',
    kn: '\u0c86\u0cad\u0cb0\u0ca3'
  },
  'Tailoring Items': {
    en: 'Tailoring Items',
    hi: '\u0938\u093f\u0932\u093e\u0908 \u0938\u093e\u092e\u0917\u094d\u0930\u0940',
    kn: '\u0cb9\u0cca\u0cb2\u0cbf\u0c97\u0cc6 \u0cb5\u0cb8\u0ccd\u0ca4\u0cc1\u0c97\u0cb3\u0cc1'
  },
  'Organic Products': {
    en: 'Organic Products',
    hi: '\u091c\u0948\u0935\u093f\u0915 \u0909\u0924\u094d\u092a\u093e\u0926',
    kn: '\u0cb8\u0cbe\u0cb5\u0caf\u0cb5 \u0c89\u0ca4\u0ccd\u0caa\u0ca8\u0ccd\u0ca8\u0c97\u0cb3\u0cc1'
  },
  'Bamboo Products': {
    en: 'Bamboo Products',
    hi: '\u092c\u093e\u0902\u0938 \u0909\u0924\u094d\u092a\u093e\u0926',
    kn: '\u0cac\u0cbf\u0ca6\u0cbf\u0cb0\u0cc1 \u0c89\u0ca4\u0ccd\u0caa\u0ca8\u0ccd\u0ca8\u0c97\u0cb3\u0cc1'
  },
  Spices: {
    en: 'Spices',
    hi: '\u092e\u0938\u093e\u0932\u0947',
    kn: '\u0cae\u0cb8\u0cbe\u0cb2\u0cc6\u0c97\u0cb3\u0cc1'
  },
  'Skincare Products': {
    en: 'Skincare Products',
    hi: '\u0924\u094d\u0935\u091a\u093e \u0926\u0947\u0916\u092d\u093e\u0932',
    kn: '\u0c9a\u0cb0\u0ccd\u0cae\u0ca6 \u0c86\u0cb0\u0cc8\u0c95\u0cc6'
  },
  Skincare: {
    en: 'Skincare Products',
    hi: '\u0924\u094d\u0935\u091a\u093e \u0926\u0947\u0916\u092d\u093e\u0932',
    kn: '\u0c9a\u0cb0\u0ccd\u0cae\u0ca6 \u0c86\u0cb0\u0cc8\u0c95\u0cc6'
  }
};

const knownProductTranslations = [
  {
    keys: ['coconut soap', '\u0ca4\u0cc6\u0c82\u0c97\u0cbf\u0ca8 \u0cb8\u0cbe\u0cac\u0cc2\u0ca8\u0cc1', '\u0928\u093e\u0930\u093f\u092f\u0932 \u0938\u093e\u092c\u0941\u0928'],
    name: {
      en: 'Handmade Coconut Soap',
      hi: '\u0939\u0938\u094d\u0924\u0928\u093f\u0930\u094d\u092e\u093f\u0924 \u0928\u093e\u0930\u093f\u092f\u0932 \u0938\u093e\u092c\u0941\u0928',
      kn: '\u0c95\u0cc8\u0caf\u0cbf\u0c82\u0ca6 \u0cae\u0cbe\u0ca1\u0cbf\u0ca6 \u0ca4\u0cc6\u0c82\u0c97\u0cbf\u0ca8 \u0cb8\u0cbe\u0cac\u0cc2\u0ca8\u0cc1'
    },
    tags: {
      en: ['organic', 'handmade', 'soap'],
      hi: ['\u0911\u0930\u094d\u0917\u0947\u0928\u093f\u0915', '\u0939\u0938\u094d\u0924\u0928\u093f\u0930\u094d\u092e\u093f\u0924', '\u0938\u093e\u092c\u0941\u0928'],
      kn: ['\u0cb8\u0cbe\u0cb5\u0caf\u0cb5', '\u0c95\u0cc8\u0caf\u0cbf\u0c82\u0ca6 \u0cae\u0cbe\u0ca1\u0cbf\u0ca6', '\u0cb8\u0cbe\u0cac\u0cc2\u0ca8\u0cc1']
    }
  }
];

const productNouns = {
  en: 'Product',
  hi: '\u0909\u0924\u094d\u092a\u093e\u0926',
  kn: '\u0c89\u0ca4\u0ccd\u0caa\u0ca8\u0ccd\u0ca8'
};

const genericTags = {
  en: ['handmade', 'women-led', 'local'],
  hi: ['\u0939\u0938\u094d\u0924\u0928\u093f\u0930\u094d\u092e\u093f\u0924', '\u092e\u0939\u093f\u0932\u093e \u0928\u0947\u0924\u0943\u0924\u094d\u0935', '\u0938\u094d\u0925\u093e\u0928\u0940\u092f'],
  kn: ['\u0c95\u0cc8\u0caf\u0cbf\u0c82\u0ca6 \u0cae\u0cbe\u0ca1\u0cbf\u0ca6', '\u0cae\u0cb9\u0cbf\u0cb3\u0cc6\u0caf\u0cb0 \u0ca8\u0cc7\u0ca4\u0cc3\u0ca4\u0ccd\u0cb5', '\u0cb8\u0ccd\u0ca5\u0cb3\u0cc0\u0caf']
};

const termTranslations = [
  {
    en: 'handmade',
    hi: '\u0939\u0938\u094d\u0924\u0928\u093f\u0930\u094d\u092e\u093f\u0924',
    kn: '\u0c95\u0cc8\u0caf\u0cbf\u0c82\u0ca6 \u0cae\u0cbe\u0ca1\u0cbf\u0ca6',
    aliases: ['hand made', 'handmade', '\u0939\u0938\u094d\u0924\u0928\u093f\u0930\u094d\u092e\u093f\u0924', '\u0c95\u0cc8\u0caf\u0cbf\u0c82\u0ca6 \u0cae\u0cbe\u0ca1\u0cbf\u0ca6']
  },
  {
    en: 'coconut',
    hi: '\u0928\u093e\u0930\u093f\u092f\u0932',
    kn: '\u0ca4\u0cc6\u0c82\u0c97\u0cbf\u0ca8',
    aliases: ['coconut', 'coconut oil', '\u0928\u093e\u0930\u093f\u092f\u0932', '\u0928\u093e\u0930\u093f\u092f\u0932 \u0924\u0947\u0932', '\u0ca4\u0cc6\u0c82\u0c97\u0cbf\u0ca8', '\u0ca4\u0cc6\u0c82\u0c97\u0cbf\u0ca8 \u0c8e\u0ca3\u0ccd\u0ca3\u0cc6']
  },
  {
    en: 'soap',
    hi: '\u0938\u093e\u092c\u0941\u0928',
    kn: '\u0cb8\u0cbe\u0cac\u0cc2\u0ca8\u0cc1',
    aliases: ['soap', 'soaps', '\u0938\u093e\u092c\u0941\u0928', '\u0cb8\u0cbe\u0cac\u0cc2\u0ca8\u0cc1']
  },
  {
    en: 'pickle',
    hi: '\u0905\u091a\u093e\u0930',
    kn: '\u0c89\u0caa\u0ccd\u0caa\u0cbf\u0ca8\u0c95\u0cbe\u0caf\u0cbf',
    aliases: ['pickle', 'pickles', 'achaar', '\u0905\u091a\u093e\u0930', '\u0c89\u0caa\u0ccd\u0caa\u0cbf\u0ca8\u0c95\u0cbe\u0caf\u0cbf']
  },
  {
    en: 'mango',
    hi: '\u0906\u092e',
    kn: '\u0cae\u0cbe\u0cb5\u0cbf\u0ca8',
    aliases: ['mango', '\u0906\u092e', '\u0cae\u0cbe\u0cb5\u0cbf\u0ca8']
  },
  {
    en: 'natural',
    hi: '\u092a\u094d\u0930\u093e\u0915\u0943\u0924\u093f\u0915',
    kn: '\u0cb8\u0ccd\u0cb5\u0cbe\u0cad\u0cbe\u0cb5\u0cbf\u0c95',
    aliases: ['natural', '\u092a\u094d\u0930\u093e\u0915\u0943\u0924\u093f\u0915', '\u0cb8\u0ccd\u0cb5\u0cbe\u0cad\u0cbe\u0cb5\u0cbf\u0c95']
  },
  {
    en: 'organic',
    hi: '\u0911\u0930\u094d\u0917\u0947\u0928\u093f\u0915',
    kn: '\u0cb8\u0cbe\u0cb5\u0caf\u0cb5',
    aliases: ['organic', '\u0911\u0930\u094d\u0917\u0947\u0928\u093f\u0915', '\u091c\u0948\u0935\u093f\u0915', '\u0cb8\u0cbe\u0cb5\u0caf\u0cb5']
  },
  {
    en: 'skincare',
    hi: '\u0924\u094d\u0935\u091a\u093e \u0926\u0947\u0916\u092d\u093e\u0932',
    kn: '\u0c9a\u0cb0\u0ccd\u0cae \u0c86\u0cb0\u0cc8\u0c95\u0cc6',
    aliases: ['skincare', 'skin care', '\u0924\u094d\u0935\u091a\u093e \u0926\u0947\u0916\u092d\u093e\u0932', '\u0c9a\u0cb0\u0ccd\u0cae \u0c86\u0cb0\u0cc8\u0c95\u0cc6']
  },
  {
    en: 'jewellery',
    hi: '\u0906\u092d\u0942\u0937\u0923',
    kn: '\u0c86\u0cad\u0cb0\u0ca3',
    aliases: ['jewellery', 'jewelry', '\u0906\u092d\u0942\u0937\u0923', '\u0c86\u0cad\u0cb0\u0ca3']
  },
  {
    en: 'bag',
    hi: '\u092c\u0948\u0917',
    kn: '\u0c9a\u0cc0\u0cb2',
    aliases: ['bag', 'bags', '\u092c\u0948\u0917', '\u0c9a\u0cc0\u0cb2']
  },
  {
    en: 'bamboo',
    hi: '\u092c\u093e\u0902\u0938',
    kn: '\u0cac\u0cbf\u0ca6\u0cbf\u0cb0\u0cc1',
    aliases: ['bamboo', '\u092c\u093e\u0902\u0938', '\u0cac\u0cbf\u0ca6\u0cbf\u0cb0\u0cc1']
  },
  {
    en: 'basket',
    hi: '\u091f\u094b\u0915\u0930\u0940',
    kn: '\u0c9f\u0cca\u0c95\u0cb0\u0cbf',
    aliases: ['basket', 'baskets', '\u091f\u094b\u0915\u0930\u0940', '\u0c9f\u0cca\u0c95\u0cb0\u0cbf']
  },
  {
    en: 'spice',
    hi: '\u092e\u0938\u093e\u0932\u093e',
    kn: '\u0cae\u0cb8\u0cbe\u0cb2\u0cc6',
    aliases: ['spice', 'spices', 'masala', '\u092e\u0938\u093e\u0932\u093e', '\u092e\u0938\u093e\u0932\u0947', '\u0cae\u0cb8\u0cbe\u0cb2\u0cc6']
  },
  {
    en: 'millet',
    hi: '\u092c\u093e\u091c\u0930\u093e',
    kn: '\u0cb8\u0cbf\u0cb0\u0cbf\u0ca7\u0cbe\u0ca8\u0ccd\u0caf',
    aliases: ['millet', 'millets', '\u092c\u093e\u091c\u0930\u093e', '\u0cb8\u0cbf\u0cb0\u0cbf\u0ca7\u0cbe\u0ca8\u0ccd\u0caf']
  },
  {
    en: 'laddoo',
    hi: '\u0932\u0921\u094d\u0921\u0942',
    kn: '\u0cb2\u0ca1\u0ccd\u0ca1\u0cc1',
    aliases: ['laddoo', 'laddu', '\u0932\u0921\u094d\u0921\u0942', '\u0cb2\u0ca1\u0ccd\u0ca1\u0cc1']
  },
  {
    en: 'dupatta',
    hi: '\u0926\u0941\u092a\u091f\u094d\u091f\u093e',
    kn: '\u0ca6\u0cc1\u0caa\u0c9f\u0ccd\u0c9f\u0cbe',
    aliases: ['dupatta', '\u0926\u0941\u092a\u091f\u094d\u091f\u093e', '\u0ca6\u0cc1\u0caa\u0c9f\u0ccd\u0c9f\u0cbe']
  },
  {
    en: 'saree',
    hi: '\u0938\u093e\u0921\u093c\u0940',
    kn: '\u0cb8\u0cc0\u0cb0\u0cc6',
    aliases: ['saree', 'sari', '\u0938\u093e\u0921\u093c\u0940', '\u0cb8\u0cc0\u0cb0\u0cc6']
  }
];

function normalizeLanguageCode(language) {
  const value = String(language || '').trim().toLowerCase();
  if (value === 'hi' || value === 'hindi') return 'hi';
  if (value === 'kn' || value === 'kannada') return 'kn';
  return 'en';
}

function categoryI18n(category) {
  const normalized = normalizeCategory(category);
  return categoryTranslations[normalized] || {
    en: normalized,
    hi: normalized,
    kn: normalized
  };
}

function normalizeCategory(category) {
  const value = String(category || '').trim();
  const lower = value.toLowerCase();
  const exact = Object.keys(categoryTranslations).find((key) => key.toLowerCase() === lower);
  if (exact === 'Skincare') return 'Skincare Products';
  return exact || value || 'Handicrafts';
}

function fallbackProductI18n({ name, description, category, tags, sourceLanguage }) {
  const cleanTags = normalizeTags(tags);
  const source = `${name || ''} ${description || ''} ${cleanTags.join(' ')}`.toLowerCase();
  const known = knownProductTranslations.find((entry) => entry.keys.some((key) => source.includes(key.toLowerCase())));
  const cleanName = String(name || 'Handmade Product').trim();
  const cleanDescription = String(description || '').trim();
  const cat = categoryI18n(category);
  const sourceCode = normalizeLanguageCode(sourceLanguage || detectLanguageCode(source));

  const nameI18n = known?.name || supportedProductLanguages.reduce((result, code) => {
    result[code] = productNameForLanguage(cleanName, cat, code, sourceCode);
    return result;
  }, {});

  const descriptionI18n = supportedProductLanguages.reduce((result, code) => {
    if (code === sourceCode && cleanDescription && !hasWrongScript(cleanDescription, code)) {
      result[code] = cleanDescription;
    } else {
      result[code] = defaultDescription(nameI18n[code], cat[code], code);
    }
    return result;
  }, {});

  const tagsI18n = known?.tags || supportedProductLanguages.reduce((result, code) => {
    const localizedTags = cleanTags
      .map((tag) => localizedShortText(tag, code, sourceCode))
      .filter(Boolean);
    result[code] = uniqueList(localizedTags.length ? localizedTags : [cat[code], ...genericTags[code]]);
    return result;
  }, {});

  return {
    name_i18n: nameI18n,
    category_i18n: cat,
    description_i18n: descriptionI18n,
    tags_i18n: tagsI18n
  };
}

function productNameForLanguage(name, categoryMap, targetCode, sourceCode) {
  const translated = localizedShortText(name, targetCode, sourceCode);
  if (translated && !hasWrongScript(translated, targetCode)) return titleLike(translated, targetCode);
  return `${categoryMap[targetCode] || categoryMap.en || 'Handmade'} ${productNouns[targetCode]}`;
}

function localizedShortText(value, targetCode, sourceCode) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (targetCode === sourceCode && !hasWrongScript(text, targetCode)) return text;

  let translated = text;
  termTranslations
    .slice()
    .sort((a, b) => longestAlias(b) - longestAlias(a))
    .forEach((entry) => {
      entry.aliases.slice().sort((a, b) => b.length - a.length).forEach((alias) => {
        translated = replaceAllLoose(translated, alias, entry[targetCode]);
      });
    });

  translated = cleanSpacing(translated);
  if (targetCode === 'en') {
    translated = translated.replace(/\bProducts?\b/gi, 'Product');
  }
  return hasWrongScript(translated, targetCode) ? '' : translated;
}

function replaceAllLoose(source, alias, replacement) {
  if (!alias || !replacement) return source;
  const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const latinOnly = /^[a-z0-9\s-]+$/i.test(alias);
  const pattern = latinOnly
    ? new RegExp(`\\b${escaped}\\b`, 'gi')
    : new RegExp(escaped, 'g');
  return source.replace(pattern, replacement);
}

function longestAlias(entry) {
  return Math.max(...entry.aliases.map((alias) => alias.length));
}

function detectLanguageCode(value) {
  const text = String(value || '');
  if (/[\u0C80-\u0CFF]/.test(text)) return 'kn';
  if (/[\u0900-\u097F]/.test(text)) return 'hi';
  return 'en';
}

function hasWrongScript(value, targetCode) {
  const text = String(value || '');
  if (targetCode === 'en') return /[\u0900-\u097F\u0C80-\u0CFF]/.test(text);
  if (targetCode === 'hi') return /[\u0C80-\u0CFF]/.test(text);
  if (targetCode === 'kn') return /[\u0900-\u097F]/.test(text);
  return false;
}

function titleLike(value, targetCode) {
  const text = cleanSpacing(value);
  if (targetCode !== 'en') return text;
  return text
    .split(' ')
    .map((word) => word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : word)
    .join(' ');
}

function cleanSpacing(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.])/g, '$1')
    .trim();
}

function uniqueList(values) {
  return [...new Set(values.map((value) => cleanSpacing(value)).filter(Boolean))];
}

function normalizeTags(tags) {
  if (Array.isArray(tags)) return tags.map((tag) => String(tag || '').trim()).filter(Boolean);
  if (typeof tags === 'string') {
    return tags.split(',').map((tag) => tag.trim()).filter(Boolean);
  }
  return [];
}

function defaultDescription(name, category, code) {
  if (code === 'hi') {
    return `${name} ${category} \u0936\u094d\u0930\u0947\u0923\u0940 \u0915\u093e \u090f\u0915 \u0917\u0941\u0923\u0935\u0924\u094d\u0924\u093e\u092a\u0942\u0930\u094d\u0923 \u0939\u0938\u094d\u0924\u0928\u093f\u0930\u094d\u092e\u093f\u0924 \u0909\u0924\u094d\u092a\u093e\u0926 \u0939\u0948\u0964`;
  }
  if (code === 'kn') {
    return `${name} ${category} \u0cb5\u0cb0\u0ccd\u0c97\u0ca6 \u0c97\u0cc1\u0ca3\u0cae\u0c9f\u0ccd\u0c9f\u0ca6 \u0c95\u0cc8\u0caf\u0cbf\u0c82\u0ca6 \u0cae\u0cbe\u0ca1\u0cbf\u0ca6 \u0c89\u0ca4\u0ccd\u0caa\u0ca8\u0ccd\u0ca8\u0cb5\u0cbe\u0c97\u0cbf\u0ca6\u0cc6.`;
  }
  return `${name} is a quality handmade ${category} product from a women-led producer.`;
}

module.exports = {
  categoryI18n,
  fallbackProductI18n,
  languageNames,
  normalizeCategory,
  normalizeLanguageCode,
  supportedProductLanguages
};

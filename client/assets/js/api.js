const SheMarket = (() => {
  const API_BASE = '';
  const tokenKey = 'shemarket_token';
  const userKey = 'shemarket_user';
  const cartKey = 'shemarket_cart';
  const languageKey = 'shemarket_language';

  const supportedLanguages = ['English', 'Hindi', 'Kannada'];
  const languageCodes = { English: 'en', Hindi: 'hi', Kannada: 'kn' };
  const languageLabels = { English: 'English', Hindi: 'हिंदी', Kannada: 'ಕನ್ನಡ' };
  const localeCodes = { English: 'en-IN', Hindi: 'hi-IN', Kannada: 'kn-IN' };

  const fallbackDictionary = {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    ui: {
      home: 'Home',
      login: 'Login',
      logout: 'Logout',
      marketplace: 'Marketplace',
      language: 'Language',
      welcomeBack: 'Welcome back',
      createAccount: 'Create account',
      name: 'Name',
      email: 'Email',
      password: 'Password',
      role: 'Role',
      register: 'Register',
      cart: 'Cart',
      addProduct: 'Add Product',
      profile: 'Profile',
      analytics: 'Analytics',
      dashboard: 'Dashboard',
      products: 'Products',
      orders: 'Orders',
      search: 'Search',
      startSelling: 'Start Selling',
      shopProducts: 'Shop Products',
      view: 'View',
      add: 'Add',
      addToCart: 'Add to Cart',
      reviews: 'Reviews',
      seller: 'Seller',
      buyer: 'Buyer',
      admin: 'Admin',
      rating: 'Rating',
      views: 'Views',
      total: 'Total',
      amount: 'Amount',
      status: 'Status',
      date: 'Date',
      quantity: 'Quantity',
      saveProduct: 'Save Product',
      generateDescription: 'Generate Description',
      suggest: 'Suggest',
      retry: 'Retry',
      payWithRazorpay: 'Pay with Razorpay',
      waitingForPayment: 'Waiting for payment',
      paymentSuccessful: 'Payment successful',
      orderConfirmed: 'Order confirmed',
      transactionId: 'Transaction ID',
      upiId: 'UPI ID',
      timeLeft: 'Time left',
      buyerPortal: 'Buyer Portal',
      sellerPortal: 'Seller Portal',
      adminPortal: 'SHG/Admin Portal',
      sellerPortalTitle: 'Seller business workspace',
      sellerPortalBody: 'Manage listings, pricing, orders, and revenue insights from one focused dashboard.',
      buyerPortalTitle: 'Buyer marketplace',
      buyerPortalBody: 'Browse SHG products, review your cart, pay securely, and track orders.',
      adminPortalTitle: 'SHG monitoring workspace',
      adminPortalBody: 'Approve sellers, monitor groups, and review category and order health.'
    },
    phrases: {},
    categories: {},
    productWords: {},
    productNames: {},
    productDescriptions: {}
  };

  const dictionaries = { English: fallbackDictionary };
  const dictionaryPromises = {};
  let translationObserver = null;
  let translationFrame = 0;

  migrateLegacyAuth();

  function normalizeLanguage(language) {
    const value = String(language || '').trim();
    const lower = value.toLowerCase();
    if (lower === 'hi' || lower === 'hindi' || value === 'हिंदी') return 'Hindi';
    if (lower === 'kn' || lower === 'kannada' || value === 'ಕನ್ನಡ') return 'Kannada';
    return 'English';
  }

  function getLanguage() {
    const stored = normalizeLanguage(localStorage.getItem(languageKey));
    localStorage.setItem(languageKey, stored);
    return stored;
  }

  function getLanguageCode(language = getLanguage()) {
    return languageCodes[normalizeLanguage(language)] || 'en';
  }

  function getLocale(language = getLanguage()) {
    return localeCodes[normalizeLanguage(language)] || 'en-IN';
  }

  function getDictionary(language = getLanguage()) {
    return dictionaries[normalizeLanguage(language)] || fallbackDictionary;
  }

  async function ensureDictionary(language = getLanguage()) {
    const normalized = normalizeLanguage(language);
    if (dictionaries[normalized]) return dictionaries[normalized];
    if (dictionaryPromises[normalized]) return dictionaryPromises[normalized];

    const code = getLanguageCode(normalized);
    dictionaryPromises[normalized] = fetch(`/assets/i18n/${code}.json`, { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error(`Missing translation file: ${code}`);
        return response.json();
      })
      .then((dictionary) => {
        dictionaries[normalized] = dictionary;
        return dictionary;
      })
      .catch(() => fallbackDictionary);

    return dictionaryPromises[normalized];
  }

  function t(key, fallback = '') {
    const dict = getDictionary();
    return dict.ui?.[key] || fallbackDictionary.ui?.[key] || fallback || key;
  }

  function translatePhrase(value, language = getLanguage()) {
    const text = String(value ?? '');
    const trimmed = text.trim();
    if (!trimmed || normalizeLanguage(language) === 'English') return text;

    const dict = getDictionary(language);
    const titledPage = trimmed.match(/^(.+)\s\|\sSheMarket$/);
    if (titledPage) {
      const translatedTitle = translatePhrase(titledPage[1], language);
      if (translatedTitle !== titledPage[1]) {
        return text.replace(trimmed, `${translatedTitle} | SheMarket`);
      }
    }

    const leadingPunctuation = trimmed.match(/^([.:-]\s+)(.+)$/);
    if (leadingPunctuation) {
      const translatedBody = translatePhrase(leadingPunctuation[2], language);
      if (translatedBody !== leadingPunctuation[2]) {
        return text.replace(trimmed, `${leadingPunctuation[1]}${translatedBody}`);
      }
    }

    const uiKey = Object.entries(fallbackDictionary.ui).find(([, fallbackValue]) => fallbackValue === trimmed)?.[0];
    const translated = dict.phrases?.[trimmed] || dict.categories?.[trimmed] || dict.ui?.[trimmed] || (uiKey ? dict.ui?.[uiKey] : '');
    if (!translated) return text;

    const leading = text.match(/^\s*/)?.[0] || '';
    const trailing = text.match(/\s*$/)?.[0] || '';
    return `${leading}${translated}${trailing}`;
  }

  function setLanguage(language) {
    const normalized = normalizeLanguage(language);
    localStorage.setItem(languageKey, normalized);
    document.documentElement.lang = getLanguageCode(normalized);
    syncLanguageSelects();

    return ensureDictionary(normalized).then(() => {
      applyTranslations(document.body);
      window.dispatchEvent(new CustomEvent('shemarket:languagechange', { detail: { language: normalized } }));
    });
  }

  function languageOptions(selected = getLanguage()) {
    const normalized = normalizeLanguage(selected);
    return supportedLanguages.map((language) => (
      `<option value="${escapeHtml(language)}" ${language === normalized ? 'selected' : ''}>${escapeHtml(languageLabels[language])}</option>`
    )).join('');
  }

  function syncLanguageSelects() {
    document.querySelectorAll('[data-language-select]').forEach((select) => {
      const current = getLanguage();
      const previous = select.value;
      select.innerHTML = languageOptions(current);
      select.value = previous && supportedLanguages.includes(previous) ? normalizeLanguage(previous) : current;
      if (select.value !== current) select.value = current;
    });
  }

  function initLanguageControls() {
    document.querySelectorAll('.topbar .nav-links').forEach((nav) => {
      if (!nav.querySelector('[data-language-select]')) {
        nav.insertAdjacentHTML('beforeend', '<select class="language-select" data-language-select aria-label="Language"></select>');
      }
    });

    syncLanguageSelects();

    document.querySelectorAll('[data-language-select]').forEach((select) => {
      if (select.dataset.languageBound === 'true') return;
      select.dataset.languageBound = 'true';
      select.addEventListener('change', () => {
        setLanguage(select.value);
      });
    });

    ensureDictionary(getLanguage()).then(() => {
      applyTranslations(document.body);
      startTranslationObserver();
    });
  }

  function startTranslationObserver() {
    if (translationObserver || !document.body) return;
    translationObserver = new MutationObserver((mutations) => {
      if (!mutations.some((mutation) => mutation.addedNodes.length || mutation.type === 'attributes')) return;
      window.cancelAnimationFrame(translationFrame);
      translationFrame = window.requestAnimationFrame(() => applyTranslations(document.body));
    });
    translationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['placeholder', 'title', 'aria-label']
    });
  }

  function applyTranslations(root = document.body) {
    if (!root) return;
    const language = getLanguage();
    const dict = getDictionary(language);
    document.documentElement.lang = getLanguageCode(language);

    root.querySelectorAll('[data-i18n]').forEach((node) => {
      const key = node.dataset.i18n;
      node.textContent = dict.ui?.[key] || fallbackDictionary.ui?.[key] || node.textContent;
    });

    translateAttributes(root, 'placeholder');
    translateAttributes(root, 'title');
    translateAttributes(root, 'aria-label');
    translateOptions(root);
    translateTextNodes(root);
  }

  function translateAttributes(root, attribute) {
    root.querySelectorAll(`[${attribute}]`).forEach((node) => {
      const memoryKey = `i18nOriginal${attribute.replace(/(^|-)([a-z])/g, (_, __, chr) => chr.toUpperCase())}`;
      if (!node.dataset[memoryKey]) node.dataset[memoryKey] = node.getAttribute(attribute) || '';
      const nextValue = translatePhrase(node.dataset[memoryKey]);
      if (node.getAttribute(attribute) !== nextValue) node.setAttribute(attribute, nextValue);
    });
  }

  function translateOptions(root) {
    root.querySelectorAll('option').forEach((option) => {
      if (!option.dataset.i18nOriginalText) option.dataset.i18nOriginalText = option.textContent.trim();
      const nextText = translatePhrase(option.dataset.i18nOriginalText);
      if (option.textContent !== nextText) option.textContent = nextText;
    });
  }

  function translateTextNodes(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || ['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'OPTION', 'SELECT', 'CANVAS'].includes(parent.tagName)) {
          return NodeFilter.FILTER_REJECT;
        }
        if (parent.closest('[data-no-i18n]')) return NodeFilter.FILTER_REJECT;
        const text = node.textContent.trim();
        return text ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      }
    });

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      if (!node.__shemarketOriginalText) node.__shemarketOriginalText = node.textContent;
      node.textContent = translatePhrase(node.__shemarketOriginalText);
    });
  }

  function translateStaticText(root, language = getLanguage()) {
    ensureDictionary(language).then(() => applyTranslations(root || document.body));
  }

  function getToken() {
    return sessionStorage.getItem(tokenKey);
  }

  function getUser() {
    const raw = sessionStorage.getItem(userKey);
    try {
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      sessionStorage.removeItem(userKey);
      return null;
    }
  }

  function setAuth(token, user) {
    const preferredLanguage = normalizeLanguage(localStorage.getItem(languageKey) || user?.language || 'English');
    const normalizedUser = { ...user, language: preferredLanguage };
    sessionStorage.setItem(tokenKey, token);
    sessionStorage.setItem(userKey, JSON.stringify(normalizedUser));
    localStorage.removeItem(tokenKey);
    localStorage.removeItem(userKey);
    localStorage.setItem(languageKey, preferredLanguage);
  }

  function logout() {
    sessionStorage.removeItem(tokenKey);
    sessionStorage.removeItem(userKey);
    localStorage.removeItem(tokenKey);
    localStorage.removeItem(userKey);
    location.href = '/pages/login.html';
  }

  function migrateLegacyAuth() {
    if (sessionStorage.getItem(tokenKey) || !localStorage.getItem(tokenKey)) return;
    sessionStorage.setItem(tokenKey, localStorage.getItem(tokenKey));
    const legacyUser = localStorage.getItem(userKey);
    if (legacyUser) sessionStorage.setItem(userKey, legacyUser);
    localStorage.removeItem(tokenKey);
    localStorage.removeItem(userKey);
  }

  async function request(path, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    if (options.auth !== false && getToken()) {
      headers.Authorization = `Bearer ${getToken()}`;
    }

    const response = await fetch(`${API_BASE}${path}`, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    const isJson = response.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      throw new Error(data.message || data.error || translatePhrase('Request failed.'));
    }

    return data;
  }

  function requireAuth(roles = []) {
    const user = getUser();
    if (!getToken() || !user) {
      location.href = `/pages/login.html?next=${encodeURIComponent(location.pathname + location.search)}`;
      return null;
    }

    if (roles.length && !roles.includes(user.role)) {
      toast('This page is not available for your role.', 'error');
      location.href = '/index.html';
      return null;
    }

    return user;
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat(getLocale(), {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(Number(value) || 0);
  }

  function getCart() {
    return JSON.parse(localStorage.getItem(cartKey) || '[]');
  }

  function setCart(cart) {
    localStorage.setItem(cartKey, JSON.stringify(cart));
    updateCartCount();
  }

  function addToCart(product, quantity = 1) {
    if (getUser()?.role === 'seller') {
      toast('Sellers cannot make purchases.', 'error');
      return;
    }
    const cart = getCart();
    const existing = cart.find((item) => item._id === product._id);

    if (existing) {
      existing.quantity += quantity;
    } else {
      cart.push({
        _id: product._id,
        name: product.name,
        name_i18n: product.name_i18n,
        category: product.category,
        category_i18n: product.category_i18n,
        description: product.description,
        description_i18n: product.description_i18n,
        tags: product.tags,
        tags_i18n: product.tags_i18n,
        price: product.price,
        image_url: product.image_url || '',
        seller_id: product.seller_id,
        quantity
      });
    }

    setCart(cart);
    toast('Added to cart.', 'success');
  }

  function updateCartCount() {
    const count = getCart().reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    document.querySelectorAll('[data-cart-count]').forEach((node) => {
      node.textContent = count;
    });
  }

  function toast(message, type = 'info') {
    let stack = document.querySelector('.toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'toast-stack';
      document.body.appendChild(stack);
    }

    const node = document.createElement('div');
    node.className = `toast ${type}`;
    node.textContent = translatePhrase(message);
    stack.appendChild(node);

    setTimeout(() => {
      node.classList.add('is-leaving');
      setTimeout(() => node.remove(), 220);
    }, 3400);
  }

  function localizeCategory(category, language = getLanguage()) {
    if (!category || normalizeLanguage(language) === 'English') return category;
    const dict = getDictionary(language);
    return dict.categories?.[category] || localizeProductText(category, language);
  }

  function localizeProductText(value, language = getLanguage()) {
    if (!value || normalizeLanguage(language) === 'English') return value;
    const dict = getDictionary(language);
    const exact = dict.productNames?.[value] || dict.productDescriptions?.[value] || dict.categories?.[value] || dict.phrases?.[value];
    if (exact) return exact;

    let text = String(value);
    const words = dict.productWords || {};
    const entries = Object.entries(words).sort((a, b) => b[0].length - a[0].length);
    entries.forEach(([english, translated]) => {
      const pattern = new RegExp(`\\b${escapeRegExp(english)}\\b`, 'gi');
      text = text.replace(pattern, translated);
    });
    return text;
  }

  function productTextFallback(product, field, language = getLanguage()) {
    const normalized = normalizeLanguage(language);
    const code = getLanguageCode(normalized);
    const i18n = product?.[`${field}_i18n`] || {};
    const base = product?.[field] || '';
    const candidate = i18n[code];
    const english = i18n.en;

    if (candidate && !hasWrongProductScript(candidate, code)) {
      if (normalized !== 'English' && isMostlyLatin(candidate)) {
        const translated = localizeProductText(candidate, normalized);
        return translated && translated !== candidate && !hasWrongProductScript(translated, code) && !isMostlyLatin(translated)
          ? translated
          : genericProductField(product, field, normalized);
      }
      return candidate;
    }

    const source = english || base;
    if (normalized === 'English') {
      return source && !hasWrongProductScript(source, 'en') ? source : genericProductField(product, field, normalized);
    }

    const translated = localizeProductText(source, normalized);
    if (translated && !hasWrongProductScript(translated, code) && translated !== source && !isMostlyLatin(translated)) return translated;
    return genericProductField(product, field, normalized);
  }

  function productTagsFallback(product, language = getLanguage()) {
    const normalized = normalizeLanguage(language);
    const code = getLanguageCode(normalized);
    const tagsI18n = product?.tags_i18n || {};
    const candidate = tagsI18n[code];
    if (Array.isArray(candidate) && candidate.length && !candidate.some((tag) => hasWrongProductScript(tag, code))) {
      const localized = normalized === 'English' ? candidate : candidate.map((tag) => (
        isMostlyLatin(tag) ? localizeProductText(tag, normalized) : tag
      ));
      if (normalized === 'English' || !localized.some((tag) => isMostlyLatin(tag) || hasWrongProductScript(tag, code))) {
        return localized;
      }
    }

    const sourceTags = Array.isArray(tagsI18n.en) && tagsI18n.en.length ? tagsI18n.en : product?.tags || [];
    const translated = sourceTags.map((tag) => localizeProductText(tag, normalized)).filter(Boolean);
    if (translated.length && !translated.some((tag) => hasWrongProductScript(tag, code) || (normalized !== 'English' && isMostlyLatin(tag)))) return translated;
    return [productTextFallback(product, 'category', normalized), translatePhrase('Handmade', normalized)].filter(Boolean);
  }

  function genericProductField(product, field, language = getLanguage()) {
    const category = localizeCategory(product?.category || 'Handicrafts', language);
    const productWord = translatePhrase('Product', language);
    if (field === 'category') return category;
    if (field === 'description') {
      const name = genericProductField(product, 'name', language);
      if (normalizeLanguage(language) === 'Hindi') return `${name} ${category} श्रेणी का एक गुणवत्तापूर्ण हस्तनिर्मित उत्पाद है।`;
      if (normalizeLanguage(language) === 'Kannada') return `${name} ${category} ವರ್ಗದ ಗುಣಮಟ್ಟದ ಕೈಯಿಂದ ಮಾಡಿದ ಉತ್ಪನ್ನವಾಗಿದೆ.`;
      return `${name} is a quality handmade ${category} product from a women-led producer.`;
    }
    return `${category} ${productWord}`;
  }

  function hasWrongProductScript(value, code) {
    const text = String(value || '');
    if (code === 'en') return /[\u0900-\u097F\u0C80-\u0CFF]/.test(text);
    if (code === 'hi') return /[\u0C80-\u0CFF]/.test(text);
    if (code === 'kn') return /[\u0900-\u097F]/.test(text);
    return false;
  }

  function isMostlyLatin(value) {
    const text = String(value || '');
    return /[A-Za-z]/.test(text) && !/[\u0900-\u097F\u0C80-\u0CFF]/.test(text);
  }

  function localizeProduct(product, language = getLanguage()) {
    if (!product) return product;
    const name = productTextFallback(product, 'name', language);
    const category = productTextFallback(product, 'category', language);
    const description = productTextFallback(product, 'description', language) || 'Made by rural women entrepreneurs.';
    const tags = productTagsFallback(product, language);
    return {
      ...product,
      display_name: name || localizeProductText(product.name, language),
      display_category: category || localizeCategory(product.category, language),
      display_description: description || localizeProductText(product.description || 'Made by rural women entrepreneurs.', language),
      display_tags: tags
    };
  }

  function localizeGeneratedListing(listing, language = getLanguage()) {
    if (!listing) return listing;
    if (normalizeLanguage(language) === 'English') return listing;
    return {
      ...listing,
      product_name: localizeProductText(listing.product_name || '', language),
      display_category: localizeCategory(listing.category, language),
      description: listing.description || localizeProductText(listing.description || '', language),
      tags: Array.isArray(listing.tags) ? listing.tags.map((tag) => localizeProductText(tag, language)) : listing.tags,
      seo_keywords: Array.isArray(listing.seo_keywords)
        ? listing.seo_keywords.map((keyword) => localizeProductText(keyword, language))
        : listing.seo_keywords
    };
  }

  const imageProfiles = {
    'Skincare Products': { colors: ['#f8dcc8', '#7fb069'], label: 'SOAP', motif: 'soap' },
    Pickles: { colors: ['#d95d39', '#f2b84b'], label: 'PICKLE', motif: 'jar' },
    'Homemade Food': { colors: ['#c9832b', '#f7d774'], label: 'FOOD', motif: 'bowl' },
    Handloom: { colors: ['#7e3f8f', '#e6a75a'], label: 'WEAVE', motif: 'cloth' },
    Jewellery: { colors: ['#3d405b', '#e9c46a'], label: 'JEWEL', motif: 'jewel' },
    'Tailoring Items': { colors: ['#5b8e7d', '#f4a261'], label: 'STITCH', motif: 'stitch' },
    'Organic Products': { colors: ['#4f772d', '#d8f3a5'], label: 'ORGANIC', motif: 'leaf' },
    'Bamboo Products': { colors: ['#8a9a5b', '#e5d4a1'], label: 'BAMBOO', motif: 'bamboo' },
    Spices: { colors: ['#b85c38', '#f2a65a'], label: 'SPICE', motif: 'spice' },
    Handicrafts: { colors: ['#c15a2b', '#f4a300'], label: 'CRAFT', motif: 'craft' },
    Textiles: { colors: ['#7e3f8f', '#f4a261'], label: 'TEXTILE', motif: 'cloth' },
    Food: { colors: ['#c9832b', '#f7d774'], label: 'FOOD', motif: 'bowl' }
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

  function categoryImageDataUrl(category = 'Handicrafts', name = 'SheMarket Product') {
    const inferred = inferImageCategory(category, name);
    const profile = imageProfiles[inferred] || imageProfiles.Handicrafts;
    const [a, b] = profile.colors;
    const safeName = escapeHtml(shorten(name || 'SheMarket Product', 34));
    const safeCategory = escapeHtml(localizeCategory(inferred));
    const motif = motifSvg(profile.motif);
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="720" height="480" viewBox="0 0 720 480">
        <defs>
          <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
            <stop stop-color="${a}"/><stop offset="1" stop-color="${b}"/>
          </linearGradient>
          <pattern id="p" width="42" height="42" patternUnits="userSpaceOnUse">
            <path d="M0 21h42M21 0v42" stroke="rgba(255,255,255,.18)" stroke-width="1"/>
          </pattern>
        </defs>
        <rect width="720" height="480" rx="30" fill="url(#g)"/>
        <rect width="720" height="480" fill="url(#p)" opacity=".55"/>
        <circle cx="585" cy="92" r="88" fill="rgba(255,255,255,.24)"/>
        <circle cx="106" cy="392" r="120" fill="rgba(255,255,255,.16)"/>
        <rect x="76" y="72" width="568" height="334" rx="30" fill="rgba(255,255,255,.86)"/>
        ${motif}
        <text x="360" y="260" text-anchor="middle" font-family="Poppins,Arial,sans-serif" font-size="34" font-weight="800" fill="#3b1f0c">${safeName}</text>
        <text x="360" y="306" text-anchor="middle" font-family="Poppins,Arial,sans-serif" font-size="23" font-weight="700" fill="#8b4a24">${safeCategory}</text>
        <text x="360" y="348" text-anchor="middle" font-family="Poppins,Arial,sans-serif" font-size="18" fill="#5f7f3a">Women-led SHG Product</text>
      </svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  function motifSvg(motif) {
    const common = 'stroke="#3b1f0c" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity=".88"';
    const fills = 'fill="rgba(244,163,0,.26)" stroke="#3b1f0c" stroke-width="10"';
    const motifs = {
      soap: `<g transform="translate(300 112)"><rect x="0" y="28" width="120" height="72" rx="34" ${fills}/><circle cx="34" cy="10" r="13" fill="#7fb069"/><circle cx="78" cy="4" r="10" fill="#7fb069"/></g>`,
      jar: `<g transform="translate(308 102)"><path d="M22 62h84l-8 86H30z" fill="rgba(217,93,57,.28)" stroke="#3b1f0c" stroke-width="10"/><path d="M38 24h52v36H38z" fill="#f2b84b" stroke="#3b1f0c" stroke-width="10"/><path d="M34 92h60" ${common}/></g>`,
      bowl: `<g transform="translate(290 130)"><path d="M0 38h140c-8 54-36 82-70 82S8 92 0 38z" fill="rgba(247,215,116,.48)" stroke="#3b1f0c" stroke-width="10"/><path d="M24 14c22 18 66 18 92 0" ${common}/></g>`,
      cloth: `<g transform="translate(290 104)"><path d="M20 20h118v138H20z" fill="rgba(230,167,90,.38)" stroke="#3b1f0c" stroke-width="10"/><path d="M48 20v138M80 20v138M112 20v138M20 56h118M20 96h118M20 132h118" stroke="#7e3f8f" stroke-width="5"/></g>`,
      jewel: `<g transform="translate(286 112)"><path d="M76 0l70 58-70 96L6 58z" fill="rgba(233,196,106,.45)" stroke="#3b1f0c" stroke-width="10"/><path d="M6 58h140M44 58l32 96M108 58l-32 96M44 58L76 0l32 58" stroke="#3b1f0c" stroke-width="7" fill="none"/></g>`,
      stitch: `<g transform="translate(292 108)"><path d="M34 0c70 58 70 116 0 174" ${common}/><path d="M100 10v154M78 32h44M78 72h44M78 112h44M78 152h44" stroke="#3b1f0c" stroke-width="8" stroke-linecap="round"/></g>`,
      leaf: `<g transform="translate(292 112)"><path d="M132 4C54 12 12 54 4 142c84-2 130-46 128-138z" fill="rgba(216,243,165,.54)" stroke="#3b1f0c" stroke-width="10"/><path d="M26 124L116 30M56 94l-4-36M78 72h38" ${common}/></g>`,
      bamboo: `<g transform="translate(306 96)"><path d="M24 0v176M78 0v176" stroke="#3b1f0c" stroke-width="14" stroke-linecap="round"/><path d="M6 46h36M60 46h36M6 94h36M60 94h36M6 142h36M60 142h36" stroke="#8a9a5b" stroke-width="9"/></g>`,
      spice: `<g transform="translate(284 112)"><circle cx="50" cy="58" r="48" fill="rgba(242,166,90,.45)" stroke="#3b1f0c" stroke-width="10"/><circle cx="112" cy="92" r="42" fill="rgba(184,92,56,.35)" stroke="#3b1f0c" stroke-width="10"/><circle cx="78" cy="116" r="34" fill="rgba(244,163,0,.35)" stroke="#3b1f0c" stroke-width="10"/></g>`,
      craft: `<g transform="translate(296 112)"><path d="M76 0l24 48 54 8-39 38 9 54-48-26-48 26 9-54L-2 56l54-8z" fill="rgba(244,163,0,.34)" stroke="#3b1f0c" stroke-width="10"/></g>`
    };
    return motifs[motif] || motifs.craft;
  }

  function productImageUrl(product) {
    const fallback = categoryImageDataUrl(inferImageCategory(product), product?.name || 'SheMarket Product');
    return product?.image_url || fallback;
  }

  function shopMapsUrl(seller = {}) {
    if (!seller?.shopAddress && !seller?.googleMapsLink) return '';
    if (seller.googleMapsLink) return seller.googleMapsLink;
    const query = [seller.shopAddress, seller.shopCity, seller.shopState, seller.shopPIN]
      .filter(Boolean)
      .join(' ');
    return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : '';
  }

  function productMedia(product, large = false) {
    const imageUrl = productImageUrl(product);
    const fallback = categoryImageDataUrl(inferImageCategory(product), product?.name || 'SheMarket Product');
    const alt = localizeProductText(product?.name || 'SheMarket product');
    const image = `<img loading="lazy" decoding="async" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(alt)}" onerror="this.onerror=null;this.src='${escapeHtml(fallback)}';">`;
    return large ? image : `<div class="product-media">${image}</div>`;
  }

  function productCard(product, options = {}) {
    const display = localizeProduct(product);
    const detailHref = product._id?.startsWith?.('mock-')
      ? '#featured-products'
      : `/pages/product-details.html?id=${product._id}`;
    const seller = typeof product.seller_id === 'object' ? product.seller_id : {};
    const sellerName = seller?.shopName || seller?.name || 'SHG seller';
    const mapsUrl = shopMapsUrl(seller);
    const user = getUser();
    const hideCartControls = options.hideCart || user?.role === 'seller';

    return `
      <article class="product-card" data-product-card="${escapeHtml(product._id || '')}">
        ${productMedia(product)}
        <div class="product-body">
          <div class="product-meta">
            <span class="tag">${escapeHtml(display.display_category || 'Handmade')}</span>
            <span class="muted">&#9733; ${product.rating || 0}</span>
          </div>
          <h3>${escapeHtml(display.display_name || product.name)}</h3>
          <p class="muted">${escapeHtml(shorten(display.display_description || 'Made by rural women entrepreneurs.', 96))}</p>
          <div class="summary-row">
            <span class="price">${formatCurrency(product.price)}</span>
            <span class="muted">${escapeHtml(translatePhrase('by'))} ${escapeHtml(sellerName || 'SHG seller')}</span>
          </div>
          ${seller?.shopAddress ? '<span class="tag">Has Physical Shop</span>' : ''}
          <div class="inline-actions" style="margin-top: 0.9rem;">
            <a class="btn btn-outline btn-small" href="${detailHref}">${escapeHtml(t('view'))}</a>
            ${hideCartControls ? '' : `<button class="btn btn-primary btn-small" data-add-cart="${escapeHtml(product._id)}">${escapeHtml(t('add'))}</button>`}
            ${mapsUrl && !options.hideCart ? `<a class="btn btn-outline btn-small" href="${escapeHtml(mapsUrl)}" target="_blank" rel="noopener"><i data-lucide="map-pin"></i>${escapeHtml(translatePhrase('View Shop Location'))}</a>` : ''}
          </div>
        </div>
      </article>
    `;
  }

  function bindAddToCart(products) {
    document.querySelectorAll('[data-add-cart]').forEach((button) => {
      button.addEventListener('click', () => {
        if (getUser()?.role === 'seller') {
          toast('Sellers cannot make purchases.', 'error');
          return;
        }
        const product = products.find((item) => item._id === button.dataset.addCart);
        if (!product) return;
        if (String(product._id).startsWith('mock-')) {
          toast('Demo products are previews. Add real products from a seller account to checkout.', 'error');
          return;
        }
        addToCart(product);
      });
    });
  }

  function demoProducts() {
    return [
      {
        _id: 'mock-1',
        name: 'Madhubani Painted Dupatta',
        category: 'Textiles',
        description: 'Hand-painted cotton dupatta with folk motifs and vegetable-inspired colors.',
        price: 680,
        rating: 4.8,
        image_url: ''
      },
      {
        _id: 'mock-2',
        name: 'Terracotta Diya Set',
        category: 'Handicrafts',
        description: 'Festival diya set shaped and painted by an SHG pottery group.',
        price: 180,
        rating: 4.7,
        image_url: ''
      },
      {
        _id: 'mock-3',
        name: 'Organic Millet Laddoo',
        category: 'Homemade Food',
        description: 'Nutritious sweets made with millets, jaggery, and roasted nuts.',
        price: 150,
        rating: 4.6,
        image_url: ''
      }
    ];
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function shorten(value, length) {
    const text = String(value ?? '');
    return text.length > length ? `${text.slice(0, length - 1)}...` : text;
  }

  function getQuery(name) {
    return new URLSearchParams(location.search).get(name);
  }

  function setActiveNav() {
    const path = location.pathname.replace(/\/$/, '');
    document.querySelectorAll('a[href]').forEach((link) => {
      const href = new URL(link.href).pathname.replace(/\/$/, '');
      if (href === path) link.classList.add('active');
    });
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      if (!file) return resolve('');
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function readImageAsCompressedDataUrl(file, maxWidth = 1100, quality = 0.72) {
    if (!file) return '';
    if (!file.type?.startsWith('image/')) return readFileAsDataUrl(file);

    const original = await readFileAsDataUrl(file);
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = original;
    });

    const scale = Math.min(1, maxWidth / image.width);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);

    let compressed = canvas.toDataURL('image/jpeg', quality);
    if (compressed.length > 60000) {
      compressed = canvas.toDataURL('image/jpeg', 0.55);
    }
    return compressed;
  }

  function initPasswordToggles() {
    document.querySelectorAll('[data-password-toggle]').forEach((button) => {
      const input = document.querySelector(button.dataset.passwordToggle);
      if (!input) return;
      button.addEventListener('click', () => {
        const visible = input.type === 'text';
        input.type = visible ? 'password' : 'text';
        button.setAttribute('aria-label', visible ? 'Show password' : 'Hide password');
        button.innerHTML = `<i data-lucide="${visible ? 'eye' : 'eye-off'}"></i>`;
        if (window.lucide) window.lucide.createIcons();
      });
    });
  }

  function inferPortalRole() {
    const page = document.body.dataset.page || '';
    const user = getUser();
    if (user?.role) return user.role;
    if (page.startsWith('seller') || page === 'profile') return 'seller';
    if (page === 'shg-dashboard' || page === 'seller-management' || page === 'reports' || page === 'admin-orders') return 'admin';
    if (['cart', 'checkout', 'buyer-orders', 'reviews', 'product-details'].includes(page)) return 'buyer';
    return '';
  }

  function renderPortalIdentity() {
    const role = inferPortalRole();
    if (!role) return;

    document.body.classList.remove('portal-buyer', 'portal-seller', 'portal-admin');
    document.body.classList.add(`portal-${role}`);

    const nav = document.querySelector('.topbar .nav-links');
    if (nav && !nav.querySelector('.portal-chip')) {
      const key = role === 'admin' ? 'adminPortal' : role === 'seller' ? 'sellerPortal' : 'buyerPortal';
      nav.insertAdjacentHTML('afterbegin', `<span class="portal-chip ${escapeHtml(role)}" data-i18n="${escapeHtml(key)}">${escapeHtml(t(key))}</span>`);
    }

    const sidebar = document.querySelector('.sidebar');
    if (sidebar && !sidebar.querySelector('.sidebar-label')) {
      const key = role === 'admin' ? 'adminPortal' : role === 'seller' ? 'sellerPortal' : 'buyerPortal';
      sidebar.insertAdjacentHTML('afterbegin', `<div class="sidebar-label" data-i18n="${escapeHtml(key)}">${escapeHtml(t(key))}</div>`);
    }

    const main = document.querySelector('.app-main');
    if (main && !main.querySelector('.portal-welcome')) {
      const titleKey = role === 'admin' ? 'adminPortalTitle' : role === 'seller' ? 'sellerPortalTitle' : 'buyerPortalTitle';
      const bodyKey = role === 'admin' ? 'adminPortalBody' : role === 'seller' ? 'sellerPortalBody' : 'buyerPortalBody';
      main.insertAdjacentHTML('afterbegin', `
        <section class="portal-welcome">
          <span class="portal-eyebrow" data-i18n="${escapeHtml(role === 'admin' ? 'adminPortal' : role === 'seller' ? 'sellerPortal' : 'buyerPortal')}">${escapeHtml(t(role === 'admin' ? 'adminPortal' : role === 'seller' ? 'sellerPortal' : 'buyerPortal'))}</span>
          <div>
            <h2 data-i18n="${escapeHtml(titleKey)}">${escapeHtml(t(titleKey))}</h2>
            <p data-i18n="${escapeHtml(bodyKey)}">${escapeHtml(t(bodyKey))}</p>
          </div>
        </section>
      `);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    setActiveNav();
    updateCartCount();
    initLanguageControls();
    initPasswordToggles();

    document.querySelectorAll('[data-logout]').forEach((button) => {
      button.addEventListener('click', logout);
    });

    const user = getUser();
    document.querySelectorAll('[data-user-name]').forEach((node) => {
      node.textContent = user?.name || 'Guest';
    });

    renderPortalIdentity();
    if (window.lucide) window.lucide.createIcons();
  });

  window.addEventListener('shemarket:languagechange', () => {
    renderPortalIdentity();
  });

  return {
    addToCart,
    applyTranslations,
    bindAddToCart,
    categoryImageDataUrl,
    demoProducts,
    escapeHtml,
    formatCurrency,
    getCart,
    getDictionary,
    getLanguage,
    getLanguageCode,
    getLocale,
    getQuery,
    getToken,
    getUser,
    inferImageCategory,
    languageOptions,
    localizeCategory,
    localizeGeneratedListing,
    localizeProduct,
    localizeProductText,
    normalizeLanguage,
    productCard,
    productImageUrl,
    productMedia,
    readImageAsCompressedDataUrl,
    readFileAsDataUrl,
    request,
    requireAuth,
    setAuth,
    setCart,
    setLanguage,
    supportedLanguages,
    t,
    toast,
    translatePhrase,
    translateStaticText,
    updateCartCount
  };
})();

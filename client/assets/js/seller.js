const sellerCharts = {};
const VOICE_RECORDING_MS = 12000;
let priceDisplayModulePromise = null;

document.addEventListener('DOMContentLoaded', () => {
  runSellerPage();
});

window.addEventListener('shemarket:languagechange', () => {
  runSellerPage();
});

function runSellerPage() {
  const page = document.body.dataset.page;
  if (!page) return;

  if (page.startsWith('seller') || page === 'profile') {
    const user = SheMarket.requireAuth(['seller', 'admin']);
    if (!user) return;
  }

  const handlers = {
    'seller-dashboard': loadSellerDashboard,
    'seller-add-product': initAddProduct,
    'seller-products': loadSellerProducts,
    'seller-orders': loadSellerOrders,
    'seller-analytics': loadSellerAnalytics,
    profile: loadProfile
  };

  handlers[page]?.();
}

async function renderPricePrediction(data) {
  try {
    if (!priceDisplayModulePromise) {
      priceDisplayModulePromise = import('/public/js/priceDisplay.js');
    }
    const module = await priceDisplayModulePromise;
    const render = module.renderPricePrediction || window.SheMarketPriceDisplay?.render;
    render?.(data, { formatCurrency: SheMarket.formatCurrency });
  } catch (error) {
    // Price suggestion still works if the optional display helper cannot load.
  }
}

async function loadSellerDashboard() {
  try {
    const data = await SheMarket.request('/api/dashboard/seller');
    setText('total-products', data.totalProducts);
    setText('total-orders', data.totalOrders);
    setText('total-revenue', SheMarket.formatCurrency(data.revenue));
    renderTopProducts(data.topProducts || []);
    SheMarket.translateStaticText(document.querySelector('.app-main'));
  } catch (error) {
    SheMarket.toast(error.message, 'error');
  }
}

function initAddProduct() {
  const form = document.querySelector('#add-product-form');
  if (!form || form.dataset.bound === 'true') return;
  form.dataset.bound = 'true';

  const micButton = document.querySelector('#voice-name-button');
  const generateButton = document.querySelector('#generate-description-button');
  const suggestButton = document.querySelector('#suggest-price-button');
  const voiceRetry = document.querySelector('[data-voice-retry]');
  const takePhotoButton = document.querySelector('#take-photo-button');
  const photoAiStatus = document.querySelector('#photo-ai-status');

  const startVoice = () => handleVoiceInput(form, micButton);
  micButton?.addEventListener('click', startVoice);
  voiceRetry?.addEventListener('click', startVoice);
  takePhotoButton?.addEventListener('click', () => openCameraModal(form, takePhotoButton, photoAiStatus));

  generateButton?.addEventListener('click', async () => {
    try {
      setButtonLoading(generateButton, true, 'Generating fresh AI content...');
      const baseProductText = [form.elements.name.value, form.elements.category.value]
        .filter(Boolean)
        .join(' ');
      const previousDescription = form.elements.description.value;

      form.elements.description.value = '';
      form.elements.tags.value = '';
      if (form.elements.seo_keywords) form.elements.seo_keywords.value = '';

      const data = await SheMarket.request('/api/ai/generate-description', {
        method: 'POST',
        body: {
          product_text: baseProductText,
          product_input: baseProductText,
          previous_description: previousDescription,
          seller_state: '',
          language: SheMarket.getLanguage(),
          language_code: SheMarket.getLanguageCode(),
          regenerate_seed: `${Date.now()}-${Math.random().toString(16).slice(2)}`
        }
      });
      const localized = SheMarket.localizeGeneratedListing(data);

      form.elements.name.value = localized.product_name || form.elements.name.value || data.product_name;
      if ([...form.elements.category.options].some((option) => option.value === data.category)) {
        form.elements.category.value = data.category;
      }
      form.elements.description.value = localized.description || data.description || '';
      form.elements.tags.value = (localized.tags || data.tags || []).join(', ');
      if (form.elements.seo_keywords) {
        form.elements.seo_keywords.value = (localized.seo_keywords || data.seo_keywords || []).join(', ');
      }
      SheMarket.toast('Fresh AI description generated.', 'success');
    } catch (error) {
      SheMarket.toast(error.message, 'error');
    } finally {
      setButtonLoading(generateButton, false);
    }
  });

  suggestButton?.addEventListener('click', async () => {
    try {
      setButtonLoading(suggestButton, true);
      const body = {
        category: form.elements.category.value || 'Handicrafts',
        raw_material_cost: Number(form.elements.raw_material_cost.value || 0),
        labour_cost: Number(form.elements.labour_cost.value || 0),
        packaging_cost: Number(form.elements.packaging_cost.value || 0),
        market_price: Number(form.elements.price.value || 0),
        product_name: form.elements.name.value,
        area: SheMarket.getUser()?.shopCity || SheMarket.getUser()?.city || '',
        demand_level: 'High',
        rating: 4.5
      };

      if (!body.market_price) {
        body.market_price = Math.round((body.raw_material_cost + body.labour_cost + body.packaging_cost) * 1.9);
      }

      const data = await SheMarket.request('/api/ai/predict-price', {
        method: 'POST',
        body
      });

      form.elements.price.value = data.recommended_price;
      form.elements.recommended_price.value = data.recommended_price;
      renderPricePrediction(data);
      const totalCost = body.raw_material_cost + body.labour_cost + body.packaging_cost;
      if (totalCost > 0 && Number(data.recommended_price) < totalCost) {
        SheMarket.toast(
          `Warning: Suggested price ${SheMarket.formatCurrency(data.recommended_price)} is below your total cost ${SheMarket.formatCurrency(totalCost)}. Please review.`,
          'error'
        );
      } else {
        SheMarket.toast('AI price suggested from cost and market trend.', 'success');
      }
    } catch (error) {
      SheMarket.toast(error.message, 'error');
    } finally {
      setButtonLoading(suggestButton, false);
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitButton = form.querySelector('button[type="submit"]');

    setButtonLoading(submitButton, true, 'Translating product...');

    try {
      const formData = new FormData(form);
      const imageFile = form.elements.image.files[0];
      const imageUrl = await SheMarket.readImageAsCompressedDataUrl(imageFile);
      const cameraImageUrl = form.elements.image.dataset.cameraImageUrl || '';

      const body = Object.fromEntries(formData.entries());
      body.tags = body.tags ? body.tags.split(',').map((tag) => tag.trim()).filter(Boolean) : [];
      body.image_url = imageUrl || cameraImageUrl || body.image_url || SheMarket.categoryImageDataUrl(body.category, body.name);
      body.language = SheMarket.getLanguageCode();
      body.source_language = SheMarket.getLanguageCode();
      ['price', 'recommended_price', 'raw_material_cost', 'labour_cost', 'packaging_cost'].forEach((field) => {
        body[field] = Number(body[field] || 0);
      });
      delete body.image;
      delete body.seo_keywords;

      await SheMarket.request('/api/products/add', {
        method: 'POST',
        body
      });
      form.reset();
      if (form.elements.image) form.elements.image.dataset.cameraImageUrl = '';
      setVoiceStatus('idle', '', true);
      SheMarket.toast('Product added.', 'success');
    } catch (error) {
      SheMarket.toast(error.message, 'error');
    } finally {
      setButtonLoading(submitButton, false);
    }
  });

  SheMarket.translateStaticText(form);
}

async function handlePhotoListing(form, imageDataUrl, button, status) {
  if (!imageDataUrl) return;
  if (form.elements.image) {
    form.elements.image.dataset.cameraImageUrl = imageDataUrl;
  }
  const preview = document.querySelector('#captured-photo-preview');
  if (preview) {
    preview.src = imageDataUrl;
    preview.classList.remove('hide');
  }
  try {
    setButtonLoading(button, true, 'Reading product image...');
    if (status) status.textContent = SheMarket.translatePhrase('Reading product image...');
    const result = await SheMarket.request('/api/ai/analyze-product-image', {
      method: 'POST',
      body: { image_data_url: imageDataUrl }
    });

    form.elements.name.value = result.productName || form.elements.name.value;
    form.elements.description.value = result.detailedDescription || result.shortDescription || form.elements.description.value;
    if ([...form.elements.category.options].some((option) => option.value === result.suggestedCategory)) {
      form.elements.category.value = result.suggestedCategory;
    }
    const price = parseSuggestedPrice(result.suggestedPriceRangeINR);
    if (price) {
      form.elements.price.value = price;
      form.elements.recommended_price.value = price;
    }
    if (status) status.textContent = SheMarket.translatePhrase('Image read. Please review before saving.');
  } catch (error) {
    if (status) status.textContent = SheMarket.translatePhrase('Could not read image, please fill manually.');
  } finally {
    setButtonLoading(button, false);
  }
}

async function openCameraModal(form, button, status) {
  const modal = document.querySelector('#camera-modal');
  const video = document.querySelector('#camera-video');
  const canvas = document.querySelector('#camera-canvas');
  const preview = document.querySelector('#camera-preview');
  const capture = document.querySelector('#camera-capture');
  const retake = document.querySelector('#camera-retake');
  const use = document.querySelector('#camera-use');
  const statusNode = document.querySelector('[data-camera-status]');
  if (!modal || !video || !canvas || !preview) return;

  let stream = null;
  let capturedDataUrl = '';
  const stopCamera = () => {
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
  };
  const close = () => {
    stopCamera();
    modal.classList.add('hide');
  };
  const showLive = () => {
    capturedDataUrl = '';
    video.classList.remove('hide');
    preview.classList.add('hide');
    capture?.classList.remove('hide');
    retake?.classList.add('hide');
    use?.classList.add('hide');
  };

  modal.querySelectorAll('[data-camera-cancel]').forEach((node) => {
    node.onclick = close;
  });
  capture.onclick = () => {
    canvas.width = video.videoWidth || 960;
    canvas.height = video.videoHeight || 720;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    capturedDataUrl = canvas.toDataURL('image/jpeg', 0.78);
    preview.src = capturedDataUrl;
    video.classList.add('hide');
    preview.classList.remove('hide');
    capture.classList.add('hide');
    retake.classList.remove('hide');
    use.classList.remove('hide');
    if (statusNode) statusNode.textContent = SheMarket.translatePhrase('Photo captured. Use it or retake.');
  };
  retake.onclick = showLive;
  use.onclick = () => {
    close();
    handlePhotoListing(form, capturedDataUrl, button, status);
  };

  try {
    modal.classList.remove('hide');
    showLive();
    if (statusNode) statusNode.textContent = SheMarket.translatePhrase('Opening camera...');
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } });
    video.srcObject = stream;
    await video.play();
    if (statusNode) statusNode.textContent = SheMarket.translatePhrase('Camera ready. Position the product and capture.');
    if (window.lucide) window.lucide.createIcons();
  } catch (error) {
    close();
    if (status) status.textContent = SheMarket.translatePhrase('Camera permission denied. Use image upload instead.');
    SheMarket.toast('Camera permission denied. Use image upload instead.', 'error');
  }
}

function parseSuggestedPrice(value) {
  const numbers = String(value || '').match(/\d+(?:\.\d+)?/g);
  if (!numbers?.length) return 0;
  const parsed = numbers.map(Number).filter((number) => Number.isFinite(number));
  if (!parsed.length) return 0;
  return Math.round(parsed.reduce((sum, number) => sum + number, 0) / parsed.length);
}

async function handleVoiceInput(form, micButton) {
  const fallback = document.querySelector('#voice-fallback');
  try {
    micButton.disabled = true;
    micButton.classList.add('is-listening');
    fallback?.classList.add('hide');
    setVoiceStatus('listening', 'Listening...');

    const speech = await captureSpeech(SheMarket.getLanguage());
    setVoiceStatus('processing', 'Processing voice...');
    micButton.classList.remove('is-listening');
    micButton.classList.add('is-loading');

    const data = await SheMarket.request('/api/ai/voice-to-text', {
      method: 'POST',
      body: {
        field: 'product_name',
        text_hint: speech.transcript,
        audio_data_url: speech.audioDataUrl,
        language_hint: SheMarket.getLanguage(),
        language_code: voiceLanguageCode(SheMarket.getLanguage())
      }
    });

    const transcript = data.text || speech.transcript;
    if (!transcript) throw new Error('Voice capture failed. Try again.');
    setVoiceStatus('processing', 'Extracting product details...');
    const details = await SheMarket.request('/api/ai/extract-product-details', {
      method: 'POST',
      body: {
        transcript,
        language: SheMarket.getLanguageCode()
      }
    });
    fillProductFormFromVoice(form, details);
    const missing = details.missing_fields?.length
      ? ` Please review missing fields: ${details.missing_fields.join(', ')}.`
      : '';
    setVoiceStatus('success', `Product details filled from voice.${missing}`);
    SheMarket.toast('Product details filled from voice.', 'success');
  } catch (error) {
    const blocked = isPermissionDenied(error);
    const msg = blocked
      ? 'Microphone blocked. Please allow mic access in your browser settings and refresh the page.'
      : (error.message || 'Voice capture failed. Try again.');
    setVoiceStatus(blocked ? 'error blocked' : 'error', msg);
    SheMarket.toast(msg, 'error');
  } finally {
    micButton.disabled = false;
    micButton.classList.remove('is-listening');
    micButton.classList.remove('is-loading');
  }
}

function fillProductFormFromVoice(form, details) {
  if (details.product_name) form.elements.name.value = details.product_name;
  if (details.description && form.elements.description) {
    form.elements.description.value = details.description;
  }
  if (!details.description && details.raw_transcript && form.elements.description) {
    form.elements.description.value = details.raw_transcript;
  }
  if (details.category && [...form.elements.category.options].some((option) => option.value === details.category)) {
    form.elements.category.value = details.category;
  }
  if (details.raw_material_cost !== undefined) form.elements.raw_material_cost.value = Number(details.raw_material_cost || 0);
  if (details.labour_cost !== undefined) form.elements.labour_cost.value = Number(details.labour_cost || 0);
  if (details.packaging_cost !== undefined) form.elements.packaging_cost.value = Number(details.packaging_cost || 0);
  if (details.selling_price !== undefined) form.elements.price.value = Number(details.selling_price || 0);
  if (details.recommended_price !== undefined) form.elements.recommended_price.value = Number(details.recommended_price || details.selling_price || 0);
  if (Array.isArray(details.tags)) form.elements.tags.value = details.tags.join(', ');
  if (form.elements.seo_keywords && Array.isArray(details.seo_keywords)) {
    form.elements.seo_keywords.value = details.seo_keywords.join(', ');
  }
}

function setVoiceStatus(state, message, hide = false) {
  const status = document.querySelector('#voice-status');
  const text = document.querySelector('[data-voice-status-text]');
  const retry = document.querySelector('[data-voice-retry]');
  const blockedMsg = document.querySelector('[data-voice-blocked]');
  if (!status || !text) return;

  status.className = `voice-status ${hide || !message ? 'hide' : ''} ${state || ''}`;
  text.textContent = message ? SheMarket.translatePhrase(message) : '';
  if (retry) retry.classList.toggle('hide', state !== 'error');
  if (blockedMsg) blockedMsg.classList.toggle('hide', state !== 'error blocked');
}

async function captureSpeech(language, options = {}) {
  let triedRealCapture = false;

  try {
    const transcript = await captureSpeechRecognition(language, options);
    triedRealCapture = true;
    if (transcript) return { transcript, audioDataUrl: '' };
  } catch (error) {
    if (isPermissionDenied(error)) throw voiceError('Microphone permission denied', error.code || error.name || 'permission-denied');
    if (!isUnsupportedVoiceError(error)) triedRealCapture = true;
  }

  try {
    setCaptureStatus(options, 'listening', 'Listening...');
    const audioDataUrl = await recordAudioClip(VOICE_RECORDING_MS);
    triedRealCapture = true;
    if (audioDataUrl) return { transcript: '', audioDataUrl };
  } catch (error) {
    if (isPermissionDenied(error)) throw voiceError('Microphone permission denied', error.code || error.name || 'permission-denied');
    if (!isUnsupportedVoiceError(error)) triedRealCapture = true;
  }

  if (triedRealCapture) setCaptureStatus(options, 'error', 'Voice capture failed. Try again.');
  const typed = await requestTypedVoiceFallback(language, options);
  return { transcript: typed, audioDataUrl: '' };
}

function requestTypedVoiceFallback(language, options = {}) {
  const fallback = document.querySelector(options.fallbackSelector || '#voice-fallback');
  const input = document.querySelector(options.fallbackInputSelector || '#voice-fallback-input');
  const submit = document.querySelector(options.fallbackSubmitSelector || '[data-voice-fallback-submit]');
  const cancel = document.querySelector(options.fallbackCancelSelector || '[data-voice-fallback-cancel]');
  const fallbackLabel = options.fallbackLabel || 'Voice capture is not supported. Type the spoken product details.';

  if (!fallback || !input || !submit || !cancel) {
    throw new Error(fallbackLabel);
  }

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      fallback.classList.add('hide');
      submit.removeEventListener('click', submitHandler);
      cancel.removeEventListener('click', cancelHandler);
      input.removeEventListener('keydown', keyHandler);
    };

    const submitHandler = () => {
      const typed = input.value.trim();
      if (!typed) {
        setVoiceStatus('error', 'No voice text captured.');
        input.focus();
        return;
      }
      cleanup();
      resolve(typed);
    };

    const cancelHandler = () => {
      cleanup();
      reject(new Error('No voice text captured.'));
    };

    const keyHandler = (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        submitHandler();
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        cancelHandler();
      }
    };

    setCaptureStatus(options, 'error', fallbackLabel);
    fallback.classList.remove('hide');
    fallback.querySelector('label').textContent = SheMarket.translatePhrase(fallbackLabel);
    input.placeholder = localizedVoicePlaceholder(language);
    input.value = '';
    submit.addEventListener('click', submitHandler);
    cancel.addEventListener('click', cancelHandler);
    input.addEventListener('keydown', keyHandler);
    window.setTimeout(() => input.focus(), 0);
  });
}

function setCaptureStatus(options, state, message) {
  if (typeof options.setStatus === 'function') {
    options.setStatus(state, message);
    return;
  }
  setVoiceStatus(state, message);
}

function localizedVoicePlaceholder(language) {
  const normalized = SheMarket.normalizeLanguage(language);
  if (normalized === 'Hindi') return 'हस्तनिर्मित नारियल साबुन';
  if (normalized === 'Kannada') return 'ಕೈಯಿಂದ ಮಾಡಿದ ತೆಂಗಿನ ಸಾಬೂನು';
  return 'Handmade coconut soap';
}

function voiceLanguageCode(language) {
  return {
    English: 'en-IN',
    Hindi: 'hi-IN',
    Kannada: 'kn-IN'
  }[SheMarket.normalizeLanguage(language)] || 'en-IN';
}

function voiceError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function isUnsupportedVoiceError(error) {
  return error?.code === 'unsupported';
}

function isPermissionDenied(error) {
  const code = String(error?.code || error?.name || '').toLowerCase();
  return ['not-allowed', 'notallowederror', 'permission-denied', 'securityerror', 'service-not-allowed'].includes(code);
}

function captureSpeechRecognition(language, options = {}) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return Promise.reject(voiceError('Speech recognition is not supported.', 'unsupported'));

  return new Promise((resolve, reject) => {
    const recognition = new SpeechRecognition();
    let finalTranscript = '';
    let settled = false;
    let timer = 0;
    const settle = (handler, value) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      try {
        recognition.stop();
      } catch (error) {
        // Browser may already have stopped.
      }
      handler(value);
    };

    recognition.lang = voiceLanguageCode(language);
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result.isFinal) finalTranscript += `${result[0].transcript} `;
      }
    };
    recognition.onerror = (event) => {
      if (['no-speech', 'audio-capture', 'network'].includes(event.error)) {
        settle(resolve, '');
        return;
      }
      settle(reject, voiceError('Microphone permission denied', event.error));
    };
    recognition.onend = () => {
      const trimmed = finalTranscript.trim();
      if (trimmed) {
        settle(resolve, trimmed);
      } else {
        settle(reject, voiceError('No voice text captured.', 'empty'));
      }
    };
    try {
      recognition.start();
      timer = window.setTimeout(() => {
        const trimmed = finalTranscript.trim();
        if (trimmed) settle(resolve, trimmed);
        else settle(reject, voiceError('No voice text captured.', 'empty'));
      }, 25000);
    } catch (error) {
      reject(error);
    }
  });
}

async function recordAudioClip(durationMs = VOICE_RECORDING_MS) {
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    throw voiceError('Audio recording is not supported.', 'unsupported');
  }

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });
  } catch (error) {
    if (isPermissionDenied(error)) throw voiceError('Microphone permission denied', 'permission-denied');
    throw error;
  }

  return new Promise((resolve, reject) => {
    const chunks = [];
    const mimeType = preferredAudioMimeType();
    const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

    recorder.ondataavailable = (event) => {
      if (event.data?.size) chunks.push(event.data);
    };
    recorder.onerror = () => {
      stream.getTracks().forEach((track) => track.stop());
      reject(new Error('Microphone recording failed.'));
    };
    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      if (!chunks.length) {
        resolve('');
        return;
      }
      const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    };

    recorder.start();
    setTimeout(() => {
      if (recorder.state !== 'inactive') recorder.stop();
    }, durationMs);
  });
}

function preferredAudioMimeType() {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  return types.find((type) => window.MediaRecorder?.isTypeSupported?.(type)) || '';
}

async function loadSellerProducts() {
  const container = document.querySelector('#seller-products-grid');
  const user = SheMarket.getUser();
  if (!container || !user) return;
  container.innerHTML = skeletonCards(4);

  try {
    const products = await SheMarket.request('/api/products');
    const mine = products.filter((product) => {
      const sellerId = typeof product.seller_id === 'object' ? product.seller_id?._id : product.seller_id;
      return sellerId === user._id || user.role === 'admin';
    });

    container.innerHTML = mine.length
      ? mine.map((product) => SheMarket.productCard(product, { hideCart: true })).join('')
      : '<div class="empty-state">No products yet. Add your first handmade listing.</div>';
    SheMarket.translateStaticText(container);
  } catch (error) {
    container.innerHTML = '<div class="empty-state">Unable to load products.</div>';
    SheMarket.toast(error.message, 'error');
  }
}

async function loadSellerOrders() {
  const table = document.querySelector('#seller-orders-body');
  if (!table) return;
  table.innerHTML = '<tr><td colspan="6"><div class="skeleton-line"></div></td></tr>';

  try {
    const orders = await SheMarket.request('/api/orders');
    table.innerHTML = orders.length
      ? orders.map((order) => sellerOrderRow(order)).join('')
      : '<tr><td colspan="6">No incoming orders yet.</td></tr>';
    SheMarket.translateStaticText(table);

    table.querySelectorAll('[data-status-order]').forEach((select) => {
      select.addEventListener('change', async () => {
        try {
          await SheMarket.request(`/api/orders/${select.dataset.statusOrder}/status`, {
            method: 'PUT',
            body: { status: select.value }
          });
          SheMarket.toast('Order status updated and buyer notified.', 'success');
          loadSellerOrders();
        } catch (error) {
          SheMarket.toast(error.message, 'error');
        }
      });
    });
  } catch (error) {
    table.innerHTML = '<tr><td colspan="6">Unable to load orders.</td></tr>';
    SheMarket.toast(error.message, 'error');
  }
}

async function loadSellerAnalytics() {
  try {
    const data = await SheMarket.request('/api/dashboard/seller');
    const analytics = normalizeSellerAnalytics(data);

    setText('analytics-revenue', SheMarket.formatCurrency(analytics.revenue));
    setText('analytics-orders', analytics.totalOrders);
    setText('analytics-sold', analytics.totalProductsSold);
    setText('analytics-rating', analytics.averageRating.toFixed(1));

    renderChart(
      'sales-trend-chart',
      'line',
      analytics.salesTrend.map((item) => item.label),
      analytics.salesTrend.map((item) => item.profit || item.revenue || 0),
      SheMarket.translatePhrase('Profit in rupees'),
      { currency: true }
    );
    renderChart(
      'top-products-chart',
      'bar',
      analytics.topProducts.map((item) => item.displayName || item.name),
      analytics.topProducts.map((item) => item.revenue || item.orders || item.orders_count || 0),
      SheMarket.translatePhrase('Revenue by product'),
      { currency: true }
    );
    SheMarket.translateStaticText(document.querySelector('.app-main'));
  } catch (error) {
    SheMarket.toast(error.message, 'error');
  }
}

function normalizeSellerAnalytics(data = {}) {
  const fallback = demoSellerAnalytics();
  const trendSource = Array.isArray(data.profitTrend) && data.profitTrend.length
    ? data.profitTrend
    : Array.isArray(data.salesTrend) ? data.salesTrend : [];
  const salesTrend = trendSource
    .map((item) => ({
      label: item.label || item.date || item.month || item.day || '',
      revenue: Number(item.revenue || item.sales || 0),
      profit: Number(item.profit || item.net_profit || item.revenue || item.sales || 0)
    }))
    .filter((item) => item.label);

  const topProducts = Array.isArray(data.topProducts)
    ? data.topProducts
      .map((item) => {
        const display = SheMarket.localizeProduct(item);
        return {
          name: item.name || item.product_name || 'Product',
          displayName: display.display_name || item.name || item.product_name || 'Product',
          revenue: Number(item.revenue || item.sales || item.total_revenue || 0),
          orders: Number(item.orders || item.order_count || item.orders_count || 0),
          orders_count: Number(item.orders_count || item.orders || item.order_count || 0)
        };
      })
      .filter((item) => item.revenue > 0 || item.orders > 0 || item.orders_count > 0)
    : [];

  const hasRealData = data.usingFallback === false
    || data.dataSource === 'database'
    || Number(data.productsSold || data.totalProductsSold || 0) > 0;
  const useFallbackTrend = !hasRealData && (salesTrend.length < 2 || salesTrend.every((item) => item.profit <= 1 && item.revenue <= 1));
  const useFallbackProducts = !hasRealData && (topProducts.length < 2 || topProducts.every((item) => item.revenue <= 1 && item.orders <= 1));

  return {
    revenue: hasRealData ? Number(data.revenue || 0) : fallback.revenue,
    totalOrders: hasRealData ? Number(data.totalOrders || 0) : fallback.totalOrders,
    totalProductsSold: hasRealData ? Number(data.totalProductsSold || data.productsSold || 0) : fallback.totalProductsSold,
    averageRating: hasRealData ? Number(data.averageRating || 0) : fallback.averageRating,
    salesTrend: useFallbackTrend ? fallback.salesTrend : salesTrend,
    topProducts: useFallbackProducts ? fallback.topProducts : topProducts.slice(0, 6)
  };
}

function demoSellerAnalytics() {
  return {
    revenue: 42850,
    totalOrders: 136,
    totalProductsSold: 294,
    averageRating: 4.7,
    salesTrend: [
      { label: 'Apr 01', revenue: 5200, profit: 2100 },
      { label: 'Apr 08', revenue: 7800, profit: 3250 },
      { label: 'Apr 15', revenue: 9400, profit: 3920 },
      { label: 'Apr 22', revenue: 11250, profit: 4680 },
      { label: 'Apr 29', revenue: 13200, profit: 5420 },
      { label: 'May 06', revenue: 15800, profit: 6480 }
    ],
    topProducts: [
      { name: 'Coconut Soap', displayName: SheMarket.localizeProductText('Coconut Soap'), revenue: 12480, orders: 52 },
      { name: 'Mango Pickle', displayName: SheMarket.localizeProductText('Mango Pickle'), revenue: 9820, orders: 41 },
      { name: 'Jute Bag', displayName: SheMarket.localizeProductText('Jute Bag'), revenue: 8640, orders: 36 },
      { name: 'Millet Laddoo', displayName: SheMarket.localizeProductText('Millet Laddoo'), revenue: 6820, orders: 31 },
      { name: 'Handloom Dupatta', displayName: SheMarket.localizeProductText('Handloom Dupatta'), revenue: 5090, orders: 18 }
    ]
  };
}

async function loadProfile() {
  let user = SheMarket.getUser();
  if (!user) return;
  try {
    user = await SheMarket.request('/api/auth/me');
    SheMarket.setAuth(SheMarket.getToken(), user);
  } catch (error) {
    // Keep the locally cached profile visible if the network request fails.
  }

  setText('profile-name', user.name);
  setText('profile-avatar', (user.name || 'S').charAt(0).toUpperCase());
  setText('profile-email', user.email);
  setText('profile-role', SheMarket.t(user.role) || user.role);
  setText('profile-language', user.language || SheMarket.getLanguage());
  setText('profile-approval', user.is_approved ? SheMarket.translatePhrase('Approved') : SheMarket.translatePhrase('Pending approval'));
  setText('profile-rating', `${Number(user.aggregateRating || 0).toFixed(1)} / 5 · ${user.aggregateReviewCount || 0} reviews across ${user.aggregateReviewedProductCount || 0} products`);
  bindShopLocationForm(user);
  SheMarket.translateStaticText(document.querySelector('.app-main'));
}

function bindShopLocationForm(user) {
  const form = document.querySelector('#shop-location-form');
  if (!form) return;
  ['shopName', 'shopAddress', 'shopCity', 'shopState', 'shopPIN', 'shopPhone', 'shopHours', 'googleMapsLink'].forEach((field) => {
    if (form.elements[field]) form.elements[field].value = user[field] || '';
  });

  if (form.dataset.bound === 'true') return;
  form.dataset.bound = 'true';
  document.querySelector('#shop-location-mic')?.addEventListener('click', () => handleShopVoiceInput(form));
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitButton = form.querySelector('button[type="submit"]');
    const body = Object.fromEntries(new FormData(form).entries());
    try {
      setButtonLoading(submitButton, true, 'Saving...');
      const updated = await SheMarket.request('/api/auth/me', {
        method: 'PUT',
        body
      });
      SheMarket.setAuth(SheMarket.getToken(), updated);
      SheMarket.toast('Shop location saved.', 'success');
      bindShopLocationForm(updated);
    } catch (error) {
      SheMarket.toast(error.message, 'error');
    } finally {
      setButtonLoading(submitButton, false);
    }
  });
}

async function handleShopVoiceInput(form) {
  const button = document.querySelector('#shop-location-mic');
  const status = document.querySelector('#shop-voice-status');
  try {
    setButtonLoading(button, true, 'Listening...');
    if (status) status.textContent = SheMarket.translatePhrase('Listening...');
    const speech = await captureSpeech(SheMarket.getLanguage(), {
      setStatus: (_state, message) => {
        if (status) status.textContent = SheMarket.translatePhrase(message);
      },
      fallbackLabel: 'Voice capture is not supported. Please use Chrome microphone access or type the shop details manually.'
    });
    if (status) status.textContent = SheMarket.translatePhrase('Processing speech...');
    const transcriptData = await SheMarket.request('/api/ai/voice-to-text', {
      method: 'POST',
      body: {
        text_hint: speech.transcript,
        audio_data_url: speech.audioDataUrl,
        language_hint: SheMarket.getLanguage(),
        language_code: voiceLanguageCode(SheMarket.getLanguage())
      }
    });
    const transcript = transcriptData.text || speech.transcript;
    if (!transcript) throw new Error('No voice text captured.');
    if (status) status.textContent = SheMarket.translatePhrase('Extracting shop details...');
    const details = await SheMarket.request('/api/ai/extract-shop-location', {
      method: 'POST',
      body: {
        transcript,
        language: SheMarket.getLanguageCode()
      }
    });
    fillShopLocationForm(form, details);
    SheMarket.toast('Shop details filled. Please review before saving.', 'success');
  } catch (error) {
    if (status) status.textContent = SheMarket.translatePhrase(error.message || 'Could not capture shop details.');
    SheMarket.toast(error.message || 'Could not capture shop details.', 'error');
  } finally {
    setButtonLoading(button, false);
  }
}

function fillShopLocationForm(form, details) {
  const map = {
    shopName: details.shop_name,
    shopPhone: details.shop_phone,
    shopAddress: details.shop_address,
    shopCity: details.city,
    shopState: details.state,
    shopPIN: details.pincode,
    shopHours: details.shop_hours,
    googleMapsLink: details.google_maps_link
  };
  const filled = [];
  Object.entries(map).forEach(([field, value]) => {
    if (form.elements[field] && value) {
      form.elements[field].value = value;
      filled.push(field);
    }
  });
  const status = document.querySelector('#shop-voice-status');
  if (status) {
    status.textContent = filled.length
      ? SheMarket.translatePhrase(`Filled: ${filled.join(', ')}. Please review before saving.`)
      : SheMarket.translatePhrase('Could not extract details. Please type them manually.');
  }
}

function renderTopProducts(products) {
  const node = document.querySelector('#top-products-list');
  if (!node) return;

  node.innerHTML = products.length
    ? products.map((product) => {
      const display = SheMarket.localizeProduct(product);
      return `
        <div class="summary-row top-product-row">
          <span>${SheMarket.escapeHtml(display.display_name || product.name)}</span>
          <strong>${product.orders_count || 0} ${SheMarket.t('orders')}</strong>
        </div>
      `;
    }).join('')
    : '<div class="empty-state">Top products appear after orders come in.</div>';
}

function sellerOrderRow(order) {
  const product = order.product_id || {};
  const displayProduct = SheMarket.localizeProduct(product);
  const statuses = order.isPickup
    ? ['Confirmed', 'Ready for Pickup', 'Picked Up']
    : ['Pending', 'Shipped', 'Delivered', 'Cancelled'];
  return `
    <tr>
      <td>${SheMarket.escapeHtml(displayProduct.display_name || 'Product')} ${order.isPickup ? '<span class="tag">PICKUP</span>' : ''}</td>
      <td>${SheMarket.escapeHtml(order.buyer_id?.name || SheMarket.translatePhrase('Buyer'))}</td>
      <td>${order.quantity}</td>
      <td>${SheMarket.formatCurrency(order.total_price)}</td>
      <td><span class="status ${String(order.status).toLowerCase()}">${SheMarket.escapeHtml(SheMarket.translatePhrase(order.status))}</span></td>
      <td>
        <select data-status-order="${order._id}">
          ${statuses.map((status) => `
            <option value="${status}" ${status === order.status ? 'selected' : ''}>${SheMarket.translatePhrase(status)}</option>
          `).join('')}
        </select>
      </td>
    </tr>
  `;
}

function renderChart(canvasId, type, labels, values, label, options = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !window.Chart) return;

  if (sellerCharts[canvasId]) sellerCharts[canvasId].destroy();
  const parent = canvas.parentElement;

  if (!labels.length || !values.length) {
    if (!parent.querySelector('.empty-state')) {
      canvas.classList.add('hide');
      parent.insertAdjacentHTML('beforeend', '<div class="empty-state">Chart appears after shipped or delivered orders are recorded.</div>');
    }
    SheMarket.translateStaticText(parent);
    return;
  }

  canvas.classList.remove('hide');
  // Ensure the parent container has a height so Chart.js responsive mode works correctly.
  if (parent && !parent.style.height) {
    parent.style.position = 'relative';
    parent.style.height = `${canvas.getAttribute('height') || 280}px`;
  }
  parentRemoveEmpty(parent);
  const chartValues = values.map((value) => Number(value) || 0);
  sellerCharts[canvasId] = new Chart(canvas, {
    type,
    data: {
      labels,
      datasets: [
        {
          label,
          data: chartValues,
          borderColor: '#C15A2B',
          backgroundColor: type === 'line' ? 'rgba(244, 163, 0, 0.18)' : 'rgba(95, 127, 58, 0.56)',
          pointBackgroundColor: '#C15A2B',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: type === 'line' ? 4 : 0,
          borderWidth: 3,
          tension: 0.35,
          fill: type === 'line',
          borderRadius: 10,
          maxBarThickness: 58
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#3B1F0C',
          padding: 12,
          callbacks: {
            label(context) {
              const value = context.parsed.y || 0;
              return `${context.dataset.label}: ${options.currency ? SheMarket.formatCurrency(value) : value}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0,
            callback(value) {
              return options.currency ? SheMarket.formatCurrency(value).replace('.00', '') : value;
            }
          },
          grid: { color: 'rgba(236, 221, 203, 0.72)' }
        },
        x: {
          grid: { display: false },
          ticks: {
            maxRotation: 0,
            autoSkip: false,
            callback(value) {
              const labelValue = this.getLabelForValue(value);
              return String(labelValue).length > 14 ? `${String(labelValue).slice(0, 13)}...` : labelValue;
            }
          }
        }
      }
    }
  });
}

function parentRemoveEmpty(parent) {
  parent?.querySelectorAll('.empty-state').forEach((node) => node.remove());
}

function setButtonLoading(button, loading, label = '') {
  if (!button) return;
  if (!button.dataset.originalHtml) button.dataset.originalHtml = button.innerHTML;
  button.disabled = loading;
  button.classList.toggle('is-loading', loading);
  if (loading && label) {
    button.innerHTML = `<span class="button-spinner"></span>${SheMarket.translatePhrase(label)}`;
  } else if (!loading) {
    button.innerHTML = button.dataset.originalHtml;
    if (window.lucide) window.lucide.createIcons();
  }
}

function setText(id, value) {
  const node = document.getElementById(id);
  if (node) node.textContent = value;
}

function skeletonCards(count) {
  return Array.from({ length: count }, () => `
    <article class="product-card skeleton-card">
      <div class="skeleton-block image"></div>
      <div class="product-body">
        <div class="skeleton-line short"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line"></div>
      </div>
    </article>
  `).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  runBuyerPage();
});

window.addEventListener('shemarket:languagechange', () => {
  runBuyerPage();
});

function runBuyerPage() {
  const page = document.body.dataset.page;
  const user = SheMarket.getUser();

  const purchaseOnlyPages = ['cart', 'checkout', 'buyer-orders'];
  if (user && user.role === 'seller' && purchaseOnlyPages.includes(page)) {
    SheMarket.toast('Sellers cannot make purchases.', 'error');
    window.location.href = '/pages/seller-dashboard.html';
    return;
  }

  const handlers = {
    home: initHome,
    'product-details': loadProductDetails,
    cart: loadCart,
    checkout: loadCheckout,
    'buyer-orders': loadBuyerOrders,
    reviews: loadReviewsPage,
    'producer-profile': loadProducerProfile
  };

  if (['checkout', 'buyer-orders'].includes(page)) {
    const authUser = SheMarket.requireAuth(['buyer', 'admin']);
    if (!authUser) return;
  }

  handlers[page]?.();
}

async function initHome() {
  const grid = document.querySelector('#featured-products');
  const searchForm = document.querySelector('#search-form');
  const categorySelect = document.querySelector('#category-filter');
  const searchMode = document.querySelector('#search-mode');
  if (!grid || !searchForm) return;

  async function loadResults() {
    grid.innerHTML = skeletonCards(6);
    const params = new URLSearchParams();
    if (searchForm.elements.search.value) params.set('search', searchForm.elements.search.value);
    if (searchMode?.value !== 'producers' && categorySelect?.value) params.set('category', categorySelect.value);

    try {
      if (searchMode?.value === 'producers') {
        const producers = await SheMarket.request(`/api/auth/producers?${params.toString()}`, { auth: false });
        renderProducerGrid(grid, producers);
      } else {
        const products = await SheMarket.request(`/api/products?${params.toString()}`, { auth: false });
        const displayProducts = products.length ? products : SheMarket.demoProducts();
        renderProductGrid(grid, displayProducts);
      }
    } catch (error) {
      renderProductGrid(grid, SheMarket.demoProducts());
    }
  }

  if (searchForm.dataset.bound !== 'true') {
    searchForm.dataset.bound = 'true';
    searchForm.addEventListener('submit', (event) => {
      event.preventDefault();
      loadResults();
    });
  }

  if (categorySelect && categorySelect.dataset.bound !== 'true') {
    categorySelect.dataset.bound = 'true';
    categorySelect.addEventListener('change', loadResults);
  }

  if (searchMode && searchMode.dataset.bound !== 'true') {
    searchMode.dataset.bound = 'true';
    searchMode.addEventListener('change', () => {
      if (categorySelect) categorySelect.classList.toggle('hide', searchMode.value === 'producers');
      loadResults();
    });
  }

  loadResults();
}

function renderProductGrid(grid, products) {
  grid.innerHTML = products.map((product) => SheMarket.productCard(product)).join('');
  SheMarket.bindAddToCart(products);
  SheMarket.translateStaticText(grid);
  if (window.lucide) window.lucide.createIcons();
}

function renderProducerGrid(grid, producers) {
  grid.innerHTML = producers.length
    ? producers.map(producerCard).join('')
    : '<div class="empty-state">No producers found.</div>';
  SheMarket.translateStaticText(grid);
  if (window.lucide) window.lucide.createIcons();
}

function producerCard(producer) {
  const shopName = producer.shopName || producer.name || 'SheMarket Producer';
  const rating = Number(producer.aggregateRating || 0).toFixed(1);
  return `
    <article class="product-card">
      <div class="product-media">
        <div class="profile-avatar" style="width:100%;height:100%;border-radius:0;">${SheMarket.escapeHtml((shopName || 'S').charAt(0).toUpperCase())}</div>
      </div>
      <div class="product-body">
        <div class="product-meta">
          <span class="tag">${producer.shopAddress ? 'Has Physical Shop' : 'Producer'}</span>
          <span class="muted">&#9733; ${rating}</span>
        </div>
        <h3>${SheMarket.escapeHtml(shopName)}</h3>
        <p class="muted">${SheMarket.escapeHtml(producer.name || 'Women producer')} · ${producer.productCount || 0} products</p>
        <p class="muted">${SheMarket.escapeHtml(`${producer.aggregateReviewCount || 0} reviews across ${producer.aggregateReviewedProductCount || 0} products`)}</p>
        <div class="inline-actions" style="margin-top: 0.9rem;">
          <a class="btn btn-outline btn-small" href="/pages/producer-profile.html?id=${SheMarket.escapeHtml(producer._id)}">${SheMarket.escapeHtml(SheMarket.t('view'))}</a>
        </div>
      </div>
    </article>
  `;
}

async function loadProductDetails() {
  const id = SheMarket.getQuery('id');
  const detail = document.querySelector('#product-detail');
  const similar = document.querySelector('#similar-products');
  if (!detail) return;

  if (!id) {
    detail.innerHTML = '<div class="empty-state">Choose a product from the home page.</div>';
    SheMarket.translateStaticText(detail);
    return;
  }

  detail.innerHTML = '<div class="skeleton-block media"></div><div class="skeleton-block panel"></div>';

  try {
    const product = await SheMarket.request(`/api/products/${id}`, { auth: false });
    const display = SheMarket.localizeProduct(product);
    const seller = product.seller_id || {};
    const user = SheMarket.getUser();
    const isSeller = user && user.role === 'seller';
    const sellerLabel = seller.shopName || seller.name || SheMarket.translatePhrase('SHG seller');
    const mapsUrl = shopMapsUrl(seller);
    const sellerHtml = seller._id
      ? `<a href="/pages/producer-profile.html?id=${seller._id}">${SheMarket.escapeHtml(sellerLabel)}</a>`
      : SheMarket.escapeHtml(sellerLabel);
    document.querySelector('#seller-view-banner')?.remove();
    detail.innerHTML = `
      <div class="detail-media">${SheMarket.productMedia(product, true)}</div>
      <div class="panel">
        <span class="tag">${SheMarket.escapeHtml(display.display_category)}</span>
        <h1 class="detail-title">${SheMarket.escapeHtml(display.display_name)}</h1>
        <p class="muted">${SheMarket.escapeHtml(display.display_description)}</p>
        <p class="price detail-price">${SheMarket.formatCurrency(product.price)}</p>
        <p><strong>${SheMarket.t('seller')}:</strong> ${sellerHtml} ${seller.shopAddress ? '<span class="tag">Has Physical Shop</span>' : ''}</p>
        <p><strong>${SheMarket.t('rating')}:</strong> &#9733; ${product.rating || 0} &middot; <strong>${SheMarket.t('views')}:</strong> ${product.views_count || 0}</p>
        <div class="inline-actions">
          ${!isSeller ? `<button class="btn btn-primary" id="detail-add-cart"><i data-lucide="shopping-cart"></i>${SheMarket.t('addToCart')}</button>` : ''}
          <a class="btn btn-outline" href="/pages/reviews.html?product_id=${product._id}">${SheMarket.t('reviews')}</a>
          ${mapsUrl ? `<a class="btn btn-outline" href="${SheMarket.escapeHtml(mapsUrl)}" target="_blank" rel="noopener"><i data-lucide="map-pin"></i>${SheMarket.escapeHtml(SheMarket.translatePhrase('View Shop Location'))}</a>` : ''}
        </div>
      </div>
    `;

    document.querySelector('#detail-add-cart')?.addEventListener('click', () => SheMarket.addToCart(product));
    if (isSeller) {
      const banner = document.createElement('div');
      banner.id = 'seller-view-banner';
      banner.className = 'panel';
      banner.style.cssText = 'background:var(--leaf);color:#fff;padding:0.75rem 1rem;border-radius:8px;margin-bottom:1rem;';
      banner.textContent = 'You are viewing this product as a seller. Purchasing is only available to buyers.';
      document.querySelector('.container')?.prepend(banner);
    }
    if (window.lucide) window.lucide.createIcons();
    SheMarket.translateStaticText(detail);

    await loadSimilarProducts(product, similar);
  } catch (error) {
    detail.innerHTML = '<div class="empty-state">Product not found.</div>';
    SheMarket.toast(error.message, 'error');
  }
}

async function loadProducerProfile() {
  const id = SheMarket.getQuery('id');
  const profile = document.querySelector('#producer-profile');
  const productsGrid = document.querySelector('#producer-products');
  if (!profile || !productsGrid) return;

  if (!id) {
    profile.innerHTML = '<div class="empty-state">Producer profile not found.</div>';
    return;
  }

  try {
    const data = await SheMarket.request(`/api/auth/producers/${id}`, { auth: false });
    const producer = data.producer || {};
    const shopName = producer.shopName || producer.name || 'SheMarket Producer';
    const address = formatShopAddress(producer);
    const mapsUrl = producer.googleMapsLink || `https://maps.google.com/?q=${encodeURIComponent([producer.shopAddress, producer.shopCity, producer.shopState].filter(Boolean).join(' '))}`;

    profile.innerHTML = `
      <div class="profile-hero">
        <div class="profile-avatar">${SheMarket.escapeHtml((shopName || 'S').charAt(0).toUpperCase())}</div>
        <div>
          <p class="muted">Producer profile</p>
          <h1>${SheMarket.escapeHtml(shopName)}</h1>
          <p class="muted">${SheMarket.escapeHtml(producer.name || '')}</p>
          <strong>&#9733; ${Number(producer.aggregateRating || 0).toFixed(1)} / 5 · ${producer.aggregateReviewCount || 0} reviews across ${producer.aggregateReviewedProductCount || 0} products</strong>
        </div>
      </div>
      ${producer.shopAddress ? `
        <div class="profile-grid" style="margin-top: 1rem;">
          <div><span class="muted">Shop Address</span><strong>${SheMarket.escapeHtml(address)}</strong></div>
          <div><span class="muted">Shop Hours</span><strong>${SheMarket.escapeHtml(producer.shopHours || 'Hours not added')}</strong></div>
          <div><span class="muted">Phone</span><strong>${SheMarket.escapeHtml(producer.shopPhone || 'Not added')}</strong></div>
        </div>
        <div class="inline-actions" style="margin-top: 1rem;">
          <a class="btn btn-primary" href="${SheMarket.escapeHtml(mapsUrl)}" target="_blank" rel="noopener"><i data-lucide="map-pin"></i>View Shop Location</a>
        </div>
      ` : ''}
    `;

    const products = (data.products || []).map((product) => ({ ...product, seller_id: producer }));
    renderProductGrid(productsGrid, products);
    SheMarket.translateStaticText(profile);
    if (window.lucide) window.lucide.createIcons();
  } catch (error) {
    profile.innerHTML = '<div class="empty-state">Producer profile not found.</div>';
    productsGrid.innerHTML = '';
  }
}

async function loadSimilarProducts(product, container) {
  if (!container) return;
  container.innerHTML = skeletonCards(3);

  try {
    const data = await SheMarket.request('/api/ai/recommend', {
      method: 'POST',
      auth: false,
      body: { product_id: product._id, category: product.category, language: SheMarket.getLanguage() }
    });
    const recommendations = data.recommendations?.length ? data.recommendations : SheMarket.demoProducts();
    renderProductGrid(container, recommendations);
  } catch (error) {
    renderProductGrid(container, SheMarket.demoProducts());
  }
}

function loadCart() {
  const list = document.querySelector('#cart-list');
  const totalNode = document.querySelector('#cart-total');
  if (!list || !totalNode) return;
  const cart = SheMarket.getCart();

  if (!cart.length) {
    list.innerHTML = '<div class="empty-state">Your cart is empty.</div>';
    totalNode.textContent = SheMarket.formatCurrency(0);
    SheMarket.translateStaticText(list);
    return;
  }

  list.innerHTML = cart.map((item) => cartLine(item)).join('');
  totalNode.textContent = SheMarket.formatCurrency(cartTotal(cart));
  SheMarket.translateStaticText(list);
  if (window.lucide) window.lucide.createIcons();

  list.querySelectorAll('[data-cart-change]').forEach((input) => {
    input.addEventListener('change', () => {
      const next = SheMarket.getCart().map((item) => {
        if (item._id === input.dataset.cartChange) {
          item.quantity = Math.max(Number(input.value) || 1, 1);
        }
        return item;
      });
      SheMarket.setCart(next);
      loadCart();
    });
  });

  list.querySelectorAll('[data-remove-cart]').forEach((button) => {
    button.addEventListener('click', () => {
      SheMarket.setCart(SheMarket.getCart().filter((item) => item._id !== button.dataset.removeCart));
      loadCart();
    });
  });
}

async function loadCheckout() {
  let cart = SheMarket.getCart();
  const summary = document.querySelector('#checkout-summary');
  const payButton = document.querySelector('#pay-button');
  if (!summary || !payButton) return;
  cart = await enrichCartForPickup(cart);
  SheMarket.setCart(cart);
  const total = cartTotal(cart);
  const pickupAvailable = cart.length && cart.every((item) => item.seller_id?.shopAddress);
  const selectedFulfillment = () => document.querySelector('input[name="fulfillment"]:checked')?.value || 'delivery';

  function renderSummary() {
    const isPickup = selectedFulfillment() === 'pickup';
    summary.innerHTML = cart.length
      ? cart.map((item) => {
      const display = SheMarket.localizeProduct(item);
      const seller = item.seller_id || {};
      return `
        <div class="summary-row checkout-line">
          <span>${SheMarket.escapeHtml(display.display_name || item.name)} x ${item.quantity}</span>
          <strong>${SheMarket.formatCurrency(item.price * item.quantity)}</strong>
        </div>
        ${isPickup && seller.shopAddress ? `<p class="muted">Pickup: ${SheMarket.escapeHtml(formatShopAddress(seller))}${seller.shopHours ? ` · ${SheMarket.escapeHtml(seller.shopHours)}` : ''}</p>` : ''}
      `;
    }).join('') + `
      ${pickupAvailable ? `
        <div class="panel" style="margin-top: 1rem;">
          <strong>Fulfillment</strong>
          <div class="inline-actions" style="margin-top: 0.75rem;">
            <label><input type="radio" name="fulfillment" value="delivery" ${isPickup ? '' : 'checked'}> Delivery</label>
            <label><input type="radio" name="fulfillment" value="pickup" ${isPickup ? 'checked' : ''}> Pick Up from Shop</label>
          </div>
        </div>
      ` : ''}
      <div class="summary-row checkout-total"><strong>${SheMarket.t('total')}</strong><strong>${SheMarket.formatCurrency(total)}</strong></div>`
      : '<div class="empty-state">Add products to cart before checkout.</div>';
    SheMarket.translateStaticText(summary);
    summary.querySelectorAll('input[name="fulfillment"]').forEach((input) => {
      input.addEventListener('change', renderSummary);
    });
  }

  renderSummary();

  payButton.disabled = !cart.length;
  const freshButton = payButton.cloneNode(true);
  payButton.replaceWith(freshButton);
  freshButton.disabled = !cart.length;
  freshButton.addEventListener('click', async () => {
    freshButton.classList.add('is-loading');
    freshButton.disabled = true;
    try {
      const paymentData = await SheMarket.request('/api/payments/create-order', {
        method: 'POST',
        body: { amount: total }
      });
      await showQrPayment(paymentData, total, { isPickup: pickupAvailable && selectedFulfillment() === 'pickup' });
    } catch (error) {
      SheMarket.toast(error.message, 'error');
    } finally {
      freshButton.classList.remove('is-loading');
      freshButton.disabled = !SheMarket.getCart().length;
    }
  });
}

async function enrichCartForPickup(cart) {
  const next = await Promise.all(cart.map(async (item) => {
    if (item.seller_id?.shopAddress) return item;
    try {
      const product = await SheMarket.request(`/api/products/${item._id}`, { auth: false });
      return {
        ...item,
        name_i18n: product.name_i18n || item.name_i18n,
        category_i18n: product.category_i18n || item.category_i18n,
        description_i18n: product.description_i18n || item.description_i18n,
        tags_i18n: product.tags_i18n || item.tags_i18n,
        seller_id: product.seller_id || item.seller_id
      };
    } catch (error) {
      return item;
    }
  }));
  return next;
}

function formatShopAddress(seller = {}) {
  return [seller.shopAddress, seller.shopCity, seller.shopState, seller.shopPIN].filter(Boolean).join(', ');
}

function shopMapsUrl(seller = {}) {
  if (!seller.shopAddress && !seller.googleMapsLink) return '';
  if (seller.googleMapsLink) return seller.googleMapsLink;
  const query = [seller.shopAddress, seller.shopCity, seller.shopState, seller.shopPIN].filter(Boolean).join(' ');
  return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : '';
}

function showQrPayment(paymentData, total, fulfillment = {}) {
  const modal = document.querySelector('#qr-payment-modal');
  const qr = document.querySelector('#qr-code');
  const amount = document.querySelector('#qr-amount');
  const upi = document.querySelector('#qr-upi');
  const transaction = document.querySelector('#qr-transaction');
  const countdown = document.querySelector('#qr-countdown');
  const confirm = document.querySelector('#confirm-qr-payment');
  const close = document.querySelector('[data-close-qr]');
  const state = document.querySelector('[data-payment-state]');
  const title = document.querySelector('#qr-payment-title');

  if (!modal || !qr || !confirm) {
    return completePayment(paymentData.payment_id, {
      razorpay_order_id: paymentData.order.id,
      razorpay_payment_id: `pay_mock_${Date.now()}`,
      razorpay_signature: 'mock_signature'
    }, { isPickup: fulfillment.isPickup });
  }

  const transactionData = buildTransactionData(paymentData, total);
  amount.textContent = SheMarket.formatCurrency(total);
  upi.textContent = transactionData.upiId;
  transaction.textContent = transactionData.transactionId;
  title.textContent = SheMarket.translatePhrase('Scan Razorpay QR');
  state.className = 'payment-state';
  state.innerHTML = `<span class="payment-spinner"></span><span>${SheMarket.translatePhrase('Waiting for Payment')}</span>`;
  confirm.classList.remove('hide');
  confirm.innerHTML = `<i data-lucide="refresh-cw"></i>${SheMarket.t('retry')}`;

  renderQr(qr, transactionData.payload);
  modal.classList.remove('hide');
  if (window.lucide) window.lucide.createIcons();

  return new Promise((resolve) => {
    let secondsLeft = 120;
    let settled = false;
    countdown.textContent = formatCountdown(secondsLeft);

    const interval = setInterval(() => {
      secondsLeft -= 1;
      countdown.textContent = formatCountdown(secondsLeft);
      if (secondsLeft <= 0 && !settled) {
        settled = true;
        clearInterval(interval);
        clearTimeout(successTimer);
        state.className = 'payment-state error';
        state.innerHTML = `<span>${SheMarket.translatePhrase('Payment timed out. Try again')}</span>`;
      }
    }, 1000);

    const cleanup = () => {
      clearInterval(interval);
      clearTimeout(successTimer);
      modal.classList.add('hide');
      confirm.replaceWith(confirm.cloneNode(true));
      close?.replaceWith(close.cloneNode(true));
    };

    const successTimer = setTimeout(async () => {
      if (settled) return;
      settled = true;
      clearInterval(interval);
      state.className = 'payment-state success';
      state.innerHTML = `<i data-lucide="check-circle"></i><span>${SheMarket.translatePhrase('Payment received. Confirming order...')}</span>`;
      qr.innerHTML = '<div class="success-animation"><i data-lucide="check"></i></div>';
      confirm.classList.add('hide');
      if (window.lucide) window.lucide.createIcons();

      await completePayment(paymentData.payment_id, {
        razorpay_order_id: paymentData.order.id,
        razorpay_payment_id: `pay_qr_${transactionData.transactionId.toLowerCase()}`,
        razorpay_signature: 'mock_qr_signature'
      }, {
        transactionId: transactionData.transactionId,
        upiId: transactionData.upiId,
        amount: total,
        modal,
        isPickup: fulfillment.isPickup
      });
      resolve();
    }, 7000 + Math.floor(Math.random() * 2500));

    confirm.addEventListener('click', () => {
      clearInterval(interval);
      clearTimeout(successTimer);
      showQrPayment(paymentData, total, fulfillment).then(resolve);
    }, { once: true });

    close?.addEventListener('click', () => {
      cleanup();
      resolve();
    }, { once: true });
  });
}

function buildTransactionData(paymentData, total) {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  const transactionId = paymentData.qr?.transaction_id || `SM${Date.now().toString().slice(-8)}${random}`;
  const upiId = paymentData.qr?.upi_id || `shemarket.${random.toLowerCase()}@razorpay`;
  const payload = paymentData.qr?.payload || `upi://pay?pa=${encodeURIComponent(upiId)}&pn=SheMarket&am=${Number(total).toFixed(2)}&cu=INR&tr=${encodeURIComponent(transactionId)}&tn=${encodeURIComponent('SheMarket order')}`;
  return { transactionId, upiId, payload };
}

function renderQr(container, payload) {
  container.innerHTML = '';
  if (window.QRCode?.toCanvas) {
    const canvas = document.createElement('canvas');
    window.QRCode.toCanvas(canvas, payload, {
      width: 240,
      margin: 1,
      color: {
        dark: '#1f1208',
        light: '#ffffff'
      }
    }, (error) => {
      if (error) {
        container.innerHTML = generateQrSvg(payload);
      } else {
        container.appendChild(canvas);
      }
    });
    return;
  }
  container.innerHTML = generateQrSvg(payload);
}

function generateQrSvg(value) {
  let seed = 0;
  for (let i = 0; i < value.length; i += 1) seed = (seed * 33 + value.charCodeAt(i)) >>> 0;
  const size = 29;
  const cell = 8;
  const modules = [];

  function finder(x, y) {
    const topLeft = x < 7 && y < 7;
    const topRight = x >= size - 7 && y < 7;
    const bottomLeft = x < 7 && y >= size - 7;
    if (!topLeft && !topRight && !bottomLeft) return false;
    const localX = topRight ? x - (size - 7) : x;
    const localY = bottomLeft ? y - (size - 7) : y;
    return localX === 0 || localY === 0 || localX === 6 || localY === 6 || (localX >= 2 && localX <= 4 && localY >= 2 && localY <= 4);
  }

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const bit = finder(x, y) || (((seed + x * 17 + y * 29 + x * y * 7 + (x ^ y)) % 6) < 3);
      if (bit) modules.push(`<rect x="${x * cell}" y="${y * cell}" width="${cell}" height="${cell}" rx="1"/>`);
    }
  }
  return `<svg viewBox="0 0 ${size * cell} ${size * cell}" role="img" aria-label="Generated QR code"><rect width="${size * cell}" height="${size * cell}" fill="#fff"/> <g fill="#1f1208">${modules.join('')}</g></svg>`;
}

async function completePayment(paymentId, response, receipt = null) {
  await SheMarket.request('/api/payments/verify', {
    method: 'POST',
    body: {
      payment_id: paymentId,
      ...response
    }
  });

  const cart = SheMarket.getCart();
  const orders = await Promise.all(cart.map((item) => SheMarket.request('/api/orders/create', {
    method: 'POST',
    body: {
      product_id: item._id,
      quantity: item.quantity,
      isPickup: Boolean(receipt?.isPickup && item.seller_id?.shopAddress)
    }
  })));

  SheMarket.setCart([]);
  SheMarket.toast('Payment successful. Orders created.', 'success');
  if (receipt?.modal) renderReceipt(receipt, orders);

  setTimeout(() => {
    location.href = '/pages/buyer-orders.html';
  }, receipt ? 2200 : 900);
}

function renderReceipt(receipt, orders) {
  const pickupOrders = orders.filter((order) => order.isPickup);
  const sheet = receipt.modal.querySelector('.payment-sheet');
  sheet.innerHTML = `
    <div class="receipt-screen">
      <div class="success-animation"><i data-lucide="check"></i></div>
      <h2>${SheMarket.t('orderConfirmed')}</h2>
      <p class="muted">${SheMarket.translatePhrase('Secure UPI payment powered by Razorpay Test Mode.')}</p>
      <div class="payment-meta">
        <div><span>${SheMarket.t('amount')}</span><strong>${SheMarket.formatCurrency(receipt.amount)}</strong></div>
        <div><span>${SheMarket.t('transactionId')}</span><strong>${SheMarket.escapeHtml(receipt.transactionId)}</strong></div>
        <div><span>${SheMarket.t('upiId')}</span><strong>${SheMarket.escapeHtml(receipt.upiId)}</strong></div>
        <div><span>${SheMarket.t('orders')}</span><strong>${orders.length}</strong></div>
      </div>
      ${pickupOrders.length ? `
        <div class="payment-meta" style="margin-top: 1rem;">
          ${pickupOrders.map((order) => `
            <div><span>Pickup</span><strong>${SheMarket.escapeHtml(order.pickupShopAddress || order.seller_id?.shopAddress || '')}${order.pickupShopHours ? ` · ${SheMarket.escapeHtml(order.pickupShopHours)}` : ''}</strong></div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;
  if (window.lucide) window.lucide.createIcons();
}

async function loadBuyerOrders() {
  const body = document.querySelector('#buyer-orders-body');
  if (!body) return;
  body.innerHTML = '<tr><td colspan="5"><div class="skeleton-line"></div></td></tr>';

  try {
    const orders = await SheMarket.request('/api/orders');
    renderOrderNotifications(orders);
    body.innerHTML = orders.length
      ? orders.map((order) => {
        const displayProduct = SheMarket.localizeProduct(order.product_id || {});
        return `
          <tr>
            <td>${SheMarket.escapeHtml(displayProduct.display_name || 'Product')} ${order.isPickup ? '<span class="tag">PICKUP</span>' : ''}${order.isPickup && order.pickupShopAddress ? `<p class="muted">${SheMarket.escapeHtml(order.pickupShopAddress)}${order.pickupShopHours ? ` · ${SheMarket.escapeHtml(order.pickupShopHours)}` : ''}</p>` : ''}</td>
            <td>${order.quantity}</td>
            <td>${SheMarket.formatCurrency(order.total_price)}</td>
            <td>
              <span class="status ${String(order.status).toLowerCase()}">${SheMarket.escapeHtml(SheMarket.translatePhrase(order.status))}</span>
              ${order.notification_message ? `<p class="muted">${SheMarket.escapeHtml(order.notification_message)}</p>` : ''}
            </td>
            <td>${new Date(order.created_at).toLocaleDateString(SheMarket.getLocale())}</td>
          </tr>
        `;
      }).join('')
      : '<tr><td colspan="5">No orders yet.</td></tr>';
    SheMarket.translateStaticText(body);
  } catch (error) {
    body.innerHTML = '<tr><td colspan="5">Unable to load orders.</td></tr>';
    SheMarket.toast(error.message, 'error');
  }

  if (!window._orderPollInterval) {
    window._orderPollInterval = setInterval(() => {
      if (document.body.dataset.page === 'buyer-orders') {
        loadBuyerOrders();
      } else {
        clearInterval(window._orderPollInterval);
        window._orderPollInterval = null;
      }
    }, 30000);
  }
}

function renderOrderNotifications(orders) {
  const container = document.querySelector('#order-notifications') || createNotificationContainer();
  if (!container) return;

  const notifications = (orders || []).filter((order) => order.notification_message);
  if (!notifications.length) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = notifications.map((order) => {
    const displayProduct = SheMarket.localizeProduct(order.product_id || {});
    return `
      <div class="panel" style="background:var(--leaf);color:#fff;padding:0.75rem 1rem;border-radius:8px;margin-bottom:0.5rem;">
        <strong>Order Update:</strong> ${SheMarket.escapeHtml(order.notification_message)}
        <span class="muted" style="color:rgba(255,255,255,0.8);margin-left:0.5rem;">
          - ${SheMarket.escapeHtml(displayProduct.display_name || 'Product')}
        </span>
      </div>
    `;
  }).join('');
}

function createNotificationContainer() {
  const div = document.createElement('div');
  div.id = 'order-notifications';
  div.style.marginBottom = '1rem';
  const main = document.querySelector('.app-main') || document.querySelector('.container');
  main?.prepend(div);
  return div;
}

async function loadReviewsPage() {
  const productId = SheMarket.getQuery('product_id');
  const form = document.querySelector('#review-form');
  const list = document.querySelector('#reviews-list');
  const title = document.querySelector('#review-product-title');
  if (!list || !form) return;

  const currentUser = SheMarket.getUser();
  const canReview = currentUser && ['buyer', 'admin'].includes(currentUser.role);
  if (!canReview) {
    form.style.display = 'none';
  } else {
    form.style.display = '';
  }

  if (!productId) {
    list.innerHTML = '<div class="empty-state">Open reviews from a product detail page.</div>';
    form.classList.add('hide');
    SheMarket.translateStaticText(list);
    return;
  }

  async function refresh() {
    try {
      const [product, reviews] = await Promise.all([
        SheMarket.request(`/api/products/${productId}`, { auth: false }),
        SheMarket.request(`/api/reviews/${productId}`, { auth: false })
      ]);
      const display = SheMarket.localizeProduct(product);
      title.textContent = display.display_name || product.name;
      list.innerHTML = reviews.length
        ? reviews.map((review) => `
          <div class="panel">
            <strong>&#9733; ${review.rating} &middot; ${SheMarket.escapeHtml(review.buyer_id?.name || SheMarket.translatePhrase('Buyer'))}</strong>
            <p class="muted">${SheMarket.escapeHtml(review.comment || SheMarket.translatePhrase('No comment added.'))}</p>
          </div>
        `).join('')
        : '<div class="empty-state">No reviews yet. Be the first buyer to share feedback.</div>';
      SheMarket.translateStaticText(list);
    } catch (error) {
      SheMarket.toast(error.message, 'error');
    }
  }

  if (canReview && form.dataset.bound !== 'true') {
    form.dataset.bound = 'true';
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(form);

      try {
        await SheMarket.request('/api/reviews/add', {
          method: 'POST',
          body: {
            product_id: productId,
            rating: Number(formData.get('rating')),
            comment: formData.get('comment')
          }
        });
        form.reset();
        SheMarket.toast('Review saved.', 'success');
        refresh();
      } catch (error) {
        SheMarket.toast(error.message, 'error');
      }
    });
  }

  refresh();
}

function cartLine(item) {
  const display = SheMarket.localizeProduct(item);
  return `
    <div class="cart-line">
      <div>
        <strong>${SheMarket.escapeHtml(display.display_name || item.name)}</strong>
        <p class="muted">${SheMarket.escapeHtml(display.display_category || 'Handmade')}</p>
      </div>
      <input class="search-input" style="width: 90px;" type="number" min="1" value="${item.quantity}" data-cart-change="${item._id}">
      <strong>${SheMarket.formatCurrency(item.price * item.quantity)}</strong>
      <button class="btn btn-outline btn-icon" data-remove-cart="${item._id}" aria-label="Remove item"><i data-lucide="trash-2"></i></button>
    </div>
  `;
}

function cartTotal(cart) {
  return cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0);
}

function formatCountdown(seconds) {
  const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');
  return `${mins}:${secs}`;
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

const { ensureProductImage } = require('./imageMapper');
const { fallbackProductI18n } = require('./language');

function plain(record) {
  return record && typeof record.get === 'function' ? record.get({ plain: true }) : record;
}

function money(value) {
  return value === null || value === undefined ? value : Number(value);
}

function serializeUser(user) {
  const data = plain(user);
  if (!data) return data;
  delete data.password;
  data.shop_name = data.shopName || null;
  data.shop_phone = data.shopPhone || null;
  data.shop_address = data.shopAddress || null;
  data.city = data.shopCity || null;
  data.state = data.shopState || null;
  data.pincode = data.shopPIN || null;
  data.shop_hours = data.shopHours || null;
  data.google_maps_link = data.googleMapsLink || null;
  return data;
}

function serializeProduct(product) {
  const data = plain(product);
  if (!data) return data;

  data.price = money(data.price);
  data.recommended_price = money(data.recommended_price);
  data.raw_material_cost = money(data.raw_material_cost);
  data.labour_cost = money(data.labour_cost);
  data.packaging_cost = money(data.packaging_cost);
  data.image_url = ensureProductImage(data);
  const i18n = fallbackProductI18n(data);
  data.name_i18n = completeI18n(data.name_i18n, i18n.name_i18n);
  data.category_i18n = completeI18n(data.category_i18n, i18n.category_i18n);
  data.description_i18n = completeI18n(data.description_i18n, i18n.description_i18n);
  data.tags_i18n = completeI18n(data.tags_i18n, i18n.tags_i18n, true);

  if (data.seller) {
    data.seller_id = serializeUser(data.seller);
    delete data.seller;
  }

  return data;
}

function completeI18n(current, fallback, isList = false) {
  const base = current && typeof current === 'object' ? current : {};
  return ['en', 'hi', 'kn'].reduce((result, code) => {
    const value = base[code];
    result[code] = isUsableLocalizedValue(value, code, isList) ? value : fallback[code];
    return result;
  }, {});
}

function isUsableLocalizedValue(value, code, isList) {
  if (isList) {
    return Array.isArray(value)
      && value.length > 0
      && !value.some((item) => hasWrongScript(item, code) || (code !== 'en' && isMostlyLatin(item)));
  }
  return typeof value === 'string'
    && value.trim()
    && !hasWrongScript(value, code)
    && !(code !== 'en' && isMostlyLatin(value));
}

function hasWrongScript(value, code) {
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

function serializeOrder(order) {
  const data = plain(order);
  if (!data) return data;

  data.total_price = money(data.total_price);

  if (data.product) {
    data.product_id = serializeProduct(data.product);
    delete data.product;
  }

  if (data.buyer) {
    data.buyer_id = serializeUser(data.buyer);
    delete data.buyer;
  }

  if (data.seller) {
    data.seller_id = serializeUser(data.seller);
    delete data.seller;
  }

  return data;
}

function serializeReview(review) {
  const data = plain(review);
  if (!data) return data;

  if (data.buyer) {
    data.buyer_id = serializeUser(data.buyer);
    delete data.buyer;
  }

  return data;
}

function serializePayment(payment) {
  const data = plain(payment);
  if (!data) return data;
  data.amount = money(data.amount);
  return data;
}

function serializeShgGroup(group) {
  const data = plain(group);
  if (!data) return data;

  if (data.members) {
    data.members = data.members.map(serializeUser);
  }

  if (data.products) {
    data.products = data.products.map(serializeProduct);
  }

  return data;
}

module.exports = {
  serializeOrder,
  serializePayment,
  serializeProduct,
  serializeReview,
  serializeShgGroup,
  serializeUser
};

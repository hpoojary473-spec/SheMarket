const { Op } = require('sequelize');
const Product = require('../models/Product');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { serializeProduct } = require('../utils/serializers');
const { productImageDataUrl } = require('../utils/imageMapper');
const { fallbackProductI18n, normalizeCategory, normalizeLanguageCode } = require('../utils/language');

const productFields = [
  'name',
  'category',
  'description',
  'tags',
  'price',
  'recommended_price',
  'raw_material_cost',
  'labour_cost',
  'packaging_cost',
  'image_url'
];

const sellerInclude = {
  model: User,
  as: 'seller',
  attributes: [
    '_id',
    'name',
    'email',
    'language',
    'shg_group_id',
    'role',
    'is_approved',
    'shopName',
    'shopAddress',
    'shopCity',
    'shopState',
    'shopPIN',
    'shopPhone',
    'shopHours',
    'googleMapsLink',
    'aggregateRating',
    'aggregateReviewCount',
    'aggregateReviewedProductCount'
  ]
};

const addProduct = asyncHandler(async (req, res) => {
  const fields = pick(req.body, productFields);
  fields.category = normalizeCategory(fields.category);
  fields.tags = normalizeTags(fields.tags);
  const sourceLanguage = normalizeLanguageCode(req.body.language || req.body.source_language || req.body.language_code);
  const i18n = await buildProductI18n({
    name: fields.name,
    description: fields.description,
    category: fields.category,
    tags: fields.tags,
    sourceLanguage
  });
  fields.name_i18n = i18n.name_i18n;
  fields.category_i18n = i18n.category_i18n;
  fields.description_i18n = i18n.description_i18n;
  fields.tags_i18n = i18n.tags_i18n;

  if (!fields.image_url) {
    fields.image_url = productImageDataUrl(fields.category, fields.name);
  }

  const product = await Product.create({
    ...fields,
    seller_id: req.user._id,
    shg_group_id: req.user.shg_group_id || null
  });

  const createdProduct = await Product.findByPk(product._id, { include: [sellerInclude] });
  res.status(201).json(serializeProduct(createdProduct));
});

const listProducts = asyncHandler(async (req, res) => {
  const { category, search } = req.query;
  const where = {};

  if (category) {
    where.category = { [Op.like]: `%${category}%` };
  }

  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { description: { [Op.like]: `%${search}%` } },
      { category: { [Op.like]: `%${search}%` } }
    ];
  }

  const products = await Product.findAll({
    where,
    include: [sellerInclude],
    order: [['createdAt', 'DESC']]
  });

  res.json(products.map(serializeProduct));
});

const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByPk(req.params.id, { include: [sellerInclude] });

  if (!product) {
    return res.status(404).json({ message: 'Product not found.' });
  }

  await product.increment('views_count');
  await product.reload({ include: [sellerInclude] });

  res.json(serializeProduct(product));
});

const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByPk(req.params.id);

  if (!product) {
    return res.status(404).json({ message: 'Product not found.' });
  }

  if (req.user.role !== 'admin' && product.seller_id !== req.user._id) {
    return res.status(403).json({ message: 'You can update only your own products.' });
  }

  const fields = pick(req.body, productFields);
  if (fields.category !== undefined) fields.category = normalizeCategory(fields.category);
  if (fields.tags !== undefined) fields.tags = normalizeTags(fields.tags);
  await product.update(fields);
  if (req.body.name !== undefined || req.body.description !== undefined || req.body.category !== undefined || req.body.tags !== undefined) {
    const i18n = await buildProductI18n({
      name: fields.name ?? product.name,
      description: fields.description ?? product.description,
      category: fields.category ?? product.category,
      tags: fields.tags ?? product.tags,
      sourceLanguage: normalizeLanguageCode(req.body.language || req.body.source_language || req.body.language_code)
    });
    await product.update(i18n);
  }
  const updatedProduct = await Product.findByPk(product._id, { include: [sellerInclude] });

  res.json(serializeProduct(updatedProduct));
});

const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByPk(req.params.id);

  if (!product) {
    return res.status(404).json({ message: 'Product not found.' });
  }

  if (req.user.role !== 'admin' && product.seller_id !== req.user._id) {
    return res.status(403).json({ message: 'You can delete only your own products.' });
  }

  await product.destroy();
  res.json({ message: 'Product deleted.' });
});

function pick(source, allowedFields) {
  return allowedFields.reduce((result, field) => {
    if (source[field] !== undefined) {
      result[field] = source[field];
    }
    return result;
  }, {});
}

function normalizeTags(tags) {
  if (Array.isArray(tags)) return tags.map((tag) => String(tag || '').trim()).filter(Boolean);
  if (typeof tags === 'string') {
    return tags.split(',').map((tag) => tag.trim()).filter(Boolean);
  }
  return [];
}

async function buildProductI18n(product) {
  return fallbackProductI18n(product);
}

module.exports = {
  addProduct,
  listProducts,
  getProduct,
  updateProduct,
  deleteProduct
};

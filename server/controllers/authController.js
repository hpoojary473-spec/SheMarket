const User = require('../models/User');
const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');
const { serializeProduct, serializeUser } = require('../utils/serializers');
const { signToken } = require('../utils/token');
const { Op } = require('sequelize');

const profileFields = [
  'shopName',
  'shopAddress',
  'shopCity',
  'shopState',
  'shopPIN',
  'shopPhone',
  'shopHours',
  'googleMapsLink'
];

const register = asyncHandler(async (req, res) => {
  const { name, email, password, role = 'buyer', language = 'English', shg_group_id } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email and password are required.' });
  }

  const existingUser = await User.findOne({ where: { email: email.toLowerCase().trim() } });
  if (existingUser) {
    return res.status(409).json({ message: 'Email is already registered.' });
  }

  const user = await User.create({
    name,
    email,
    password,
    role,
    language: normalizeLanguage(language),
    shg_group_id: shg_group_id || null
  });

  res.status(201).json({
    token: signToken(user),
    user: serializeUser(user)
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const user = await User.unscoped().findOne({
    where: { email: email.toLowerCase().trim() }
  });

  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  res.json({
    token: signToken(user),
    user: serializeUser(user)
  });
});

const getMe = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.user._id);
  res.json(serializeUser(user));
});

const updateMe = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.user._id);
  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  const fields = pick(normalizeProfileBody(req.body), profileFields);
  if (!fields.googleMapsLink && (fields.shopAddress || user.shopAddress)) {
    fields.googleMapsLink = buildMapsLink(fields, user);
  }
  await user.update(fields);
  res.json(serializeUser(user));
});

const listProducers = asyncHandler(async (req, res) => {
  const search = String(req.query.search || '').trim();
  const where = { role: 'seller' };
  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { shopName: { [Op.like]: `%${search}%` } }
    ];
  }

  const producers = await User.findAll({
    where,
    attributes: [
      '_id',
      'name',
      'email',
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
    ],
    order: [['aggregateRating', 'DESC'], ['createdAt', 'DESC']]
  });

  const productCounts = await Promise.all(producers.map((producer) => (
    Product.count({ where: { seller_id: producer._id } })
  )));

  res.json(producers.map((producer, index) => ({
    ...serializeUser(producer),
    productCount: productCounts[index]
  })));
});

const getProducerProfile = asyncHandler(async (req, res) => {
  const producer = await User.findOne({
    where: { _id: req.params.id, role: 'seller' },
    attributes: [
      '_id',
      'name',
      'email',
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
  });

  if (!producer) {
    return res.status(404).json({ message: 'Producer not found.' });
  }

  const products = await Product.findAll({
    where: { seller_id: producer._id },
    order: [['createdAt', 'DESC']]
  });

  res.json({
    producer: serializeUser(producer),
    productCount: products.length,
    products: products.map(serializeProduct)
  });
});

function pick(source, allowedFields) {
  return allowedFields.reduce((result, field) => {
    if (source[field] !== undefined) {
      result[field] = source[field] === '' ? null : source[field];
    }
    return result;
  }, {});
}

function normalizeProfileBody(body = {}) {
  return {
    ...body,
    shopName: body.shopName ?? body.shop_name,
    shopPhone: body.shopPhone ?? body.shop_phone,
    shopAddress: body.shopAddress ?? body.shop_address,
    shopCity: body.shopCity ?? body.city,
    shopState: body.shopState ?? body.state,
    shopPIN: body.shopPIN ?? body.pincode,
    shopHours: body.shopHours ?? body.shop_hours,
    googleMapsLink: body.googleMapsLink ?? body.google_maps_link
  };
}

function buildMapsLink(fields, user) {
  const query = [
    fields.shopAddress || user.shopAddress,
    fields.shopCity || user.shopCity,
    fields.shopState || user.shopState,
    fields.shopPIN || user.shopPIN
  ].filter(Boolean).join(' ');
  return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : '';
}

module.exports = {
  register,
  login,
  getMe,
  updateMe,
  listProducers,
  getProducerProfile,
  sanitizeUser: serializeUser
};

function normalizeLanguage(language) {
  const value = String(language || '').trim().toLowerCase();
  if (value === 'hi' || value === 'hindi' || value === 'हिंदी') return 'Hindi';
  if (value === 'kn' || value === 'kannada' || value === 'ಕನ್ನಡ') return 'Kannada';
  return 'English';
}

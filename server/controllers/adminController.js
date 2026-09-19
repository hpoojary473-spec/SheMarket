const Product = require('../models/Product');
const ShgGroup = require('../models/ShgGroup');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { serializeShgGroup, serializeUser } = require('../utils/serializers');

const listSellers = asyncHandler(async (req, res) => {
  const sellers = await User.findAll({
    where: { role: 'seller' },
    order: [['createdAt', 'DESC']]
  });
  res.json(sellers.map(serializeUser));
});

const approveSeller = asyncHandler(async (req, res) => {
  const seller = await User.findOne({
    where: { _id: req.params.id, role: 'seller' }
  });

  if (!seller) {
    return res.status(404).json({ message: 'Seller not found.' });
  }

  await seller.update({ is_approved: true });
  res.json(serializeUser(seller));
});

const shgOverview = asyncHandler(async (req, res) => {
  const groups = await ShgGroup.findAll({
    include: [
      { model: User, as: 'members', attributes: ['_id', 'name', 'email', 'role', 'language'] },
      { model: Product, as: 'products', attributes: ['_id', 'name', 'category', 'price', 'orders_count'] }
    ]
  });

  res.json(groups.map(serializeShgGroup));
});

module.exports = { listSellers, approveSeller, shgOverview };

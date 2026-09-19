const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { serializeOrder } = require('../utils/serializers');

const orderIncludes = [
  { model: Product, as: 'product', attributes: ['_id', 'name', 'name_i18n', 'price', 'image_url', 'category', 'category_i18n', 'description', 'description_i18n', 'tags', 'tags_i18n'] },
  { model: User, as: 'buyer', attributes: ['_id', 'name', 'email'] },
  {
    model: User,
    as: 'seller',
    attributes: ['_id', 'name', 'email', 'shopName', 'shopAddress', 'shopCity', 'shopState', 'shopPIN', 'shopPhone', 'shopHours', 'googleMapsLink']
  }
];

const createOrder = asyncHandler(async (req, res) => {
  const { product_id, quantity = 1, isPickup = false } = req.body;

  const product = await Product.findByPk(product_id, {
    include: [{
      model: User,
      as: 'seller',
      attributes: ['shopAddress', 'shopCity', 'shopState', 'shopPIN', 'shopHours']
    }]
  });
  if (!product) {
    return res.status(404).json({ message: 'Product not found.' });
  }

  const safeQuantity = Math.max(Number(quantity) || 1, 1);
  const seller = product.seller || {};
  const pickupEnabled = Boolean(isPickup && seller.shopAddress);
  const pickupShopAddress = pickupEnabled
    ? [seller.shopAddress, seller.shopCity, seller.shopState, seller.shopPIN].filter(Boolean).join(', ')
    : null;

  const order = await Order.create({
    buyer_id: req.user._id,
    seller_id: product.seller_id,
    product_id: product._id,
    quantity: safeQuantity,
    total_price: Number(product.price) * safeQuantity,
    status: pickupEnabled ? 'Confirmed' : 'Pending',
    isPickup: pickupEnabled,
    pickupShopAddress,
    pickupShopHours: pickupEnabled ? seller.shopHours || null : null
  });

  await product.increment('orders_count', { by: safeQuantity });

  const createdOrder = await Order.findByPk(order._id, { include: orderIncludes });
  res.status(201).json(serializeOrder(createdOrder));
});

const listOrders = asyncHandler(async (req, res) => {
  const where = {};

  if (req.user.role === 'buyer') {
    where.buyer_id = req.user._id;
  }

  if (req.user.role === 'seller') {
    where.seller_id = req.user._id;
  }

  const orders = await Order.findAll({
    where,
    include: orderIncludes,
    order: [['created_at', 'DESC']]
  });

  res.json(orders.map(serializeOrder));
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  const order = await Order.findByPk(req.params.id);
  if (!order) {
    return res.status(404).json({ message: 'Order not found.' });
  }

  const allowedStatuses = order.isPickup
    ? ['Confirmed', 'Ready for Pickup', 'Picked Up']
    : ['Pending', 'Shipped', 'Delivered', 'Cancelled'];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid order status.' });
  }

  const ownsOrder = order.seller_id === req.user._id;
  if (req.user.role !== 'admin' && !ownsOrder) {
    return res.status(403).json({ message: 'You can update only your own incoming orders.' });
  }

  const notificationMessages = {
    Pending: 'Your order is pending seller confirmation.',
    Confirmed: 'Your pickup order has been confirmed by the seller.',
    Shipped: 'Your order has been shipped! It is on its way to you.',
    Delivered: 'Your order has been delivered. Enjoy your purchase!',
    'Ready for Pickup': "Your order is ready for pickup at the seller's shop.",
    'Picked Up': 'Your pickup order has been marked as picked up.',
    Cancelled: 'Your order has been cancelled. Contact the seller for details.'
  };
  const notification_message = notificationMessages[status] || `Your order status is now ${status}.`;

  await order.update({ status, notification_message });

  const updatedOrder = await Order.findByPk(order._id, { include: orderIncludes });
  res.json(serializeOrder(updatedOrder));
});

module.exports = { createOrder, listOrders, updateOrderStatus };

const Order = require('../models/Order');
const Product = require('../models/Product');
const ShgGroup = require('../models/ShgGroup');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const {
  serializeOrder,
  serializeProduct,
  serializeShgGroup,
  serializeUser
} = require('../utils/serializers');

const sellerDashboard = asyncHandler(async (req, res) => {
  const sellerId = req.user._id;

  const [totalProducts, orders, sellerProducts] = await Promise.all([
    Product.count({ where: { seller_id: sellerId } }),
    Order.findAll({
      where: { seller_id: sellerId },
      include: [{
        model: Product,
        as: 'product',
        attributes: ['_id', 'name', 'name_i18n', 'category', 'category_i18n', 'description', 'description_i18n', 'tags', 'tags_i18n', 'price', 'image_url', 'raw_material_cost', 'labour_cost', 'packaging_cost', 'rating']
      }],
      order: [['created_at', 'ASC']]
    }),
    Product.findAll({
      where: { seller_id: sellerId }
    })
  ]);

  const serializedOrders = orders.map(serializeOrder);
  const activeOrders = serializedOrders.filter((order) => order.status !== 'Cancelled');
  const revenue = activeOrders.reduce((sum, order) => sum + orderRevenue(order), 0);
  const productsSold = activeOrders.reduce((sum, order) => sum + Number(order.quantity || 0), 0);
  const averageRating = average(sellerProducts.map((product) => Number(product.rating || 0)).filter((rating) => rating > 0));
  const hasRealOrders = activeOrders.length > 0;

  res.json({
    totalProducts,
    totalOrders: orders.length,
    productsSold,
    totalProductsSold: productsSold,
    revenue,
    averageRating,
    salesTrend: buildSalesTrend(activeOrders),
    profitTrend: buildProfitTrend(activeOrders),
    topProducts: buildTopProducts(activeOrders),
    dataSource: hasRealOrders ? 'database' : 'demo',
    usingFallback: !hasRealOrders
  });
});

const adminDashboard = asyncHandler(async (req, res) => {
  const [users, products, orders, groups] = await Promise.all([
    User.findAll({ order: [['createdAt', 'DESC']] }),
    Product.findAll({
      include: [{ model: User, as: 'seller', attributes: ['_id', 'name', 'email'] }],
      order: [['createdAt', 'DESC']]
    }),
    Order.findAll({
      include: [
        { model: Product, as: 'product', attributes: ['_id', 'name'] },
        { model: User, as: 'seller', attributes: ['_id', 'name'] }
      ],
      order: [['created_at', 'DESC']]
    }),
    ShgGroup.findAll({
      include: [
        { model: User, as: 'members', attributes: ['_id', 'name', 'email', 'role', 'language'] },
        { model: Product, as: 'products', attributes: ['_id', 'name', 'category', 'price', 'orders_count'] }
      ]
    })
  ]);

  const serializedUsers = users.map(serializeUser);
  const sellers = serializedUsers.filter((user) => user.role === 'seller');
  const serializedOrders = orders.map(serializeOrder);
  const revenue = serializedOrders.reduce((sum, order) => {
    return order.status === 'Cancelled' ? sum : sum + Number(order.total_price || 0);
  }, 0);

  res.json({
    totalUsers: serializedUsers.length,
    totalSellers: sellers.length,
    pendingSellers: sellers.filter((seller) => !seller.is_approved).length,
    totalProducts: products.length,
    totalOrders: orders.length,
    revenue,
    users: serializedUsers,
    products: products.map(serializeProduct),
    orders: serializedOrders,
    groups: groups.map(serializeShgGroup)
  });
});

function buildSalesTrend(orders) {
  return buildWeeklyTrend(orders);
}

function buildProfitTrend(orders) {
  return buildWeeklyTrend(orders);
}

function buildWeeklyTrend(orders) {
  if (!orders.length) return [];

  const latestOrderDate = orders.reduce((latest, order) => {
    const date = new Date(order.created_at || order.createdAt || Date.now());
    return date > latest ? date : latest;
  }, new Date(0));
  const latestWeek = startOfWeek(latestOrderDate);
  const weeks = new Map();

  for (let offset = 5; offset >= 0; offset -= 1) {
    const week = new Date(latestWeek);
    week.setDate(latestWeek.getDate() - offset * 7);
    const key = week.toISOString().slice(0, 10);
    weeks.set(key, {
      label: `Week of ${week.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`,
      revenue: 0,
      profit: 0,
      sort: week.getTime()
    });
  }

  orders.forEach((order) => {
    const bucket = orderWeekBucket(order);
    const current = weeks.get(bucket.key) || { label: bucket.label, revenue: 0, profit: 0, sort: bucket.sort };
    current.revenue += orderRevenue(order);
    current.profit += orderProfit(order);
    weeks.set(bucket.key, current);
  });

  return [...weeks.values()]
    .sort((a, b) => a.sort - b.sort)
    .map(({ label, revenue, profit }) => ({
      label,
      revenue: Number(revenue.toFixed(2)),
      profit: Number(profit.toFixed(2))
    }));
}

function buildTopProducts(orders) {
  const byProduct = {};
  orders.forEach((order) => {
    const product = order.product_id || {};
    const id = product._id || order.product_id || 'product';
    const current = byProduct[id] || {
      _id: id,
      name: product.name || 'Product',
      name_i18n: product.name_i18n,
      category: product.category,
      category_i18n: product.category_i18n,
      description: product.description,
      description_i18n: product.description_i18n,
      tags: product.tags,
      tags_i18n: product.tags_i18n,
      orders: 0,
      orders_count: 0,
      quantitySold: 0,
      revenue: 0,
      profit: 0
    };
    const quantity = Number(order.quantity || 1);
    current.orders += 1;
    current.orders_count = current.orders;
    current.quantitySold += quantity;
    current.revenue += orderRevenue(order);
    current.profit += orderProfit(order);
    byProduct[id] = current;
  });

  return Object.values(byProduct)
    .sort((a, b) => b.revenue - a.revenue || b.orders - a.orders)
    .slice(0, 6);
}

function orderDateBucket(order) {
  const date = new Date(order.created_at || order.createdAt || Date.now());
  const key = date.toISOString().slice(0, 10);
  return {
    key,
    sort: date.setHours(0, 0, 0, 0),
    label: date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short'
    })
  };
}

function orderWeekBucket(order) {
  const week = startOfWeek(new Date(order.created_at || order.createdAt || Date.now()));
  const key = week.toISOString().slice(0, 10);
  return {
    key,
    sort: week.getTime(),
    label: `Week of ${week.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short'
    })}`
  };
}

function startOfWeek(date) {
  const week = new Date(date);
  week.setHours(0, 0, 0, 0);
  const day = week.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  week.setDate(week.getDate() + mondayOffset);
  return week;
}

function orderRevenue(order) {
  const product = order.product_id || {};
  const quantity = Number(order.quantity || 1);
  return Number(order.total_price || 0) || Number(product.price || 0) * quantity;
}

function orderProfit(order) {
  const product = order.product_id || {};
  const quantity = Number(order.quantity || 1);
  const selling = Number(order.total_price || 0) / quantity || Number(product.price || 0);
  const unitCost = Number(product.raw_material_cost || 0)
    + Number(product.labour_cost || 0)
    + Number(product.packaging_cost || 0);
  return Math.max(0, (selling - unitCost) * quantity);
}

function average(values) {
  if (!values.length) return 0;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1));
}

module.exports = { sellerDashboard, adminDashboard };

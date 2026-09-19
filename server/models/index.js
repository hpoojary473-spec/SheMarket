const User = require('./User');
const Product = require('./Product');
const Order = require('./Order');
const Review = require('./Review');
const Payment = require('./Payment');
const ShgGroup = require('./ShgGroup');

ShgGroup.hasMany(User, { foreignKey: 'shg_group_id', as: 'members' });
User.belongsTo(ShgGroup, { foreignKey: 'shg_group_id', as: 'shg_group' });

ShgGroup.hasMany(Product, { foreignKey: 'shg_group_id', as: 'products' });
Product.belongsTo(ShgGroup, { foreignKey: 'shg_group_id', as: 'shg_group' });

User.hasMany(Product, { foreignKey: 'seller_id', as: 'products' });
Product.belongsTo(User, { foreignKey: 'seller_id', as: 'seller' });

User.hasMany(Order, { foreignKey: 'buyer_id', as: 'buyer_orders' });
Order.belongsTo(User, { foreignKey: 'buyer_id', as: 'buyer' });

User.hasMany(Order, { foreignKey: 'seller_id', as: 'seller_orders' });
Order.belongsTo(User, { foreignKey: 'seller_id', as: 'seller' });

Product.hasMany(Order, { foreignKey: 'product_id', as: 'orders' });
Order.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

Product.hasMany(Review, { foreignKey: 'product_id', as: 'reviews' });
Review.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

User.hasMany(Review, { foreignKey: 'buyer_id', as: 'reviews' });
Review.belongsTo(User, { foreignKey: 'buyer_id', as: 'buyer' });

Order.hasMany(Payment, { foreignKey: 'order_id', as: 'payments' });
Payment.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

module.exports = {
  User,
  Product,
  Order,
  Review,
  Payment,
  ShgGroup
};

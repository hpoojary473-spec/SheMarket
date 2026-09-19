const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Order = sequelize.define(
  'Order',
  {
    _id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    buyer_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    seller_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    product_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    quantity: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    total_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('Pending', 'Shipped', 'Delivered', 'Cancelled', 'Confirmed', 'Ready for Pickup', 'Picked Up'),
      defaultValue: 'Pending'
    },
    isPickup: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    pickupShopAddress: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    pickupShopHours: {
      type: DataTypes.STRING,
      allowNull: true
    },
    notification_message: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  },
  {
    tableName: 'orders'
  }
);

module.exports = Order;

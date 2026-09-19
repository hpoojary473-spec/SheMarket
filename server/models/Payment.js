const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Payment = sequelize.define(
  'Payment',
  {
    _id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    order_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('created', 'paid', 'failed'),
      defaultValue: 'created'
    },
    razorpay_order_id: DataTypes.STRING,
    razorpay_payment_id: DataTypes.STRING,
    razorpay_signature: DataTypes.STRING
  },
  {
    tableName: 'payments'
  }
);

module.exports = Payment;

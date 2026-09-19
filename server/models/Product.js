const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Product = sequelize.define(
  'Product',
  {
    _id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    name_i18n: {
      type: DataTypes.JSON,
      allowNull: true
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false
    },
    category_i18n: {
      type: DataTypes.JSON,
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    description_i18n: {
      type: DataTypes.JSON,
      allowNull: true
    },
    tags: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    tags_i18n: {
      type: DataTypes.JSON,
      allowNull: true
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    recommended_price: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    raw_material_cost: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    labour_cost: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    packaging_cost: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    image_url: {
      type: DataTypes.TEXT('long'),
      defaultValue: ''
    },
    seller_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    shg_group_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    rating: {
      type: DataTypes.FLOAT,
      defaultValue: 0
    },
    orders_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    views_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  },
  {
    tableName: 'products'
  }
);

module.exports = Product;

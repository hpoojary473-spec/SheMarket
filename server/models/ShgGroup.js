const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ShgGroup = sequelize.define(
  'ShgGroup',
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
    location: {
      type: DataTypes.STRING,
      allowNull: false
    }
  },
  {
    tableName: 'shg_groups'
  }
);

module.exports = ShgGroup;

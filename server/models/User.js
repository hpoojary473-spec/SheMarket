const bcrypt = require('bcryptjs');
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const User = sequelize.define(
  'User',
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
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM('seller', 'buyer', 'admin'),
      defaultValue: 'buyer'
    },
    language: {
      type: DataTypes.STRING,
      defaultValue: 'English'
    },
    shg_group_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    is_approved: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    shopName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    shopAddress: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    shopCity: {
      type: DataTypes.STRING,
      allowNull: true
    },
    shopState: {
      type: DataTypes.STRING,
      allowNull: true
    },
    shopPIN: {
      type: DataTypes.STRING,
      allowNull: true
    },
    shopPhone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    shopHours: {
      type: DataTypes.STRING,
      allowNull: true
    },
    googleMapsLink: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    aggregateRating: {
      type: DataTypes.FLOAT,
      defaultValue: 0
    },
    aggregateReviewCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    aggregateReviewedProductCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  },
  {
    tableName: 'users',
    defaultScope: {
      attributes: { exclude: ['password'] }
    },
    scopes: {
      withPassword: {
        attributes: {}
      }
    },
    hooks: {
      beforeValidate(user) {
        if (user.email) user.email = user.email.toLowerCase().trim();
        user.language = normalizeLanguage(user.language);
        if (user.role === 'seller' && user.is_approved === undefined) {
          user.is_approved = false;
        }
      },
      beforeCreate(asyncUser) {
        if (asyncUser.role === 'seller') {
          asyncUser.is_approved = false;
        }
      },
      async beforeSave(user) {
        if (user.changed('password')) {
          user.password = await bcrypt.hash(user.password, 10);
        }
      }
    }
  }
);

User.prototype.comparePassword = function comparePassword(password) {
  return bcrypt.compare(password, this.password);
};

module.exports = User;

function normalizeLanguage(language) {
  const value = String(language || '').trim().toLowerCase();
  if (value === 'hi' || value === 'hindi' || value === 'हिंदी') return 'Hindi';
  if (value === 'kn' || value === 'kannada' || value === 'ಕನ್ನಡ') return 'Kannada';
  return 'English';
}

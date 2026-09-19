const mysql = require('mysql2/promise');
const { Sequelize } = require('sequelize');

const DB_NAME = process.env.DB_NAME || 'shemarket';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = Number(process.env.DB_PORT || 3306);

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'mysql',
  logging: process.env.DB_LOGGING === 'true' ? console.log : false,
  define: {
    underscored: false
  }
});

async function ensureDatabase() {
  if (!/^[a-zA-Z0-9_]+$/.test(DB_NAME)) {
    throw new Error('DB_NAME can contain only letters, numbers, and underscores.');
  }

  const connection = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD
  });

  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await connection.end();
}

async function initializeDatabase() {
  await ensureDatabase();
  await sequelize.authenticate();

  require('../models');

  const syncOptions = process.env.DB_SYNC_ALTER === 'true' ? { alter: true } : {};
  await sequelize.sync(syncOptions);
  await sequelize.query('ALTER TABLE `products` MODIFY `image_url` LONGTEXT');
  await ensureOptionalColumns();
}

module.exports = { sequelize, initializeDatabase };

async function ensureOptionalColumns() {
  const queryInterface = sequelize.getQueryInterface();
  await addColumnIfMissing(queryInterface, 'users', 'shopName', { type: Sequelize.STRING, allowNull: true });
  await addColumnIfMissing(queryInterface, 'users', 'shopAddress', { type: Sequelize.TEXT, allowNull: true });
  await addColumnIfMissing(queryInterface, 'users', 'shopCity', { type: Sequelize.STRING, allowNull: true });
  await addColumnIfMissing(queryInterface, 'users', 'shopState', { type: Sequelize.STRING, allowNull: true });
  await addColumnIfMissing(queryInterface, 'users', 'shopPIN', { type: Sequelize.STRING, allowNull: true });
  await addColumnIfMissing(queryInterface, 'users', 'shopPhone', { type: Sequelize.STRING, allowNull: true });
  await addColumnIfMissing(queryInterface, 'users', 'shopHours', { type: Sequelize.STRING, allowNull: true });
  await addColumnIfMissing(queryInterface, 'users', 'googleMapsLink', { type: Sequelize.TEXT, allowNull: true });
  await addColumnIfMissing(queryInterface, 'users', 'aggregateRating', { type: Sequelize.FLOAT, defaultValue: 0 });
  await addColumnIfMissing(queryInterface, 'users', 'aggregateReviewCount', { type: Sequelize.INTEGER, defaultValue: 0 });
  await addColumnIfMissing(queryInterface, 'users', 'aggregateReviewedProductCount', { type: Sequelize.INTEGER, defaultValue: 0 });

  await addColumnIfMissing(queryInterface, 'products', 'name_i18n', { type: Sequelize.JSON, allowNull: true });
  await addColumnIfMissing(queryInterface, 'products', 'category_i18n', { type: Sequelize.JSON, allowNull: true });
  await addColumnIfMissing(queryInterface, 'products', 'description_i18n', { type: Sequelize.JSON, allowNull: true });
  await addColumnIfMissing(queryInterface, 'products', 'tags_i18n', { type: Sequelize.JSON, allowNull: true });

  await addColumnIfMissing(queryInterface, 'orders', 'isPickup', { type: Sequelize.BOOLEAN, defaultValue: false });
  await addColumnIfMissing(queryInterface, 'orders', 'pickupShopAddress', { type: Sequelize.TEXT, allowNull: true });
  await addColumnIfMissing(queryInterface, 'orders', 'pickupShopHours', { type: Sequelize.STRING, allowNull: true });
  await addColumnIfMissing(queryInterface, 'orders', 'notification_message', { type: Sequelize.TEXT, allowNull: true, defaultValue: null });
  await sequelize.query("ALTER TABLE `orders` MODIFY `status` ENUM('Pending','Shipped','Delivered','Cancelled','Confirmed','Ready for Pickup','Picked Up') DEFAULT 'Pending'");
}

async function addColumnIfMissing(queryInterface, tableName, columnName, definition) {
  const columns = await queryInterface.describeTable(tableName);
  if (!columns[columnName]) {
    await queryInterface.addColumn(tableName, columnName, definition);
  }
}

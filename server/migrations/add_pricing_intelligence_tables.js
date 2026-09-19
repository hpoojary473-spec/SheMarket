'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('product_analytics', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      product_id: {
        type: Sequelize.UUID,
        allowNull: true
      },
      views: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      cart_adds: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      search_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      wishlist_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      area: {
        type: Sequelize.STRING,
        allowNull: true
      }
    });

    await queryInterface.createTable('regional_trends', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      area: {
        type: Sequelize.STRING,
        allowNull: true
      },
      city: {
        type: Sequelize.STRING,
        allowNull: false
      },
      demand_multiplier: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 1.0
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    await queryInterface.createTable('seasonal_demand', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      festival_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      region: {
        type: Sequelize.STRING,
        allowNull: false
      },
      categories: {
        type: Sequelize.JSON,
        allowNull: false
      },
      multiplier: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 1.0
      },
      start_date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      end_date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('seasonal_demand');
    await queryInterface.dropTable('regional_trends');
    await queryInterface.dropTable('product_analytics');
  }
};

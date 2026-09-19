const fs = require('fs');
const path = require('path');
const { QueryTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const regionalBaselines = require('../data/regional_baselines.json');
const festivals = require('../data/festivals.json');

async function seedDemandData() {
  try {
    await sequelize.authenticate();
    await ensurePricingTables();
    await seedRegionalTrends();
    await seedSeasonalDemand();
    console.log('Pricing intelligence seed data loaded.');
  } catch (error) {
    console.error('Failed to seed pricing intelligence data:', error.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

async function ensurePricingTables() {
  try {
    await sequelize.query(
      `CREATE TABLE IF NOT EXISTS product_analytics (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id CHAR(36) NULL,
        views INT NOT NULL DEFAULT 0,
        cart_adds INT NOT NULL DEFAULT 0,
        search_count INT NOT NULL DEFAULT 0,
        wishlist_count INT NOT NULL DEFAULT 0,
        area VARCHAR(255) NULL
      )`
    );

    await sequelize.query(
      `CREATE TABLE IF NOT EXISTS regional_trends (
        id INT AUTO_INCREMENT PRIMARY KEY,
        area VARCHAR(255) NULL,
        city VARCHAR(255) NOT NULL,
        demand_multiplier FLOAT NOT NULL DEFAULT 1,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`
    );

    await sequelize.query(
      `CREATE TABLE IF NOT EXISTS seasonal_demand (
        id INT AUTO_INCREMENT PRIMARY KEY,
        festival_name VARCHAR(255) NOT NULL,
        region VARCHAR(255) NOT NULL,
        categories JSON NOT NULL,
        multiplier FLOAT NOT NULL DEFAULT 1,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL
      )`
    );
  } catch (error) {
    throw new Error(`Could not ensure pricing tables: ${error.message}`);
  }
}

async function seedRegionalTrends() {
  for (const item of regionalBaselines) {
    try {
      const existing = await sequelize.query(
        'SELECT id FROM regional_trends WHERE LOWER(city) = LOWER(:city) LIMIT 1',
        {
          replacements: { city: item.city },
          type: QueryTypes.SELECT
        }
      );

      if (existing[0]) {
        await sequelize.query(
          'UPDATE regional_trends SET area = :area, demand_multiplier = :multiplier, updated_at = NOW() WHERE id = :id',
          {
            replacements: {
              id: existing[0].id,
              area: item.city,
              multiplier: item.demand_multiplier
            }
          }
        );
        continue;
      }

      await sequelize.query(
        'INSERT INTO regional_trends (area, city, demand_multiplier, updated_at) VALUES (:area, :city, :multiplier, NOW())',
        {
          replacements: {
            area: item.city,
            city: item.city,
            multiplier: item.demand_multiplier
          }
        }
      );
    } catch (error) {
      console.error(`Regional trend seed skipped for ${item.city}: ${error.message}`);
    }
  }
}

async function seedSeasonalDemand() {
  for (const item of festivals) {
    try {
      const existing = await sequelize.query(
        `SELECT id
         FROM seasonal_demand
         WHERE festival_name = :festival
           AND region = :region
           AND start_date = :start_date
           AND end_date = :end_date
         LIMIT 1`,
        {
          replacements: {
            festival: item.festival,
            region: item.region,
            start_date: item.start_date,
            end_date: item.end_date
          },
          type: QueryTypes.SELECT
        }
      );

      const categories = JSON.stringify(item.high_demand_categories || []);

      if (existing[0]) {
        await sequelize.query(
          'UPDATE seasonal_demand SET categories = :categories, multiplier = :multiplier WHERE id = :id',
          {
            replacements: {
              id: existing[0].id,
              categories,
              multiplier: item.multiplier
            }
          }
        );
        continue;
      }

      await sequelize.query(
        `INSERT INTO seasonal_demand
          (festival_name, region, categories, multiplier, start_date, end_date)
         VALUES
          (:festival, :region, :categories, :multiplier, :start_date, :end_date)`,
        {
          replacements: {
            festival: item.festival,
            region: item.region,
            categories,
            multiplier: item.multiplier,
            start_date: item.start_date,
            end_date: item.end_date
          }
        }
      );
    } catch (error) {
      console.error(`Festival seed skipped for ${item.festival}: ${error.message}`);
    }
  }
}

if (require.main === module) {
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    console.error('Seed data directory is missing.');
    process.exit(1);
  }

  seedDemandData();
}

module.exports = seedDemandData;

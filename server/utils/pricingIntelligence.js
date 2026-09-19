const { QueryTypes, Sequelize } = require('sequelize');
const { sequelize } = require('../config/database');
const { Product, Order } = require('../models');

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeText(value) {
  return String(value || '').trim();
}

function classifyDemand(score) {
  if (score < 30) return 'LOW';
  if (score <= 70) return 'MEDIUM';
  return 'HIGH';
}

async function getLocalMarketStats(category, area) {
  try {
    const where = {};
    if (category) {
      where.category = category;
    }

    const row = await Product.findOne({
      attributes: [
        [Sequelize.fn('AVG', Sequelize.col('price')), 'local_avg'],
        [Sequelize.fn('MIN', Sequelize.col('price')), 'local_min'],
        [Sequelize.fn('MAX', Sequelize.col('price')), 'local_max'],
        [Sequelize.fn('COUNT', Sequelize.col('_id')), 'sample_size']
      ],
      where,
      raw: true
    });

    const sampleSize = toNumber(row?.sample_size);
    if (!row || sampleSize === 0) {
      return { local_avg: null, local_min: null, local_max: null, sample_size: 0, area: normalizeText(area) };
    }

    return {
      local_avg: toNumber(row.local_avg),
      local_min: toNumber(row.local_min),
      local_max: toNumber(row.local_max),
      sample_size: sampleSize,
      area: normalizeText(area)
    };
  } catch (error) {
    return { local_avg: null, local_min: null, local_max: null, sample_size: 0, area: normalizeText(area) };
  }
}

async function getDemandScore(product_id, area) {
  const analytics = { views: 0, cart_adds: 0, search_count: 0 };
  let orders = 0;
  let hasData = false;

  try {
    if (product_id) {
      const rows = await sequelize.query(
        `SELECT views, cart_adds, search_count
         FROM product_analytics
         WHERE product_id = :product_id
           AND (:area = '' OR area IS NULL OR LOWER(area) = LOWER(:area))
         ORDER BY id DESC
         LIMIT 1`,
        {
          replacements: { product_id, area: normalizeText(area) },
          type: QueryTypes.SELECT
        }
      );

      if (rows[0]) {
        analytics.views = toNumber(rows[0].views);
        analytics.cart_adds = toNumber(rows[0].cart_adds);
        analytics.search_count = toNumber(rows[0].search_count);
        hasData = true;
      }
    }
  } catch (error) {
    // Missing analytics tables should not block price prediction.
  }

  try {
    if (product_id) {
      const product = await Product.findByPk(product_id, { raw: true });
      if (product) {
        analytics.views = Math.max(analytics.views, toNumber(product.views_count));
        orders = toNumber(product.orders_count);
        hasData = true;
      }
    }
  } catch (error) {
    // Product history is optional for new listings.
  }

  try {
    if (product_id) {
      const orderCount = await Order.count({ where: { product_id } });
      orders = Math.max(orders, toNumber(orderCount));
      if (orderCount > 0) hasData = true;
    }
  } catch (error) {
    // Existing products may still rely on the denormalized orders_count.
  }

  const score = (
    analytics.views * 0.4
    + orders * 0.6
    + analytics.cart_adds * 0.3
    + analytics.search_count * 0.2
  );

  return {
    score: Number(score.toFixed(2)),
    demand_level: classifyDemand(score),
    has_data: hasData
  };
}

async function getRegionalMultiplier(area) {
  const normalizedArea = normalizeText(area);
  if (!normalizedArea) {
    return 1.0;
  }

  try {
    const rows = await sequelize.query(
      `SELECT area, city, demand_multiplier
       FROM regional_trends
       WHERE LOWER(area) = LOWER(:area)
          OR LOWER(city) = LOWER(:area)
       ORDER BY updated_at DESC
       LIMIT 1`,
      {
        replacements: { area: normalizedArea },
        type: QueryTypes.SELECT
      }
    );

    if (!rows[0]) {
      return 1.0;
    }

    return toNumber(rows[0].demand_multiplier, 1.0);
  } catch (error) {
    return 1.0;
  }
}

async function getActiveFestival(area, category) {
  const today = new Date().toISOString().slice(0, 10);
  const normalizedArea = normalizeText(area);
  const normalizedCategory = normalizeText(category).toLowerCase();

  try {
    const rows = await sequelize.query(
      `SELECT festival_name, region, categories, multiplier, start_date, end_date
       FROM seasonal_demand
       WHERE start_date <= :today
         AND end_date >= :today`,
      {
        replacements: { today },
        type: QueryTypes.SELECT
      }
    );

    const active = rows.find((row) => {
      const rowCategories = parseCategories(row.categories).map((item) => item.toLowerCase());
      return regionMatches(row.region, normalizedArea) && rowCategories.includes(normalizedCategory);
    });

    if (!active) return null;

    return {
      festival: active.festival_name,
      multiplier: toNumber(active.multiplier, 1.0),
      region: active.region
    };
  } catch (error) {
    return null;
  }
}

function parseCategories(value) {
  if (Array.isArray(value)) return value.map(String);
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch (error) {
    return [];
  }
}

function regionMatches(region, area) {
  const target = normalizeText(region).toLowerCase();
  const source = normalizeText(area).toLowerCase();
  if (!target || target === 'india' || target === 'all india') return true;
  if (!source) return target === 'india' || target === 'all india';
  if (target === source) return true;
  if (target === 'south india') {
    return ['mangalore', 'mysore', 'bengaluru', 'udupi', 'hubballi', 'dharwad', 'shivamogga'].includes(source);
  }
  if (target === 'karnataka') {
    return ['mangalore', 'mysore', 'bengaluru', 'udupi', 'hubballi', 'belagavi', 'dharwad', 'shivamogga'].includes(source);
  }
  return false;
}

function calculateFinalPrice(inputs) {
  const rawMaterial = toNumber(inputs.raw_material);
  const labour = toNumber(inputs.labour);
  const packaging = toNumber(inputs.packaging);
  const baseCost = rawMaterial + labour + packaging;
  const fallbackAverage = baseCost > 0 ? baseCost * 1.3 : 120;
  const localAverage = toNumber(inputs.local_avg, fallbackAverage) || fallbackAverage;
  const demandScore = toNumber(inputs.demand_score);
  const regionMultiplier = toNumber(inputs.region_multiplier, 1.0) || 1.0;
  const seasonalMultiplier = toNumber(inputs.seasonal_multiplier, 1.0) || 1.0;
  const marketAdjustment = (localAverage - baseCost) * 0.3;
  const demandAdjustment = demandScore * 0.5;
  const finalPrice = (baseCost + marketAdjustment + demandAdjustment) * regionMultiplier * seasonalMultiplier;
  const demandLevel = inputs.demand_level || classifyDemand(demandScore);
  const seasonalAdjustment = Boolean(inputs.festival && seasonalMultiplier > 1);
  const confidenceSignals = [
    Boolean(inputs.local_market_available),
    Boolean(inputs.demand_available),
    Boolean(inputs.region_available),
    Boolean(inputs.seasonal_available)
  ].filter(Boolean).length;
  const confidenceScore = Math.min(1, Number((0.35 + confidenceSignals * 0.15).toFixed(2)));

  return {
    recommended_price: Math.max(0, Math.round(finalPrice)),
    market_average: Number(localAverage.toFixed(2)),
    demand_level: demandLevel,
    seasonal_adjustment: seasonalAdjustment,
    festival: seasonalAdjustment ? inputs.festival : null,
    region: inputs.region || null,
    confidence_score: confidenceScore,
    pricing_reason: buildPricingReason({
      baseCost,
      localAverage,
      demandLevel,
      region: inputs.region,
      regionMultiplier,
      festival: seasonalAdjustment ? inputs.festival : null,
      seasonalMultiplier
    })
  };
}

function buildPricingReason(details) {
  const parts = [
    `Base cost is INR ${Math.round(details.baseCost)} and the local market average is INR ${Math.round(details.localAverage)}.`,
    `Demand is ${details.demandLevel}.`
  ];

  if (details.region) {
    parts.push(`Regional trend for ${details.region} applies a ${details.regionMultiplier}x multiplier.`);
  }

  if (details.festival) {
    parts.push(`${details.festival} demand applies a ${details.seasonalMultiplier}x seasonal adjustment.`);
  }

  return parts.join(' ');
}

module.exports = {
  getLocalMarketStats,
  getDemandScore,
  getRegionalMultiplier,
  getActiveFestival,
  calculateFinalPrice
};

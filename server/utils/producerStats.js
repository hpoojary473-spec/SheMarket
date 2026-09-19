const Product = require('../models/Product');
const Review = require('../models/Review');

async function refreshProducerRating(sellerId) {
  if (!sellerId) return null;

  const products = await Product.findAll({
    where: { seller_id: sellerId },
    attributes: ['_id']
  });
  const productIds = products.map((product) => product._id);

  if (!productIds.length) {
    return updateSellerStats(sellerId, 0, 0, 0);
  }

  const reviews = await Review.findAll({
    where: { product_id: productIds },
    attributes: ['product_id', 'rating'],
    raw: true
  });

  const reviewCount = reviews.length;
  const reviewedProductCount = new Set(reviews.map((review) => review.product_id)).size;
  const average = reviewCount
    ? Number((reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviewCount).toFixed(1))
    : 0;

  return updateSellerStats(sellerId, average, reviewCount, reviewedProductCount);
}

async function updateSellerStats(sellerId, aggregateRating, aggregateReviewCount, aggregateReviewedProductCount) {
  const User = require('../models/User');
  await User.update({
    aggregateRating,
    aggregateReviewCount,
    aggregateReviewedProductCount
  }, {
    where: { _id: sellerId }
  });

  return {
    aggregateRating,
    aggregateReviewCount,
    aggregateReviewedProductCount
  };
}

module.exports = { refreshProducerRating };

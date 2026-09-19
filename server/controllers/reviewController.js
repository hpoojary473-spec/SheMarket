const { fn, col } = require('sequelize');
const Product = require('../models/Product');
const Review = require('../models/Review');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { serializeReview } = require('../utils/serializers');
const { refreshProducerRating } = require('../utils/producerStats');

const reviewBuyerInclude = {
  model: User,
  as: 'buyer',
  attributes: ['_id', 'name']
};

const addReview = asyncHandler(async (req, res) => {
  const { product_id, rating, comment } = req.body;

  const product = await Product.findByPk(product_id);
  if (!product) {
    return res.status(404).json({ message: 'Product not found.' });
  }

  const [review] = await Review.upsert(
    {
      product_id,
      buyer_id: req.user._id,
      rating,
      comment
    },
    { returning: true }
  );

  await refreshProductRating(product_id);
  await refreshProducerRating(product.seller_id);

  const savedReview = await Review.findOne({
    where: { product_id, buyer_id: req.user._id },
    include: [reviewBuyerInclude]
  });

  res.status(201).json(serializeReview(savedReview || review));
});

const getReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.findAll({
    where: { product_id: req.params.product_id },
    include: [reviewBuyerInclude],
    order: [['createdAt', 'DESC']]
  });

  res.json(reviews.map(serializeReview));
});

async function refreshProductRating(productId) {
  const stats = await Review.findOne({
    where: { product_id: productId },
    attributes: [[fn('AVG', col('rating')), 'averageRating']],
    raw: true
  });

  const rating = stats?.averageRating ? Number(Number(stats.averageRating).toFixed(1)) : 0;
  await Product.update({ rating }, { where: { _id: productId } });
}

module.exports = { addReview, getReviews };

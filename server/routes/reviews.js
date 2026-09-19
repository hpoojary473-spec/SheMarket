const express = require('express');
const { addReview, getReviews } = require('../controllers/reviewController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.post('/add', requireAuth, requireRole('buyer', 'admin'), addReview);
router.get('/:product_id', getReviews);

module.exports = router;

const express = require('express');
const {
  createOrder,
  listOrders,
  updateOrderStatus
} = require('../controllers/orderController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.post('/create', requireAuth, requireRole('buyer', 'admin'), createOrder);
router.get('/', requireAuth, listOrders);
router.put('/:id/status', requireAuth, requireRole('seller', 'admin'), updateOrderStatus);

module.exports = router;

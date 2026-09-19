const express = require('express');
const {
  adminDashboard,
  sellerDashboard
} = require('../controllers/dashboardController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/seller', requireAuth, requireRole('seller', 'admin'), sellerDashboard);
router.get('/admin', requireAuth, requireRole('admin'), adminDashboard);

module.exports = router;

const express = require('express');
const {
  approveSeller,
  listSellers,
  shgOverview
} = require('../controllers/adminController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/sellers', requireAuth, requireRole('admin'), listSellers);
router.put('/sellers/:id/approve', requireAuth, requireRole('admin'), approveSeller);
router.get('/shg-overview', requireAuth, requireRole('admin'), shgOverview);

module.exports = router;

const express = require('express');
const {
  addProduct,
  deleteProduct,
  getProduct,
  listProducts,
  updateProduct
} = require('../controllers/productController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.post('/add', requireAuth, requireRole('seller'), addProduct);
router.get('/', listProducts);
router.get('/:id', getProduct);
router.put('/:id', requireAuth, requireRole('seller', 'admin'), updateProduct);
router.delete('/:id', requireAuth, requireRole('seller', 'admin'), deleteProduct);

module.exports = router;

const express = require('express');
const {
  getMe,
  getProducerProfile,
  listProducers,
  login,
  register,
  updateMe
} = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', requireAuth, getMe);
router.put('/me', requireAuth, updateMe);
router.get('/producers', listProducers);
router.get('/producers/:id', getProducerProfile);

module.exports = router;

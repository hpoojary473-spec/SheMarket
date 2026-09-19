const crypto = require('crypto');
const Razorpay = require('razorpay');
const Payment = require('../models/Payment');
const asyncHandler = require('../utils/asyncHandler');
const { serializePayment } = require('../utils/serializers');

function getRazorpayClient() {
  const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;

  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET || RAZORPAY_KEY_ID.includes('your_key')) {
    return null;
  }

  return new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET
  });
}

const createOrder = asyncHandler(async (req, res) => {
  const { amount, order_id } = req.body;
  const amountInRupees = Number(amount);

  if (!amountInRupees || amountInRupees <= 0) {
    return res.status(400).json({ message: 'A valid amount is required.' });
  }

  const amountInPaise = Math.round(amountInRupees * 100);
  const razorpay = getRazorpayClient();

  let razorpayOrder;
  if (razorpay) {
    razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `shemarket_${Date.now()}`
    });
  } else {
    razorpayOrder = {
      id: `order_mock_${Date.now()}`,
      amount: amountInPaise,
      currency: 'INR',
      status: 'created'
    };
  }

  const payment = await Payment.create({
    order_id: order_id || null,
    amount: amountInRupees,
    razorpay_order_id: razorpayOrder.id,
    status: 'created'
  });

  const transactionId = `SMUPI${Date.now()}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const upiId = `shemarket.${crypto.randomBytes(2).toString('hex')}@razorpay`;
  const qrPayload = [
    'upi://pay',
    `?pa=${encodeURIComponent(upiId)}`,
    '&pn=SheMarket',
    `&am=${encodeURIComponent(amountInRupees.toFixed(2))}`,
    '&cu=INR',
    `&tr=${encodeURIComponent(transactionId)}`,
    `&tn=${encodeURIComponent('SheMarket order')}`
  ].join('');

  res.status(201).json({
    payment_id: payment._id,
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_mock_key',
    order: razorpayOrder,
    qr: {
      transaction_id: transactionId,
      upi_id: upiId,
      payload: qrPayload,
      expires_in_seconds: 120
    }
  });
});

const verifyPayment = asyncHandler(async (req, res) => {
  const {
    payment_id,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  } = req.body;

  const razorpayConfigured =
    process.env.RAZORPAY_KEY_SECRET && !process.env.RAZORPAY_KEY_SECRET.includes('your_key');

  let isValid = true;
  if (razorpayConfigured) {
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    isValid = expectedSignature === razorpay_signature;
  }

  const payment = await Payment.findByPk(payment_id);
  if (!payment) {
    return res.status(404).json({ message: 'Payment record not found.' });
  }

  await payment.update({
    status: isValid ? 'paid' : 'failed',
    razorpay_order_id: razorpay_order_id || payment.razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  });

  res.json({
    verified: isValid,
    payment: serializePayment(payment)
  });
});

module.exports = { createOrder, verifyPayment };

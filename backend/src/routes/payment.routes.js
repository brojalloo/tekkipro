// Routes Paiements — Stripe, Wave, Orange Money, Free Money
const router = require('express').Router();
const { auth } = require('../middleware/auth.middleware');
const {
  createStripeSession,
  stripeWebhook,
  verifyStripeSession,
  initiateWavePayment,
  initiateOrangeMoneyPayment,
  initiateFreeMoneyPayment,
  getPaymentStatus,
} = require('../controllers/payment.controller');

// Stripe
router.post('/stripe/create-session', auth, createStripeSession);
router.get('/stripe/verify/:sessionId', auth, verifyStripeSession);
// Note: le webhook Stripe est monté séparément dans server.js avec express.raw()

// Wave Mobile Money
router.post('/wave/initiate', auth, initiateWavePayment);

// Orange Money
router.post('/orange-money/initiate', auth, initiateOrangeMoneyPayment);

// Free Money
router.post('/free-money/initiate', auth, initiateFreeMoneyPayment);

// Statut générique
router.get('/status/:paiementId', auth, getPaymentStatus);

module.exports = router;

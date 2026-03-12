// Routes Paiements — Stripe, Wave, Orange Money, Free Money
const router = require('express').Router();
const { auth } = require('../../middleware/auth.middleware');
const { paymentReadRateLimiter, paymentWriteRateLimiter } = require('../../middleware/security.middleware');
const { handleValidationErrors } = require('../../middleware/validation.middleware');
const {
  createStripeSession,
  stripeWebhook,
  verifyStripeSession,
  initiateWavePayment,
  initiateOrangeMoneyPayment,
  initiateFreeMoneyPayment,
  getPaymentStatus,
} = require('./payment.controller');
const {
  createStripeSessionValidation,
  getPaymentStatusValidation,
  initiateFreeMoneyPaymentValidation,
  initiateOrangeMoneyPaymentValidation,
  initiateWavePaymentValidation,
  verifyStripeSessionValidation,
} = require('./payment.validation');

// Stripe
router.post('/stripe/create-session', auth, paymentWriteRateLimiter, createStripeSessionValidation, handleValidationErrors, createStripeSession);
router.get('/stripe/verify/:sessionId', auth, paymentReadRateLimiter, verifyStripeSessionValidation, handleValidationErrors, verifyStripeSession);
// Note: le webhook Stripe est monté séparément dans server.js avec express.raw()

// Wave Mobile Money
router.post('/wave/initiate', auth, paymentWriteRateLimiter, initiateWavePaymentValidation, handleValidationErrors, initiateWavePayment);

// Orange Money
router.post('/orange-money/initiate', auth, paymentWriteRateLimiter, initiateOrangeMoneyPaymentValidation, handleValidationErrors, initiateOrangeMoneyPayment);

// Free Money
router.post('/free-money/initiate', auth, paymentWriteRateLimiter, initiateFreeMoneyPaymentValidation, handleValidationErrors, initiateFreeMoneyPayment);

// Statut générique
router.get('/status/:paiementId', auth, paymentReadRateLimiter, getPaymentStatusValidation, handleValidationErrors, getPaymentStatus);

module.exports = router;

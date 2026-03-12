const { body, param } = require('express-validator');

const normalizePhone = (value) => {
  if (typeof value !== 'string') return value;
  return value.replace(/[\s.-]/g, '');
};

const planRule = body('plan')
  .trim()
  .toUpperCase()
  .isIn(['PRO', 'BUSINESS'])
  .withMessage('Plan invalide');

const subscriptionTypeRule = body('type')
  .trim()
  .toLowerCase()
  .isIn(['souscrire', 'renouveler'])
  .withMessage('Type de paiement invalide');

const telephoneRule = (label) => body('telephone')
  .trim()
  .customSanitizer(normalizePhone)
  .matches(/^\+?[0-9]{9,15}$/)
  .withMessage(`Numéro de téléphone invalide pour ${label}`);

const createStripeSessionValidation = [
  planRule,
  subscriptionTypeRule,
];

const verifyStripeSessionValidation = [
  param('sessionId')
    .trim()
    .isLength({ min: 10, max: 255 })
    .withMessage('Session Stripe invalide')
    .matches(/^[A-Za-z0-9_]+$/)
    .withMessage('Session Stripe invalide'),
];

const initiateWavePaymentValidation = [
  planRule,
  subscriptionTypeRule,
  telephoneRule('Wave'),
];

const initiateOrangeMoneyPaymentValidation = [
  planRule,
  subscriptionTypeRule,
  telephoneRule('Orange Money'),
];

const initiateFreeMoneyPaymentValidation = [
  planRule,
  subscriptionTypeRule,
  telephoneRule('Free Money'),
];

const getPaymentStatusValidation = [
  param('paiementId')
    .isInt({ min: 1 })
    .withMessage('Identifiant paiement invalide')
    .toInt(),
];

module.exports = {
  createStripeSessionValidation,
  getPaymentStatusValidation,
  initiateFreeMoneyPaymentValidation,
  initiateOrangeMoneyPaymentValidation,
  initiateWavePaymentValidation,
  verifyStripeSessionValidation,
};
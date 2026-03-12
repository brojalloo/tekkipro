const AUTOMATED_SUBSCRIPTION_PAYMENT_MODES = ['STRIPE', 'WAVE', 'ORANGE_MONEY', 'FREE_MONEY'];
const MANUAL_SUBSCRIPTION_PAYMENT_MODES = ['VIREMENT', 'CASH'];

const normalizePaymentMode = (mode) => {
  if (typeof mode !== 'string') return '';
  return mode.trim().toUpperCase();
};

const isAutomatedSubscriptionPaymentMode = (mode) => {
  return AUTOMATED_SUBSCRIPTION_PAYMENT_MODES.includes(normalizePaymentMode(mode));
};

const isManualSubscriptionPaymentMode = (mode) => {
  return MANUAL_SUBSCRIPTION_PAYMENT_MODES.includes(normalizePaymentMode(mode));
};

module.exports = {
  AUTOMATED_SUBSCRIPTION_PAYMENT_MODES,
  MANUAL_SUBSCRIPTION_PAYMENT_MODES,
  normalizePaymentMode,
  isAutomatedSubscriptionPaymentMode,
  isManualSubscriptionPaymentMode,
};
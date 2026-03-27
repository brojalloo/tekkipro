// Configuration centralisée des moyens de paiement visibles dans l'UI abonnement.
// En production, les moyens automatisés sont masqués par défaut et doivent être
// explicitement activés via VITE_ENABLE_<MODE>=true.

const parseEnvBoolean = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === '') return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
};

const automatedDefault = !import.meta.env.PROD;

const PAYMENT_MODE_OPTIONS = [
  { key: 'STRIPE', label: 'Carte bancaire', icon: '💳', requiresPhone: false, enabled: parseEnvBoolean(import.meta.env.VITE_ENABLE_STRIPE, automatedDefault) },
  { key: 'WAVE', label: 'Wave', icon: '🌊', requiresPhone: true, enabled: parseEnvBoolean(import.meta.env.VITE_ENABLE_WAVE, automatedDefault) },
  { key: 'ORANGE_MONEY', label: 'Orange Money', icon: '🟠', requiresPhone: true, enabled: parseEnvBoolean(import.meta.env.VITE_ENABLE_ORANGE_MONEY, automatedDefault) },
  { key: 'FREE_MONEY', label: 'Free Money', icon: '🟢', requiresPhone: true, enabled: parseEnvBoolean(import.meta.env.VITE_ENABLE_FREE_MONEY, automatedDefault) },
  { key: 'VIREMENT', label: 'Virement bancaire', icon: '🏦', requiresPhone: false, enabled: parseEnvBoolean(import.meta.env.VITE_ENABLE_VIREMENT, true) },
  { key: 'CASH', label: 'Espèces', icon: '💵', requiresPhone: false, enabled: parseEnvBoolean(import.meta.env.VITE_ENABLE_CASH, true) },
];

export const AVAILABLE_PAYMENT_MODE_OPTIONS = PAYMENT_MODE_OPTIONS.filter(({ enabled }) => enabled);
export const DEFAULT_PAYMENT_MODE = AVAILABLE_PAYMENT_MODE_OPTIONS[0]?.key || '';

export const PAYMENT_MODE_LABELS = Object.fromEntries(
  PAYMENT_MODE_OPTIONS.map(({ key, label }) => [key, label])
);

export const PAYMENT_MODE_ICONS = Object.fromEntries(
  PAYMENT_MODE_OPTIONS.map(({ key, icon }) => [key, icon])
);

export const requiresPhoneForPaymentMode = (mode) => {
  return PAYMENT_MODE_OPTIONS.some(({ key, requiresPhone }) => key === mode && requiresPhone);
};
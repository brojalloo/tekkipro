const REQUIRED_IN_PRODUCTION = ['DATABASE_URL', 'JWT_SECRET', 'FRONTEND_URL', 'APP_URL'];
const KNOWN_WEAK_SECRETS = new Set([
  'changeme_in_production_use_a_long_random_string',
  'change-me',
  'replace-me',
  'development-secret',
  'dev-secret',
  'tekkipro-secret-key-change-in-production',
]);

const isProduction = () => process.env.NODE_ENV === 'production';

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(`[config] ${message}`);
  }
};

const isLocalHostname = (hostname) => ['localhost', '127.0.0.1', '::1'].includes(hostname);
const isIpAddress = (hostname) => /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);

const ensureAbsoluteUrl = (name) => {
  const value = process.env[name];
  assert(value, `${name} est requis.`);

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`[config] ${name} doit être une URL absolue valide.`);
  }

  const isLocal = isLocalHostname(url.hostname);
  const isIp = isIpAddress(url.hostname);
  assert(['http:', 'https:'].includes(url.protocol), `${name} doit utiliser http:// ou https://.`);
  assert(!(isProduction() && !isLocal && !isIp && url.protocol !== 'https:'), `${name} doit utiliser https:// en production.`);
};

const ensurePositiveIntegerIfDefined = (name) => {
  if (process.env[name] == null || process.env[name] === '') return;
  const parsed = Number.parseInt(process.env[name], 10);
  assert(Number.isFinite(parsed) && parsed > 0, `${name} doit être un entier positif.`);
};

const JWT_EXPIRES_PATTERN = /^\d+\s*(ms|s|m|h|d|w|y)$/i;

const validateJwtSecret = () => {
  const secret = process.env.JWT_SECRET || '';
  assert(secret.length >= 32, 'JWT_SECRET doit contenir au moins 32 caractères.');
  assert(!KNOWN_WEAK_SECRETS.has(secret), 'JWT_SECRET utilise une valeur trop faible ou par défaut.');
};

const validateJwtExpires = () => {
  const value = process.env.JWT_EXPIRES_IN;
  if (!value) return; // la valeur par défaut '7d' sera utilisée dans le code
  assert(JWT_EXPIRES_PATTERN.test(value.trim()), 'JWT_EXPIRES_IN doit être une durée valide (ex: 7d, 24h, 3600s).');
};

const validateOptionalUrlList = (name) => {
  if (!process.env[name]) return;
  const values = process.env[name].split(',').map(value => value.trim()).filter(Boolean);
  values.forEach((value, index) => {
    try {
      const url = new URL(value);
      assert(['http:', 'https:'].includes(url.protocol), `${name}[${index}] doit utiliser http:// ou https://.`);
    } catch {
      throw new Error(`[config] ${name}[${index}] doit être une URL valide.`);
    }
  });
};

const validateSmtpConfig = () => {
  const smtpKeys = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];
  const provided = smtpKeys.filter(key => process.env[key]);
  if (provided.length === 0) return;

  assert(provided.length === smtpKeys.length, 'SMTP_HOST, SMTP_PORT, SMTP_USER et SMTP_PASS doivent être définis ensemble.');
  ensurePositiveIntegerIfDefined('SMTP_PORT');
};

const validateStripeConfig = () => {
  if (!process.env.STRIPE_SECRET_KEY) return;
  assert(process.env.STRIPE_WEBHOOK_SECRET, 'STRIPE_WEBHOOK_SECRET est requis quand STRIPE_SECRET_KEY est défini.');
};

const validateEnvironment = () => {
  ensurePositiveIntegerIfDefined('AUTH_RATE_LIMIT_WINDOW_MS');
  ensurePositiveIntegerIfDefined('AUTH_RATE_LIMIT_MAX');
  ensurePositiveIntegerIfDefined('PASSWORD_RESET_RATE_LIMIT_WINDOW_MS');
  ensurePositiveIntegerIfDefined('PASSWORD_RESET_RATE_LIMIT_MAX');
  ensurePositiveIntegerIfDefined('PAYMENT_WRITE_RATE_LIMIT_WINDOW_MS');
  ensurePositiveIntegerIfDefined('PAYMENT_WRITE_RATE_LIMIT_MAX');
  ensurePositiveIntegerIfDefined('PAYMENT_READ_RATE_LIMIT_WINDOW_MS');
  ensurePositiveIntegerIfDefined('PAYMENT_READ_RATE_LIMIT_MAX');
  validateSmtpConfig();
  validateJwtExpires();

  if (process.env.NODE_ENV !== 'test') {
    validateJwtSecret();
  }

  if (!isProduction()) return;

  REQUIRED_IN_PRODUCTION.forEach((name) => {
    assert(process.env[name], `${name} est requis en production.`);
  });
  ensureAbsoluteUrl('FRONTEND_URL');
  ensureAbsoluteUrl('APP_URL');
  validateOptionalUrlList('CORS_ORIGINS');
  validateStripeConfig();
};

module.exports = { validateEnvironment };
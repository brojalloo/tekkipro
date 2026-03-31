const crypto = require('crypto');
const { forbidden, tooManyRequests } = require('../common/utils/response');

const DEV_ALLOWED_ORIGINS = [
  'http://localhost',
  'http://127.0.0.1',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:8081',
  'http://127.0.0.1:8081',
  'http://localhost:5178',
  'http://127.0.0.1:5178',
];

const normalizeOrigin = (origin) => origin?.trim().replace(/\/$/, '');

const getPositiveIntEnv = (name, fallback) => {
  const parsed = Number.parseInt(process.env[name], 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const getTrustProxySetting = () => {
  const value = process.env.TRUST_PROXY;
  if (value == null || value === '') return false;

  const normalized = String(value).trim().toLowerCase();
  if (['false', '0', 'off', 'no'].includes(normalized)) return false;
  if (['true', 'on', 'yes'].includes(normalized)) return true;

  const parsed = Number.parseInt(normalized, 10);
  if (Number.isFinite(parsed) && parsed >= 0) {
    return parsed;
  }

  return value;
};

const getForwardedProto = (req) => String(req.headers['x-forwarded-proto'] || '')
  .split(',')[0]
  .trim()
  .toLowerCase();

const hashIdentifier = (value) => crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 16);

const buildPaymentRateLimitKey = (req) => {
  const userId = req.user?.id || req.ip || 'anonymous';
  const boutiqueId = req.boutiqueId || req.user?.boutiqueId || 'no-boutique';
  const routeKey = req.route?.path || req.path || 'unknown';
  return `payment:${userId}:${boutiqueId}:${routeKey}`;
};

const buildPasswordResetRateLimitKey = (req) => {
  const routeKey = req.route?.path || req.path || 'unknown';
  const identifierSource = req.body?.email?.trim().toLowerCase()
    || req.body?.token
    || req.ip
    || 'anonymous';

  return `password-reset:${req.ip || 'unknown'}:${routeKey}:${hashIdentifier(identifierSource)}`;
};

const getAllowedOrigins = () => {
  const configuredOrigins = [process.env.FRONTEND_URL, process.env.CORS_ORIGINS]
    .filter(Boolean)
    .flatMap(value => value.split(','))
    .map(normalizeOrigin)
    .filter(Boolean);

  const origins = new Set(configuredOrigins);

  if (process.env.NODE_ENV !== 'production') {
    DEV_ALLOWED_ORIGINS.forEach(origin => origins.add(origin));
  }

  return origins;
};

const isOriginAllowed = (origin, allowedOrigins = getAllowedOrigins()) => {
  if (!origin) return true;
  return allowedOrigins.has(normalizeOrigin(origin));
};

const createCorsOptions = () => {
  const allowedOrigins = getAllowedOrigins();

  return {
    origin(origin, callback) {
      callback(null, isOriginAllowed(origin, allowedOrigins));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Boutique-Id', 'Stripe-Signature'],
  };
};

const enforceOriginAllowlist = (req, res, next) => {
  const origin = req.headers.origin;
  if (origin && !isOriginAllowed(origin)) {
    return forbidden(res, 'Origine non autorisée', { code: 'FORBIDDEN_ORIGIN' });
  }

  next();
};

const applySecurityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=()');
  const appUrl = process.env.APP_URL || (process.env.NODE_ENV !== 'production' ? 'http://localhost:5000' : '');
  const cspSelf = appUrl ? `'self' ${appUrl}` : "'self'";
  const csp = [
    `default-src 'none'`,
    `connect-src ${cspSelf}`,
    `script-src 'none'`,
    `style-src 'none'`,
    `img-src 'none'`,
    `font-src 'none'`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
  ].join('; ');
  res.setHeader('Content-Security-Policy', csp);

  const forwardedProto = getForwardedProto(req);
  if (req.secure || forwardedProto === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  }

  next();
};

const createRateLimiter = ({
  windowMs = 15 * 60 * 1000,
  max = 10,
  message = 'Trop de tentatives. Réessayez plus tard.',
  keyGenerator = (req) => `${req.ip}:${req.route?.path || req.path || 'unknown'}`,
} = {}) => {
  const buckets = new Map();

  // Nettoyage périodique des entrées expirées pour éviter la fuite mémoire
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of buckets) {
      if (entry.resetAt <= now) buckets.delete(key);
    }
  }, windowMs).unref();

  // Exposer pour les tests
  const middleware = (req, res, next) => {
    const now = Date.now();
    const key = keyGenerator(req);
    const existing = buckets.get(key);
    const entry = !existing || existing.resetAt <= now
      ? { count: 0, resetAt: now + windowMs }
      : existing;

    entry.count += 1;
    buckets.set(key, entry);

    const remaining = Math.max(0, max - entry.count);
    res.setHeader('Retry-After', Math.max(1, Math.ceil((entry.resetAt - now) / 1000)));
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(remaining));

    if (entry.count > max) {
      return tooManyRequests(res, message, { code: 'RATE_LIMIT_EXCEEDED' });
    }

    next();
  };

  middleware._buckets = buckets;
  middleware._cleanup = cleanupInterval;
  return middleware;
};

// Rate limiter global — protection DoS (300 req/min par IP)
const globalRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: getPositiveIntEnv('GLOBAL_RATE_LIMIT_MAX', 300),
  message: 'Trop de requêtes. Réessayez dans une minute.',
  keyGenerator: (req) => req.ip || 'anonymous',
});

const authRateLimiter = createRateLimiter({
  windowMs: getPositiveIntEnv('AUTH_RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
  max: getPositiveIntEnv('AUTH_RATE_LIMIT_MAX', 10),
  message: 'Trop de tentatives sur cette route. Réessayez dans quelques minutes.',
});

const passwordResetRateLimiter = createRateLimiter({
  windowMs: getPositiveIntEnv('PASSWORD_RESET_RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
  max: getPositiveIntEnv('PASSWORD_RESET_RATE_LIMIT_MAX', 5),
  message: 'Trop de tentatives de récupération de mot de passe. Réessayez dans quelques minutes.',
  keyGenerator: buildPasswordResetRateLimitKey,
});

const paymentWriteRateLimiter = createRateLimiter({
  windowMs: getPositiveIntEnv('PAYMENT_WRITE_RATE_LIMIT_WINDOW_MS', 5 * 60 * 1000),
  max: getPositiveIntEnv('PAYMENT_WRITE_RATE_LIMIT_MAX', 10),
  message: 'Trop de demandes de paiement en peu de temps. Réessayez dans quelques minutes.',
  keyGenerator: buildPaymentRateLimitKey,
});

const paymentReadRateLimiter = createRateLimiter({
  windowMs: getPositiveIntEnv('PAYMENT_READ_RATE_LIMIT_WINDOW_MS', 5 * 60 * 1000),
  max: getPositiveIntEnv('PAYMENT_READ_RATE_LIMIT_MAX', 60),
  message: 'Trop de vérifications de paiement en peu de temps. Réessayez dans quelques instants.',
  keyGenerator: buildPaymentRateLimitKey,
});

module.exports = {
  applySecurityHeaders,
  authRateLimiter,
  globalRateLimiter,
  buildPasswordResetRateLimitKey,
  buildPaymentRateLimitKey,
  createCorsOptions,
  createRateLimiter,
  enforceOriginAllowlist,
  getAllowedOrigins,
  isOriginAllowed,
  getForwardedProto,
  getTrustProxySetting,
  passwordResetRateLimiter,
  paymentReadRateLimiter,
  paymentWriteRateLimiter,
};
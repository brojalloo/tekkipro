// Tekkipro - Serveur principal v2.0 — Architecture modulaire
require('dotenv').config();
const { validateEnvironment } = require('./config/env');
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');

const { registerRoutes } = require('./app/routes');
const { AppError } = require('./common/errors/AppError');
const { badRequest, error: sendError } = require('./common/utils/response');
const {
  applySecurityHeaders,
  createCorsOptions,
  enforceOriginAllowlist,
  getTrustProxySetting,
  globalRateLimiter,
} = require('./middleware/security.middleware');
const { stripeWebhook } = require('./modules/payments/payment.controller');
const { startSubscriptionCron } = require('./services/cron.service');

validateEnvironment();

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', getTrustProxySetting());

// Stripe webhook — doit être AVANT express.json() car il a besoin du raw body
app.post('/api/payments/stripe/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

// Middlewares globaux
app.use(compression());
app.use(applySecurityHeaders);
app.use(enforceOriginAllowlist);
app.use(globalRateLimiter);
app.use(cors(createCorsOptions()));
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '100kb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.URLENCODED_BODY_LIMIT || process.env.JSON_BODY_LIMIT || '100kb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Body parse error handler (JSON syntax errors)
app.use((err, req, res, next) => {
  if (err && err.type === 'entity.parse.failed') {
    return badRequest(res, 'Corps JSON invalide.', { code: 'BAD_JSON' });
  }
  if (err && err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return badRequest(res, 'JSON invalide dans le corps de la requête.', { code: 'BAD_JSON' });
  }
  next(err);
});

// Enregistrement de toutes les routes via le module centralisé
registerRoutes(app);

// Error handler global
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const isAppError = err instanceof AppError || err?.isOperational;
  if (status >= 500) {
    console.error(err.stack || err);
  }

  return sendError(
    res,
    status >= 500 && process.env.NODE_ENV === 'production'
      ? 'Erreur interne du serveur'
      : (err.message || 'Erreur interne du serveur'),
    status,
    {
      code: err.code || (isAppError ? 'INTERNAL_ERROR' : undefined),
      details: err.details,
      ...(err.meta || {}),
    }
  );
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Tekkipro API v2.0 démarrée sur le port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  startSubscriptionCron();
});

// Graceful shutdown
const shutdown = (signal) => {
  console.log(`[${signal}] Arrêt gracieux en cours...`);
  server.close(() => {
    const prisma = require('./config/database');
    prisma.$disconnect().finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

module.exports = app;

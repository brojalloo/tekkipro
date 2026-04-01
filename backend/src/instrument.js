// Doit être importé EN PREMIER dans server.js
const Sentry = require("@sentry/node");

const SENTRY_DSN = process.env.SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV || "production",
    tracesSampleRate: 0.1,
  });
  console.log("[Sentry] Monitoring actif -", process.env.NODE_ENV);
}

module.exports = { Sentry };

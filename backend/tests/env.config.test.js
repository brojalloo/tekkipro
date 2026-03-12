const test = require('node:test');
const assert = require('node:assert/strict');

const envModulePath = require.resolve('../src/config/env');

const withEnv = async (overrides, run) => {
  const previousEnv = { ...process.env };
  Object.keys(process.env).forEach((key) => delete process.env[key]);
  Object.assign(process.env, previousEnv, overrides);
  delete require.cache[envModulePath];

  try {
    await run(require('../src/config/env'));
  } finally {
    Object.keys(process.env).forEach((key) => delete process.env[key]);
    Object.assign(process.env, previousEnv);
    delete require.cache[envModulePath];
  }
};

test('validateEnvironment rejette un JWT_SECRET faible en production', async () => {
  await withEnv({
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    JWT_SECRET: 'changeme_in_production_use_a_long_random_string',
    FRONTEND_URL: 'https://app.tekkipro.com',
    APP_URL: 'https://app.tekkipro.com',
  }, ({ validateEnvironment }) => {
    assert.throws(() => validateEnvironment(), /JWT_SECRET/);
  });
});

test('validateEnvironment accepte une configuration production valide', async () => {
  await withEnv({
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    JWT_SECRET: 'super_long_random_secret_for_tests_1234567890',
    FRONTEND_URL: 'https://app.tekkipro.com',
    APP_URL: 'https://app.tekkipro.com',
    CORS_ORIGINS: 'https://app.tekkipro.com,https://www.tekkipro.com',
    AUTH_RATE_LIMIT_WINDOW_MS: '900000',
    AUTH_RATE_LIMIT_MAX: '10',
  }, ({ validateEnvironment }) => {
    assert.doesNotThrow(() => validateEnvironment());
  });
});

test('validateEnvironment rejette une configuration SMTP partielle même hors production', async () => {
  await withEnv({
    NODE_ENV: 'development',
    SMTP_HOST: 'smtp.example.com',
    SMTP_PORT: '587',
    SMTP_USER: 'demo@example.com',
  }, ({ validateEnvironment }) => {
    assert.throws(() => validateEnvironment(), /SMTP_HOST, SMTP_PORT, SMTP_USER et SMTP_PASS/);
  });
});

test('validateEnvironment accepte une configuration SMTP complète hors production', async () => {
  await withEnv({
    NODE_ENV: 'development',
    SMTP_HOST: 'smtp.example.com',
    SMTP_PORT: '465',
    SMTP_USER: 'demo@example.com',
    SMTP_PASS: 'smtp-password-demo',
    SMTP_SECURE: 'true',
  }, ({ validateEnvironment }) => {
    assert.doesNotThrow(() => validateEnvironment());
  });
});
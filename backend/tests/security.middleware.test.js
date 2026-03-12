const test = require('node:test');
const assert = require('node:assert/strict');

const {
  applySecurityHeaders,
  buildPasswordResetRateLimitKey,
  buildPaymentRateLimitKey,
  passwordResetRateLimiter,
  paymentWriteRateLimiter,
  getForwardedProto,
  getTrustProxySetting,
} = require('../src/middleware/security.middleware');

test('getTrustProxySetting retourne false par défaut et parse les valeurs usuelles', () => {
  const originalValue = process.env.TRUST_PROXY;

  delete process.env.TRUST_PROXY;
  assert.equal(getTrustProxySetting(), false);

  process.env.TRUST_PROXY = '1';
  assert.equal(getTrustProxySetting(), 1);

  process.env.TRUST_PROXY = 'true';
  assert.equal(getTrustProxySetting(), true);

  process.env.TRUST_PROXY = 'loopback';
  assert.equal(getTrustProxySetting(), 'loopback');

  if (originalValue == null) {
    delete process.env.TRUST_PROXY;
  } else {
    process.env.TRUST_PROXY = originalValue;
  }
});

test('getForwardedProto garde le premier proto forwarding', () => {
  const proto = getForwardedProto({ headers: { 'x-forwarded-proto': 'https, http' } });
  assert.equal(proto, 'https');
});

test('applySecurityHeaders ajoute les headers proxy-aware et HSTS sur HTTPS forwardé', () => {
  const headers = {};
  let nextCalled = false;
  const res = {
    setHeader(name, value) {
      headers[name] = value;
    },
  };

  applySecurityHeaders(
    { secure: false, headers: { 'x-forwarded-proto': 'https, http' } },
    res,
    () => { nextCalled = true; }
  );

  assert.equal(nextCalled, true);
  assert.equal(headers['X-Content-Type-Options'], 'nosniff');
  assert.equal(headers['Cross-Origin-Resource-Policy'], 'same-site');
  assert.match(headers['Permissions-Policy'], /camera=\(\)/);
  assert.match(headers['Content-Security-Policy'], /default-src 'none'/);
  assert.match(headers['Strict-Transport-Security'], /max-age=15552000/);
});

test('applySecurityHeaders n’ajoute pas HSTS quand la requête n’est pas HTTPS', () => {
  const headers = {};
  const res = {
    setHeader(name, value) {
      headers[name] = value;
    },
  };

  applySecurityHeaders({ secure: false, headers: { 'x-forwarded-proto': 'http' } }, res, () => {});

  assert.equal(headers['Strict-Transport-Security'], undefined);
});

test('buildPasswordResetRateLimitKey discrimine la route et masque l’identifiant sensible', () => {
  const key = buildPasswordResetRateLimitKey({
    ip: '127.0.0.1',
    route: { path: '/reset-password' },
    body: { token: 'reset-token-123' },
  });

  assert.match(key, /^password-reset:127\.0\.0\.1:\/reset-password:[a-f0-9]{16}$/);
  assert.equal(key.includes('reset-token-123'), false);
});

test('buildPaymentRateLimitKey isole par utilisateur, boutique et route', () => {
  const key = buildPaymentRateLimitKey({
    user: { id: 8, boutiqueId: 3 },
    boutiqueId: 9,
    route: { path: '/wave/initiate' },
  });

  assert.equal(key, 'payment:8:9:/wave/initiate');
});

test('passwordResetRateLimiter bloque après le seuil défini', () => {
  const req = {
    ip: '127.0.0.1',
    route: { path: '/forgot-password' },
    body: { email: 'boss@example.com' },
  };
  const res = {
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.payload = data;
      return this;
    },
  };

  let nextCalls = 0;
  for (let i = 0; i < 5; i += 1) {
    passwordResetRateLimiter(req, res, () => { nextCalls += 1; });
  }

  assert.equal(nextCalls, 5);

  passwordResetRateLimiter(req, res, () => { nextCalls += 1; });

  assert.equal(nextCalls, 5);
  assert.equal(res.statusCode, 429);
  assert.match(res.payload.message, /mot de passe/i);
});

test('paymentWriteRateLimiter limite par utilisateur authentifié et non par IP seule', () => {
  const reqA = {
    ip: '127.0.0.1',
    user: { id: 10, boutiqueId: 5 },
    boutiqueId: 5,
    route: { path: '/wave/initiate' },
  };
  const reqB = {
    ip: '127.0.0.1',
    user: { id: 11, boutiqueId: 5 },
    boutiqueId: 5,
    route: { path: '/wave/initiate' },
  };
  const createRes = () => ({
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.payload = data;
      return this;
    },
  });

  const resA = createRes();
  let nextA = 0;
  for (let i = 0; i < 10; i += 1) {
    paymentWriteRateLimiter(reqA, resA, () => { nextA += 1; });
  }
  assert.equal(nextA, 10);

  paymentWriteRateLimiter(reqA, resA, () => { nextA += 1; });
  assert.equal(nextA, 10);
  assert.equal(resA.statusCode, 429);

  const resB = createRes();
  let nextB = 0;
  paymentWriteRateLimiter(reqB, resB, () => { nextB += 1; });
  assert.equal(nextB, 1);
  assert.equal(resB.statusCode, undefined);
});
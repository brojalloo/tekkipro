const test = require('node:test');
const assert = require('node:assert/strict');

const bcrypt = require('bcryptjs');
const prisma = require('../src/config/database');
const { login, register, resetPassword } = require('../src/modules/auth/auth.controller');
const { createRateLimiter } = require('../src/middleware/security.middleware');

test('login bloque un admin non vérifié même avec un mot de passe valide', async (t) => {
  const originalFindUnique = prisma.user.findUnique;
  const originalCompare = bcrypt.compare;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalSmtpHost = process.env.SMTP_HOST;

  prisma.user.findUnique = async () => ({
    id: 1,
    nom: 'Admin',
    prenom: 'Test',
    email: 'admin@example.com',
    telephone: null,
    role: 'ADMIN',
    actif: true,
    emailVerifie: false,
    tokenVerification: 'pending-token',
    password: 'hashed-password',
    boutiqueId: 12,
    boutique: { id: 12, nom: 'Boutique test', slug: 'boutique-test', plan: 'PRO' },
  });
  bcrypt.compare = async () => true;

  t.after(() => {
    prisma.user.findUnique = originalFindUnique;
    bcrypt.compare = originalCompare;
    process.env.NODE_ENV = originalNodeEnv;
    process.env.SMTP_HOST = originalSmtpHost;
  });

  process.env.NODE_ENV = 'production';
  delete process.env.SMTP_HOST;

  let statusCode = 200;
  let payload = null;
  const req = { body: { email: 'admin@example.com', password: 'secret' } };
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      payload = data;
      return this;
    },
  };

  await login(req, res);

  assert.equal(statusCode, 403);
  assert.equal(payload.success, false);
  assert.equal(payload.code, 'EMAIL_NOT_VERIFIED');
});

test('login autorise un admin non vérifié en développement sans SMTP', async (t) => {
  const originalFindUnique = prisma.user.findUnique;
  const originalCompare = bcrypt.compare;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalSmtpHost = process.env.SMTP_HOST;
  const originalJwtSecret = process.env.JWT_SECRET;
  const originalJwtExpiresIn = process.env.JWT_EXPIRES_IN;

  prisma.user.findUnique = async () => ({
    id: 2,
    nom: 'Admin',
    prenom: 'Dev',
    email: 'admin-dev@example.com',
    telephone: null,
    role: 'ADMIN',
    actif: true,
    emailVerifie: false,
    tokenVerification: 'pending-token',
    password: 'hashed-password',
    boutiqueId: 15,
    boutique: { id: 15, nom: 'Boutique dev', slug: 'boutique-dev', plan: 'PRO' },
  });
  bcrypt.compare = async () => true;
  process.env.NODE_ENV = 'development';
  delete process.env.SMTP_HOST;
  process.env.JWT_SECRET = 'test-secret';
  process.env.JWT_EXPIRES_IN = '1d';

  t.after(() => {
    prisma.user.findUnique = originalFindUnique;
    bcrypt.compare = originalCompare;
    process.env.NODE_ENV = originalNodeEnv;
    process.env.SMTP_HOST = originalSmtpHost;
    process.env.JWT_SECRET = originalJwtSecret;
    process.env.JWT_EXPIRES_IN = originalJwtExpiresIn;
  });

  let statusCode = 200;
  let payload = null;
  const req = { body: { email: 'admin-dev@example.com', password: 'secret' } };
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      payload = data;
      return this;
    },
  };

  await login(req, res);

  assert.equal(statusCode, 200);
  assert.equal(payload.success, true);
  assert.ok(payload.data.token);
});

test('createRateLimiter bloque après le nombre maximum de tentatives', () => {
  const limiter = createRateLimiter({ windowMs: 60_000, max: 2, message: 'Limite atteinte' });
  const req = { ip: '127.0.0.1', path: '/api/auth/login', route: { path: '/login' } };

  let statusCode = 200;
  let payload = null;
  let nextCalls = 0;
  const res = {
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      payload = data;
      return this;
    },
  };

  limiter(req, res, () => { nextCalls += 1; });
  limiter(req, res, () => { nextCalls += 1; });
  limiter(req, res, () => { nextCalls += 1; });

  assert.equal(nextCalls, 2);
  assert.equal(statusCode, 429);
  assert.equal(payload.success, false);
  assert.equal(payload.code, 'RATE_LIMIT_EXCEEDED');
  assert.equal(payload.message, 'Limite atteinte');
  assert.equal(res.headers['X-RateLimit-Limit'], '2');
});

test('register refuse un mot de passe faible avant toute écriture', async () => {
  let statusCode = 200;
  let payload = null;
  const req = {
    body: {
      nomBoutique: 'Boutique Secure',
      slug: 'boutique-secure',
      nom: 'Diallo',
      prenom: 'Ibrahima',
      email: 'secure@example.com',
      password: 'secret123',
      telephone: '770000000',
    },
  };
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      payload = data;
      return this;
    },
  };

  await register(req, res);

  assert.equal(statusCode, 400);
  assert.equal(payload.success, false);
  assert.equal(payload.code, 'WEAK_PASSWORD');
  assert.match(payload.message, /8 caractères/i);
});

test('register demande une activation email avant la première connexion quand la vérification est imposée', async (t) => {
  const originalFindUnique = prisma.user.findUnique;
  const originalFindBoutique = prisma.boutique.findUnique;
  const originalTransaction = prisma.$transaction;
  const originalHash = bcrypt.hash;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalSmtpHost = process.env.SMTP_HOST;

  prisma.user.findUnique = async () => null;
  prisma.boutique.findUnique = async () => null;
  prisma.$transaction = async (callback) => callback({
    boutique: {
      create: async ({ data }) => ({ id: 33, ...data }),
    },
    user: {
      create: async ({ data }) => ({ id: 91, ...data }),
    },
    categorie: {
      create: async () => ({}),
    },
  });
  bcrypt.hash = async () => 'hashed-password';
  process.env.NODE_ENV = 'production';
  delete process.env.SMTP_HOST;

  t.after(() => {
    prisma.user.findUnique = originalFindUnique;
    prisma.boutique.findUnique = originalFindBoutique;
    prisma.$transaction = originalTransaction;
    bcrypt.hash = originalHash;
    process.env.NODE_ENV = originalNodeEnv;
    process.env.SMTP_HOST = originalSmtpHost;
  });

  let statusCode = 200;
  let payload = null;
  const req = {
    body: {
      nomBoutique: 'Boutique Activation',
      slug: 'boutique-activation',
      nom: 'Diallo',
      prenom: 'Awa',
      email: 'awa@example.com',
      password: 'Passer@123',
      telephone: '770000000',
    },
  };
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      payload = data;
      return this;
    },
  };

  await register(req, res);

  assert.equal(statusCode, 201);
  assert.equal(payload.success, true);
  assert.equal(payload.data.requiresEmailVerification, true);
  assert.equal(payload.data.emailVerificationSentTo, 'awa@example.com');
  assert.equal(payload.data.token, undefined);
  assert.match(payload.message, /vérifiez votre email/i);
});

test('resetPassword recherche le token réinitialisation via son hash', async (t) => {
  const originalFindFirst = prisma.user.findFirst;
  const originalUpdate = prisma.user.update;
  const originalHash = bcrypt.hash;
  const recordedWhere = [];
  const updatedPayloads = [];

  prisma.user.findFirst = async (args) => {
    recordedWhere.push(args.where);
    return {
      id: 77,
      tokenResetPassword: args.where.tokenResetPassword,
    };
  };
  prisma.user.update = async (args) => {
    updatedPayloads.push(args);
    return args;
  };
  bcrypt.hash = async () => 'hashed-password';

  t.after(() => {
    prisma.user.findFirst = originalFindFirst;
    prisma.user.update = originalUpdate;
    bcrypt.hash = originalHash;
  });

  let statusCode = 200;
  let payload = null;
  const req = { body: { token: 'reset-token-123', password: 'MotDePasse!2026' } };
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      payload = data;
      return this;
    },
  };

  await resetPassword(req, res);

  assert.equal(statusCode, 200);
  assert.equal(payload.success, true);
  assert.notEqual(recordedWhere[0].tokenResetPassword, 'reset-token-123');
  assert.match(recordedWhere[0].tokenResetPassword, /^[a-f0-9]{64}$/);
  assert.equal(updatedPayloads[0].data.tokenResetPassword, null);
});
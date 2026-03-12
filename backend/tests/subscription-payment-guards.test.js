const test = require('node:test');
const assert = require('node:assert/strict');

const prisma = require('../src/config/database');
const { souscrire, renouveler } = require('../src/modules/abonnements/abonnement.controller');
const {
  initiateWavePayment,
  initiateOrangeMoneyPayment,
  initiateFreeMoneyPayment,
} = require('../src/modules/payments/payment.controller');

const createMockResponse = () => {
  let statusCode = 200;
  let payload = null;

  return {
    get statusCode() {
      return statusCode;
    },
    get payload() {
      return payload;
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
};

test('souscrire refuse les modes automatisés sur la route legacy', async (t) => {
  const originalUpdateMany = prisma.abonnement.updateMany;
  const originalCreate = prisma.abonnement.create;
  const originalBoutiqueUpdate = prisma.boutique.update;
  let mutationCalls = 0;

  prisma.abonnement.updateMany = async () => { mutationCalls += 1; };
  prisma.abonnement.create = async () => { mutationCalls += 1; };
  prisma.boutique.update = async () => { mutationCalls += 1; };

  t.after(() => {
    prisma.abonnement.updateMany = originalUpdateMany;
    prisma.abonnement.create = originalCreate;
    prisma.boutique.update = originalBoutiqueUpdate;
  });

  const res = createMockResponse();

  await souscrire({
    boutiqueId: 7,
    body: { plan: 'PRO', modePaiement: 'STRIPE' },
  }, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.success, false);
  assert.match(res.payload.message, /api\/payments/i);
  assert.equal(mutationCalls, 0);
});

test('renouveler refuse les modes automatisés sur la route legacy', async (t) => {
  const originalFindFirst = prisma.abonnement.findFirst;
  let findFirstCalls = 0;

  prisma.abonnement.findFirst = async () => {
    findFirstCalls += 1;
    return null;
  };

  t.after(() => {
    prisma.abonnement.findFirst = originalFindFirst;
  });

  const res = createMockResponse();

  await renouveler({
    boutiqueId: 8,
    body: { modePaiement: 'WAVE', telephone: '770000000' },
  }, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.success, false);
  assert.match(res.payload.message, /api\/payments/i);
  assert.equal(findFirstCalls, 0);
});

test('initiateWavePayment bloque le mode démo en production', async (t) => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalWaveApiKey = process.env.WAVE_API_KEY;

  process.env.NODE_ENV = 'production';
  delete process.env.WAVE_API_KEY;

  t.after(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.WAVE_API_KEY = originalWaveApiKey;
  });

  const res = createMockResponse();

  await initiateWavePayment({
    boutiqueId: 11,
    body: { plan: 'PRO', type: 'souscrire', telephone: '770000000' },
  }, res);

  assert.equal(res.statusCode, 503);
  assert.equal(res.payload.success, false);
  assert.equal(res.payload.code, 'PAYMENT_PROVIDER_NOT_CONFIGURED');
  assert.match(res.payload.message, /production/i);
});

test('initiateOrangeMoneyPayment bloque le mode démo en production', async (t) => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalApiKey = process.env.ORANGE_MONEY_API_KEY;

  process.env.NODE_ENV = 'production';
  delete process.env.ORANGE_MONEY_API_KEY;

  t.after(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.ORANGE_MONEY_API_KEY = originalApiKey;
  });

  const res = createMockResponse();

  await initiateOrangeMoneyPayment({
    boutiqueId: 12,
    body: { plan: 'PRO', type: 'souscrire', telephone: '780000000' },
  }, res);

  assert.equal(res.statusCode, 503);
  assert.equal(res.payload.success, false);
  assert.equal(res.payload.code, 'PAYMENT_PROVIDER_NOT_CONFIGURED');
  assert.match(res.payload.message, /production/i);
});

test('initiateFreeMoneyPayment bloque le mode démo en production', async (t) => {
  const originalNodeEnv = process.env.NODE_ENV;

  process.env.NODE_ENV = 'production';

  t.after(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  const res = createMockResponse();

  await initiateFreeMoneyPayment({
    boutiqueId: 13,
    body: { plan: 'BUSINESS', type: 'souscrire', telephone: '760000000' },
  }, res);

  assert.equal(res.statusCode, 503);
  assert.equal(res.payload.success, false);
  assert.equal(res.payload.code, 'PAYMENT_PROVIDER_NOT_CONFIGURED');
  assert.match(res.payload.message, /production/i);
});
const test = require('node:test');
const assert = require('node:assert/strict');

const prisma = require('../src/config/database');
const detteController = require('../src/modules/sales/dette.controller');
const { checkPlanVentes } = require('../src/middleware/auth.middleware');

const createMockResponse = () => {
  let statusCode = 200;
  let payload = null;

  return {
    get statusCode() { return statusCode; },
    get payload() { return payload; },
    status(code) { statusCode = code; return this; },
    json(data) { payload = data; return this; },
  };
};

test('dette.rembourser enregistre un remboursement partiel et garde la vente en crédit', async (t) => {
  const originalFindFirst = prisma.dette.findFirst;
  const originalTransaction = prisma.$transaction;
  let remboursementArgs = null;
  let detteUpdateArgs = null;
  let venteUpdateArgs = null;

  prisma.dette.findFirst = async () => ({
    id: 10,
    venteId: 50,
    montantPaye: 200,
    montantRestant: 400,
    statut: 'EN_COURS',
    client: { id: 3, nom: 'Ndiaye' },
    vente: { id: 50, numero: 'VNT-50' },
  });

  prisma.$transaction = async (callback) => callback({
    remboursement: {
      create: async (args) => {
        remboursementArgs = args;
        return args;
      },
    },
    dette: {
      update: async (args) => {
        detteUpdateArgs = args;
        return {
          id: 10,
          statut: 'EN_COURS',
          montantPaye: 350,
          montantRestant: 250,
          client: { id: 3, nom: 'Ndiaye' },
          remboursements: [{ id: 1, montant: 150 }],
        };
      },
    },
    vente: {
      update: async (args) => {
        venteUpdateArgs = args;
        return args;
      },
    },
  });

  t.after(() => {
    prisma.dette.findFirst = originalFindFirst;
    prisma.$transaction = originalTransaction;
  });

  const res = createMockResponse();
  await detteController.rembourser({ boutiqueId: 4, params: { id: '10' }, body: { montant: '150' } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.success, true);
  assert.equal(res.payload.message, 'Remboursement enregistré');
  assert.deepEqual(remboursementArgs, { data: { montant: 150, detteId: 10 } });
  assert.deepEqual(detteUpdateArgs, {
    where: { id: 10 },
    data: { montantPaye: 350, montantRestant: 250, statut: 'EN_COURS' },
    include: { client: true, remboursements: true },
  });
  assert.deepEqual(venteUpdateArgs, {
    where: { id: 50 },
    data: { montantPaye: { increment: 150 }, statut: 'EN_CREDIT' },
  });
});

test('dette.rembourser clôture entièrement la dette et repasse la vente en COMPLETEE', async (t) => {
  const originalFindFirst = prisma.dette.findFirst;
  const originalTransaction = prisma.$transaction;
  let venteUpdateArgs = null;

  prisma.dette.findFirst = async () => ({
    id: 11,
    venteId: 51,
    montantPaye: 100,
    montantRestant: 300,
    statut: 'EN_COURS',
    client: { id: 4, nom: 'Fall' },
    vente: { id: 51, numero: 'VNT-51' },
  });

  prisma.$transaction = async (callback) => callback({
    remboursement: { create: async () => ({ id: 2 }) },
    dette: {
      update: async () => ({
        id: 11,
        statut: 'PAYEE',
        montantPaye: 400,
        montantRestant: 0,
        client: { id: 4, nom: 'Fall' },
        remboursements: [{ id: 2, montant: 300 }],
      }),
    },
    vente: {
      update: async (args) => {
        venteUpdateArgs = args;
        return args;
      },
    },
  });

  t.after(() => {
    prisma.dette.findFirst = originalFindFirst;
    prisma.$transaction = originalTransaction;
  });

  const res = createMockResponse();
  await detteController.rembourser({ boutiqueId: 4, params: { id: '11' }, body: { montant: '300' } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.success, true);
  assert.match(res.payload.message, /entièrement remboursée/i);
  assert.deepEqual(venteUpdateArgs, {
    where: { id: 51 },
    data: { montantPaye: { increment: 300 }, statut: 'COMPLETEE' },
  });
});

test('dette.rembourser refuse un montant supérieur au restant dû', async (t) => {
  const originalFindFirst = prisma.dette.findFirst;

  prisma.dette.findFirst = async () => ({
    id: 12,
    venteId: 52,
    montantPaye: 100,
    montantRestant: 200,
    statut: 'EN_COURS',
    client: { id: 6, nom: 'Sarr' },
    vente: { id: 52, numero: 'VNT-52' },
  });

  t.after(() => {
    prisma.dette.findFirst = originalFindFirst;
  });

  const res = createMockResponse();
  await detteController.rembourser({ boutiqueId: 4, params: { id: '12' }, body: { montant: '250' } }, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.success, false);
  assert.match(res.payload.message, /Montant invalide/i);
});

test('dette.rembourser refuse une dette déjà payée', async (t) => {
  const originalFindFirst = prisma.dette.findFirst;

  prisma.dette.findFirst = async () => ({
    id: 13,
    venteId: 53,
    montantPaye: 500,
    montantRestant: 0,
    statut: 'PAYEE',
    client: { id: 7, nom: 'Ba' },
    vente: { id: 53, numero: 'VNT-53' },
  });

  t.after(() => {
    prisma.dette.findFirst = originalFindFirst;
  });

  const res = createMockResponse();
  await detteController.rembourser({ boutiqueId: 4, params: { id: '13' }, body: { montant: '50' } }, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.success, false);
  assert.match(res.payload.message, /déjà payée/i);
});

test('checkPlanVentes bloque la création quand la limite mensuelle est atteinte', async (t) => {
  const originalFindUnique = prisma.boutique.findUnique;
  const originalCount = prisma.vente.count;
  let nextCalled = false;

  prisma.boutique.findUnique = async () => ({ id: 4, plan: 'GRATUIT' });
  prisma.vente.count = async () => 100;

  t.after(() => {
    prisma.boutique.findUnique = originalFindUnique;
    prisma.vente.count = originalCount;
  });

  const res = createMockResponse();
  await checkPlanVentes({ boutiqueId: 4 }, res, () => { nextCalled = true; });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.equal(res.payload.upgrade, true);
  assert.match(res.payload.message, /100 ventes\/mois/i);
});

test('checkPlanVentes laisse passer quand la boutique reste sous la limite', async (t) => {
  const originalFindUnique = prisma.boutique.findUnique;
  const originalCount = prisma.vente.count;
  let nextCalled = false;

  prisma.boutique.findUnique = async () => ({ id: 4, plan: 'GRATUIT' });
  prisma.vente.count = async () => 12;

  t.after(() => {
    prisma.boutique.findUnique = originalFindUnique;
    prisma.vente.count = originalCount;
  });

  const res = createMockResponse();
  await checkPlanVentes({ boutiqueId: 4 }, res, () => { nextCalled = true; });

  assert.equal(nextCalled, true);
  assert.equal(res.payload, null);
});
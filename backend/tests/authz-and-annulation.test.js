const test = require('node:test');
const assert = require('node:assert/strict');

const prisma = require('../src/config/database');
const venteController = require('../src/modules/sales/vente.controller');
const jwt = require('jsonwebtoken');
const { auth, adminOnly } = require('../src/middleware/auth.middleware');

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

test('adminOnly refuse un employé', () => {
  const res = createMockResponse();
  let nextCalled = false;

  adminOnly({ user: { role: 'EMPLOYE' } }, res, () => { nextCalled = true; });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.equal(res.payload.code, 'ADMIN_ONLY');
  assert.match(res.payload.message, /administrateurs/i);
});

test('adminOnly laisse passer un administrateur', () => {
  const res = createMockResponse();
  let nextCalled = false;

  adminOnly({ user: { role: 'ADMIN' } }, res, () => { nextCalled = true; });

  assert.equal(nextCalled, true);
  assert.equal(res.payload, null);
});

test('auth refuse un token passé uniquement dans la query string', async (t) => {
  const originalVerify = jwt.verify;
  let verifyCalled = false;

  jwt.verify = () => {
    verifyCalled = true;
    return { id: 1 };
  };

  t.after(() => {
    jwt.verify = originalVerify;
  });

  const res = createMockResponse();
  let nextCalled = false;

  await auth({ header: () => undefined, query: { token: 'jwt-in-url' } }, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(verifyCalled, false);
  assert.equal(res.statusCode, 401);
  assert.equal(res.payload.code, 'AUTH_REQUIRED');
  assert.match(res.payload.message, /non autorisé/i);
});

test('vente.annuler restaure le stock et supprime les dettes liées', async (t) => {
  const originalFindFirst = prisma.vente.findFirst;
  const originalTransaction = prisma.$transaction;
  const produitUpdates = [];
  const stockUpserts = [];
  const movementCreates = [];
  const venteUpdates = [];
  const remboursementDeletes = [];
  const detteDeletes = [];

  prisma.vente.findFirst = async () => ({
    id: 21,
    statut: 'EN_CREDIT',
    details: [
      { produitId: 5, quantite: 1, quantiteBase: 3, uniteNom: 'Pack', prixUnitaire: 1200 },
      { produitId: 6, quantite: 2, quantiteBase: 2, uniteNom: 'Pièce', prixUnitaire: 300 },
    ],
  });

  prisma.$transaction = async (callback) => callback({
    produit: {
      update: async (args) => {
        produitUpdates.push(args);
        return args;
      },
    },
    stockBalance: {
      upsert: async (args) => {
        stockUpserts.push(args);
        return args;
      },
    },
    stockMovement: {
      create: async (args) => {
        movementCreates.push(args);
        return args;
      },
    },
    vente: {
      update: async (args) => {
        venteUpdates.push(args);
        return args;
      },
    },
    dette: {
      findMany: async () => ([{ id: 71 }, { id: 72 }]),
      deleteMany: async (args) => {
        detteDeletes.push(args);
        return args;
      },
    },
    remboursement: {
      deleteMany: async (args) => {
        remboursementDeletes.push(args);
        return args;
      },
    },
  });

  t.after(() => {
    prisma.vente.findFirst = originalFindFirst;
    prisma.$transaction = originalTransaction;
  });

  const res = createMockResponse();
  await venteController.annuler({ boutiqueId: 4, user: { id: 9 }, params: { id: '21' } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.success, true);
  assert.equal(produitUpdates.length, 2);
  assert.deepEqual(produitUpdates[0], { where: { id: 5 }, data: { stock: { increment: 3 } } });
  assert.deepEqual(produitUpdates[1], { where: { id: 6 }, data: { stock: { increment: 2 } } });
  assert.equal(stockUpserts.length, 2);
  assert.equal(movementCreates.length, 2);
  assert.equal(movementCreates[0].data.type, 'RETURN');
  assert.equal(movementCreates[0].data.referenceId, 21);
  assert.deepEqual(venteUpdates[0], { where: { id: 21 }, data: { statut: 'ANNULEE' } });
  assert.deepEqual(remboursementDeletes[0], { where: { detteId: { in: [71, 72] } } });
  assert.deepEqual(detteDeletes[0], { where: { id: { in: [71, 72] } } });
});

test('vente.annuler utilise quantite quand quantiteBase est absente et ne supprime rien sans dette', async (t) => {
  const originalFindFirst = prisma.vente.findFirst;
  const originalTransaction = prisma.$transaction;
  const produitUpdates = [];
  const stockUpserts = [];
  const movementCreates = [];
  const remboursementDeletes = [];
  const detteDeletes = [];

  prisma.vente.findFirst = async () => ({
    id: 22,
    statut: 'COMPLETEE',
    details: [
      { produitId: 9, quantite: 4, uniteNom: 'piece', prixUnitaire: 250 },
    ],
  });

  prisma.$transaction = async (callback) => callback({
    produit: {
      update: async (args) => {
        produitUpdates.push(args);
        return args;
      },
    },
    stockBalance: {
      upsert: async (args) => {
        stockUpserts.push(args);
        return args;
      },
    },
    stockMovement: {
      create: async (args) => {
        movementCreates.push(args);
        return args;
      },
    },
    vente: { update: async () => null },
    dette: {
      findMany: async () => [],
      deleteMany: async (args) => {
        detteDeletes.push(args);
        return args;
      },
    },
    remboursement: {
      deleteMany: async (args) => {
        remboursementDeletes.push(args);
        return args;
      },
    },
  });

  t.after(() => {
    prisma.vente.findFirst = originalFindFirst;
    prisma.$transaction = originalTransaction;
  });

  const res = createMockResponse();
  await venteController.annuler({ boutiqueId: 4, user: { id: 9 }, params: { id: '22' } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.success, true);
  assert.deepEqual(produitUpdates[0], { where: { id: 9 }, data: { stock: { increment: 4 } } });
  assert.deepEqual(stockUpserts[0].update, { stockBase: { increment: 4 }, dernierMouvement: stockUpserts[0].update.dernierMouvement });
  assert.equal(movementCreates[0].data.quantiteBase, 4);
  assert.equal(remboursementDeletes.length, 0);
  assert.equal(detteDeletes.length, 0);
});
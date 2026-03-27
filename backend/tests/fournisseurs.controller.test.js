const test = require('node:test');
const assert = require('node:assert/strict');

const prisma = require('../src/config/database');
const fournisseurController = require('../src/modules/suppliers/fournisseur.controller');

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

// ─── getAll ────────────────────────────────────────────────────────────────

test('fournisseur.getAll retourne la liste paginée', async (t) => {
  const orig = prisma.$transaction;
  prisma.$transaction = async () => [
    [{ id: 1, nom: 'Dakar Import', _count: { produits: 5, entreeStocks: 10 } }],
    1,
  ];
  t.after(() => { prisma.$transaction = orig; });

  const res = createMockResponse();
  await fournisseurController.getAll({ boutiqueId: 1, query: {} }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.success, true);
  assert.equal(res.payload.data[0].nom, 'Dakar Import');
});

test('fournisseur.getAll retourne liste vide sans erreur', async (t) => {
  const orig = prisma.$transaction;
  prisma.$transaction = async () => [[], 0];
  t.after(() => { prisma.$transaction = orig; });

  const res = createMockResponse();
  await fournisseurController.getAll({ boutiqueId: 1, query: { search: 'inconnu' } }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.payload.data, []);
});

// ─── getById ───────────────────────────────────────────────────────────────

test('fournisseur.getById retourne le fournisseur avec produits et entrées', async (t) => {
  const orig = prisma.fournisseur.findFirst;
  prisma.fournisseur.findFirst = async () => ({
    id: 1, nom: 'Dakar Import',
    produits: [{ id: 10, nom: 'Riz' }],
    entreeStocks: [],
  });
  t.after(() => { prisma.fournisseur.findFirst = orig; });

  const res = createMockResponse();
  await fournisseurController.getById({ boutiqueId: 1, params: { id: '1' } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.data.produits.length, 1);
});

test('fournisseur.getById retourne 404 si introuvable', async (t) => {
  const orig = prisma.fournisseur.findFirst;
  prisma.fournisseur.findFirst = async () => null;
  t.after(() => { prisma.fournisseur.findFirst = orig; });

  const res = createMockResponse();
  await fournisseurController.getById({ boutiqueId: 1, params: { id: '99' } }, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.payload.code, 'SUPPLIER_NOT_FOUND');
});

// ─── create ────────────────────────────────────────────────────────────────

test('fournisseur.create crée un fournisseur avec nom, téléphone, email', async (t) => {
  const orig = prisma.fournisseur.create;
  let createdData = null;
  prisma.fournisseur.create = async ({ data }) => { createdData = data; return { id: 5, ...data }; };
  t.after(() => { prisma.fournisseur.create = orig; });

  const res = createMockResponse();
  await fournisseurController.create(
    { boutiqueId: 1, body: { nom: 'Thiès Grossiste', telephone: '76 111 2222', email: 'info@thies.sn', adresse: 'Thiès' } },
    res,
  );

  assert.equal(res.statusCode, 201);
  assert.equal(createdData.nom, 'Thiès Grossiste');
  assert.equal(createdData.email, 'info@thies.sn');
  assert.equal(createdData.boutiqueId, 1);
});

test('fournisseur.create rejette si le nom est absent', async (t) => {
  const res = createMockResponse();
  await fournisseurController.create({ boutiqueId: 1, body: { nom: '' } }, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.code, 'SUPPLIER_NAME_REQUIRED');
});

test('fournisseur.create stocke null pour les champs optionnels absents', async (t) => {
  const orig = prisma.fournisseur.create;
  let createdData = null;
  prisma.fournisseur.create = async ({ data }) => { createdData = data; return { id: 6, ...data }; };
  t.after(() => { prisma.fournisseur.create = orig; });

  const res = createMockResponse();
  await fournisseurController.create({ boutiqueId: 1, body: { nom: 'Minimal' } }, res);

  assert.equal(createdData.telephone, null);
  assert.equal(createdData.email, null);
  assert.equal(createdData.adresse, null);
});

// ─── update ────────────────────────────────────────────────────────────────

test('fournisseur.update met à jour un fournisseur existant', async (t) => {
  const origFind = prisma.fournisseur.findFirst;
  const origUpdate = prisma.fournisseur.update;
  prisma.fournisseur.findFirst = async () => ({ id: 1, nom: 'Dakar Import' });
  prisma.fournisseur.update = async ({ data }) => ({ id: 1, ...data });
  t.after(() => {
    prisma.fournisseur.findFirst = origFind;
    prisma.fournisseur.update = origUpdate;
  });

  const res = createMockResponse();
  await fournisseurController.update(
    { boutiqueId: 1, params: { id: '1' }, body: { nom: 'Dakar Import SARL', telephone: '77 999 8888' } },
    res,
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.success, true);
});

test('fournisseur.update retourne 404 si fournisseur introuvable', async (t) => {
  const orig = prisma.fournisseur.findFirst;
  prisma.fournisseur.findFirst = async () => null;
  t.after(() => { prisma.fournisseur.findFirst = orig; });

  const res = createMockResponse();
  await fournisseurController.update({ boutiqueId: 1, params: { id: '99' }, body: { nom: 'X' } }, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.payload.code, 'SUPPLIER_NOT_FOUND');
});

// ─── remove ────────────────────────────────────────────────────────────────

test('fournisseur.remove supprime un fournisseur sans produits associés', async (t) => {
  const origFind = prisma.fournisseur.findFirst;
  const origDelete = prisma.fournisseur.delete;
  prisma.fournisseur.findFirst = async () => ({ id: 1, nom: 'Vieux Fournisseur' });
  prisma.fournisseur.delete = async () => ({});
  t.after(() => {
    prisma.fournisseur.findFirst = origFind;
    prisma.fournisseur.delete = origDelete;
  });

  const res = createMockResponse();
  await fournisseurController.remove({ boutiqueId: 1, params: { id: '1' } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.message, 'Fournisseur supprimé');
});

test('fournisseur.remove retourne 404 si fournisseur introuvable', async (t) => {
  const orig = prisma.fournisseur.findFirst;
  prisma.fournisseur.findFirst = async () => null;
  t.after(() => { prisma.fournisseur.findFirst = orig; });

  const res = createMockResponse();
  await fournisseurController.remove({ boutiqueId: 1, params: { id: '99' } }, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.payload.code, 'SUPPLIER_NOT_FOUND');
});

test('fournisseur.remove retourne erreur métier si fournisseur a des produits/entrées (P2003)', async (t) => {
  const origFind = prisma.fournisseur.findFirst;
  const origDelete = prisma.fournisseur.delete;
  prisma.fournisseur.findFirst = async () => ({ id: 1 });
  prisma.fournisseur.delete = async () => { const err = new Error('FK'); err.code = 'P2003'; throw err; };
  t.after(() => {
    prisma.fournisseur.findFirst = origFind;
    prisma.fournisseur.delete = origDelete;
  });

  const res = createMockResponse();
  await fournisseurController.remove({ boutiqueId: 1, params: { id: '1' } }, res);

  assert.equal(res.statusCode, 500);
  assert.match(res.payload.message, /produits ou entrées/);
});

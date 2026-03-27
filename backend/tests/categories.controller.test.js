const test = require('node:test');
const assert = require('node:assert/strict');

const prisma = require('../src/config/database');
const categorieController = require('../src/modules/catalog/categorie.controller');

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

test('categorie.getAll retourne toutes les catégories de la boutique', async (t) => {
  const orig = prisma.categorie.findMany;
  prisma.categorie.findMany = async () => [
    { id: 1, nom: 'Alimentation', _count: { produits: 12 } },
    { id: 2, nom: 'Boissons', _count: { produits: 5 } },
  ];
  t.after(() => { prisma.categorie.findMany = orig; });

  const res = createMockResponse();
  await categorieController.getAll({ boutiqueId: 1 }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.success, true);
  assert.equal(res.payload.data.length, 2);
  assert.equal(res.payload.data[0].nom, 'Alimentation');
});

test('categorie.getAll retourne liste vide sans erreur', async (t) => {
  const orig = prisma.categorie.findMany;
  prisma.categorie.findMany = async () => [];
  t.after(() => { prisma.categorie.findMany = orig; });

  const res = createMockResponse();
  await categorieController.getAll({ boutiqueId: 1 }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.payload.data, []);
});

// ─── create ────────────────────────────────────────────────────────────────

test('categorie.create crée une nouvelle catégorie', async (t) => {
  const orig = prisma.categorie.create;
  let createdData = null;
  prisma.categorie.create = async ({ data }) => { createdData = data; return { id: 5, ...data }; };
  t.after(() => { prisma.categorie.create = orig; });

  const res = createMockResponse();
  await categorieController.create({ boutiqueId: 1, body: { nom: 'Épicerie' } }, res);

  assert.equal(res.statusCode, 201);
  assert.equal(createdData.nom, 'Épicerie');
  assert.equal(createdData.boutiqueId, 1);
});

test('categorie.create retourne 409 si la catégorie existe déjà (P2002)', async (t) => {
  const orig = prisma.categorie.create;
  prisma.categorie.create = async () => { const err = new Error('Unique'); err.code = 'P2002'; throw err; };
  t.after(() => { prisma.categorie.create = orig; });

  const res = createMockResponse();
  await categorieController.create({ boutiqueId: 1, body: { nom: 'Alimentation' } }, res);

  assert.equal(res.statusCode, 409);
  assert.equal(res.payload.code, 'CATEGORY_DUPLICATE');
});

// ─── update ────────────────────────────────────────────────────────────────

test('categorie.update modifie le nom de la catégorie', async (t) => {
  const origFind = prisma.categorie.findFirst;
  const origUpdate = prisma.categorie.update;
  prisma.categorie.findFirst = async () => ({ id: 1, nom: 'Alimentation' });
  prisma.categorie.update = async ({ data }) => ({ id: 1, ...data });
  t.after(() => {
    prisma.categorie.findFirst = origFind;
    prisma.categorie.update = origUpdate;
  });

  const res = createMockResponse();
  await categorieController.update({ boutiqueId: 1, params: { id: '1' }, body: { nom: 'Alimentation & Boissons' } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.success, true);
  assert.equal(res.payload.data.nom, 'Alimentation & Boissons');
});

test('categorie.update retourne 404 si catégorie introuvable', async (t) => {
  const orig = prisma.categorie.findFirst;
  prisma.categorie.findFirst = async () => null;
  t.after(() => { prisma.categorie.findFirst = orig; });

  const res = createMockResponse();
  await categorieController.update({ boutiqueId: 1, params: { id: '99' }, body: { nom: 'X' } }, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.payload.code, 'CATEGORY_NOT_FOUND');
});

test('categorie.update retourne 409 si le nouveau nom est déjà pris (P2002)', async (t) => {
  const origFind = prisma.categorie.findFirst;
  const origUpdate = prisma.categorie.update;
  prisma.categorie.findFirst = async () => ({ id: 1, nom: 'Alimentation' });
  prisma.categorie.update = async () => { const err = new Error('Unique'); err.code = 'P2002'; throw err; };
  t.after(() => {
    prisma.categorie.findFirst = origFind;
    prisma.categorie.update = origUpdate;
  });

  const res = createMockResponse();
  await categorieController.update({ boutiqueId: 1, params: { id: '1' }, body: { nom: 'Boissons' } }, res);

  assert.equal(res.statusCode, 409);
  assert.equal(res.payload.code, 'CATEGORY_DUPLICATE');
});

// ─── remove ────────────────────────────────────────────────────────────────

test('categorie.remove supprime une catégorie sans produits', async (t) => {
  const origFind = prisma.categorie.findFirst;
  const origDelete = prisma.categorie.delete;
  prisma.categorie.findFirst = async () => ({ id: 1, nom: 'Vide' });
  prisma.categorie.delete = async () => ({});
  t.after(() => {
    prisma.categorie.findFirst = origFind;
    prisma.categorie.delete = origDelete;
  });

  const res = createMockResponse();
  await categorieController.remove({ boutiqueId: 1, params: { id: '1' } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.success, true);
  assert.equal(res.payload.message, 'Catégorie supprimée');
});

test('categorie.remove retourne 404 si catégorie introuvable', async (t) => {
  const orig = prisma.categorie.findFirst;
  prisma.categorie.findFirst = async () => null;
  t.after(() => { prisma.categorie.findFirst = orig; });

  const res = createMockResponse();
  await categorieController.remove({ boutiqueId: 1, params: { id: '99' } }, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.payload.code, 'CATEGORY_NOT_FOUND');
});

test('categorie.remove retourne 400 si la catégorie est utilisée par des produits (P2003)', async (t) => {
  const origFind = prisma.categorie.findFirst;
  const origDelete = prisma.categorie.delete;
  prisma.categorie.findFirst = async () => ({ id: 1, nom: 'Alimentation' });
  prisma.categorie.delete = async () => { const err = new Error('FK'); err.code = 'P2003'; throw err; };
  t.after(() => {
    prisma.categorie.findFirst = origFind;
    prisma.categorie.delete = origDelete;
  });

  const res = createMockResponse();
  await categorieController.remove({ boutiqueId: 1, params: { id: '1' } }, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.code, 'CATEGORY_IN_USE');
});

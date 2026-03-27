const test = require('node:test');
const assert = require('node:assert/strict');

const prisma = require('../src/config/database');
const clientController = require('../src/modules/customers/client.controller');

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

test('client.getAll retourne la liste paginée des clients', async (t) => {
  const orig = prisma.$transaction;
  prisma.$transaction = async () => [
    [{ id: 1, nom: 'Diallo', prenom: 'Mamadou', dettes: [], _count: { ventes: 3 } }],
    1,
  ];
  t.after(() => { prisma.$transaction = orig; });

  const res = createMockResponse();
  await clientController.getAll({ boutiqueId: 1, query: {} }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.success, true);
  assert.equal(res.payload.data[0].nom, 'Diallo');
  assert.equal(res.payload.data[0].nombreVentes, 3);
  assert.equal(res.payload.data[0].totalDettes, 0);
});

test('client.getAll calcule totalDettes à partir des dettes EN_COURS', async (t) => {
  const orig = prisma.$transaction;
  prisma.$transaction = async () => [
    [{
      id: 2, nom: 'Ndiaye', prenom: null,
      dettes: [{ montantRestant: 5000 }, { montantRestant: 3000 }],
      _count: { ventes: 1 },
    }],
    1,
  ];
  t.after(() => { prisma.$transaction = orig; });

  const res = createMockResponse();
  await clientController.getAll({ boutiqueId: 1, query: {} }, res);

  assert.equal(res.payload.data[0].totalDettes, 8000);
});

test('client.getAll retourne liste vide sans erreur', async (t) => {
  const orig = prisma.$transaction;
  prisma.$transaction = async () => [[], 0];
  t.after(() => { prisma.$transaction = orig; });

  const res = createMockResponse();
  await clientController.getAll({ boutiqueId: 1, query: {} }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.payload.data, []);
});

// ─── getById ───────────────────────────────────────────────────────────────

test('client.getById retourne le client quand il existe', async (t) => {
  const orig = prisma.client.findFirst;
  prisma.client.findFirst = async () => ({ id: 1, nom: 'Diallo', dettes: [], ventes: [] });
  t.after(() => { prisma.client.findFirst = orig; });

  const res = createMockResponse();
  await clientController.getById({ boutiqueId: 1, params: { id: '1' } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.success, true);
  assert.equal(res.payload.data.nom, 'Diallo');
});

test('client.getById retourne 404 si client introuvable', async (t) => {
  const orig = prisma.client.findFirst;
  prisma.client.findFirst = async () => null;
  t.after(() => { prisma.client.findFirst = orig; });

  const res = createMockResponse();
  await clientController.getById({ boutiqueId: 1, params: { id: '99' } }, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.payload.code, 'CLIENT_NOT_FOUND');
});

// ─── create ────────────────────────────────────────────────────────────────

test('client.create crée un client avec les champs requis', async (t) => {
  const orig = prisma.client.create;
  let createdData = null;
  prisma.client.create = async ({ data }) => { createdData = data; return { id: 10, ...data }; };
  t.after(() => { prisma.client.create = orig; });

  const res = createMockResponse();
  await clientController.create(
    { boutiqueId: 1, body: { nom: 'Sow', prenom: 'Fatou', telephone: '77 000 0000', adresse: 'Dakar' } },
    res,
  );

  assert.equal(res.statusCode, 201);
  assert.equal(createdData.nom, 'Sow');
  assert.equal(createdData.prenom, 'Fatou');
  assert.equal(createdData.boutiqueId, 1);
});

test('client.create rejette si le nom est absent', async (t) => {
  const res = createMockResponse();
  await clientController.create({ boutiqueId: 1, body: { nom: '' } }, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.code, 'CLIENT_NAME_REQUIRED');
});

test('client.create supprime les espaces du nom', async (t) => {
  const orig = prisma.client.create;
  let createdData = null;
  prisma.client.create = async ({ data }) => { createdData = data; return { id: 11, ...data }; };
  t.after(() => { prisma.client.create = orig; });

  const res = createMockResponse();
  await clientController.create({ boutiqueId: 1, body: { nom: '  Ba  ' } }, res);

  assert.equal(createdData.nom, 'Ba');
});

// ─── update ────────────────────────────────────────────────────────────────

test('client.update met à jour un client existant', async (t) => {
  const origFind = prisma.client.findFirst;
  const origUpdate = prisma.client.update;
  prisma.client.findFirst = async () => ({ id: 1, nom: 'Diallo' });
  prisma.client.update = async ({ data }) => ({ id: 1, ...data });
  t.after(() => {
    prisma.client.findFirst = origFind;
    prisma.client.update = origUpdate;
  });

  const res = createMockResponse();
  await clientController.update(
    { boutiqueId: 1, params: { id: '1' }, body: { nom: 'Diallo Modifié' } },
    res,
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.success, true);
});

test('client.update retourne 404 si client introuvable', async (t) => {
  const orig = prisma.client.findFirst;
  prisma.client.findFirst = async () => null;
  t.after(() => { prisma.client.findFirst = orig; });

  const res = createMockResponse();
  await clientController.update({ boutiqueId: 1, params: { id: '99' }, body: { nom: 'X' } }, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.payload.code, 'CLIENT_NOT_FOUND');
});

test('client.update rejette si le nom est vide lors de la mise à jour', async (t) => {
  const orig = prisma.client.findFirst;
  prisma.client.findFirst = async () => ({ id: 1, nom: 'Diallo' });
  t.after(() => { prisma.client.findFirst = orig; });

  const res = createMockResponse();
  await clientController.update({ boutiqueId: 1, params: { id: '1' }, body: { nom: '  ' } }, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.code, 'CLIENT_NAME_REQUIRED');
});

// ─── remove ────────────────────────────────────────────────────────────────

test('client.remove supprime un client existant', async (t) => {
  const origFind = prisma.client.findFirst;
  const origDelete = prisma.client.delete;
  prisma.client.findFirst = async () => ({ id: 1, nom: 'Diallo' });
  prisma.client.delete = async () => ({});
  t.after(() => {
    prisma.client.findFirst = origFind;
    prisma.client.delete = origDelete;
  });

  const res = createMockResponse();
  await clientController.remove({ boutiqueId: 1, params: { id: '1' } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.success, true);
  assert.equal(res.payload.message, 'Client supprimé');
});

test('client.remove retourne 404 si client introuvable', async (t) => {
  const orig = prisma.client.findFirst;
  prisma.client.findFirst = async () => null;
  t.after(() => { prisma.client.findFirst = orig; });

  const res = createMockResponse();
  await clientController.remove({ boutiqueId: 1, params: { id: '99' } }, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.payload.code, 'CLIENT_NOT_FOUND');
});

test('client.remove retourne erreur métier si le client a des ventes/dettes (P2003)', async (t) => {
  const origFind = prisma.client.findFirst;
  const origDelete = prisma.client.delete;
  prisma.client.findFirst = async () => ({ id: 1 });
  prisma.client.delete = async () => { const err = new Error('FK'); err.code = 'P2003'; throw err; };
  t.after(() => {
    prisma.client.findFirst = origFind;
    prisma.client.delete = origDelete;
  });

  const res = createMockResponse();
  await clientController.remove({ boutiqueId: 1, params: { id: '1' } }, res);

  assert.equal(res.statusCode, 500);
  assert.match(res.payload.message, /ventes ou dettes/);
});

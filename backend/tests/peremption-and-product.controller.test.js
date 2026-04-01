const test = require('node:test');
const assert = require('node:assert/strict');

const prisma = require('../src/config/database');
const { normalizePeremptionPayload, getPeremptionStatus } = require('../src/common/utils/peremption');
const { create, update, addUniteVente, removeUniteVente, updateUniteVente } = require('../src/modules/catalog/produit.controller');
const { getInventaire } = require('../src/modules/inventory/stock.controller');

// Global mock: getInventaire uses Promise.all([findMany, count])
const _origCountPeremption = prisma.produit.count;
prisma.produit.count = async () => 0;


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

const formatDateOnly = (offsetDays) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
};

test('normalizePeremptionPayload applique le seuil par défaut quand seule la date est fournie', () => {
  const result = normalizePeremptionPayload({ datePeremption: '2026-03-20' });

  assert.equal(result.error, undefined);
  assert.equal(result.data.alertePeremptionJours, 30);
  assert.equal(result.data.datePeremption.toISOString().slice(0, 10), '2026-03-20');
});

test('normalizePeremptionPayload rejette une alerte sans date de péremption', () => {
  const result = normalizePeremptionPayload({ alertePeremptionJours: '7' });

  assert.match(result.error, /date de péremption/i);
});

test('getPeremptionStatus marque un produit comme expiré avec le bon nombre de jours', () => {
  const result = getPeremptionStatus(
    { datePeremption: '2026-03-01', alertePeremptionJours: 5 },
    new Date('2026-03-05T09:00:00.000Z')
  );

  assert.equal(result.estExpire, true);
  assert.equal(result.enAlertePeremption, false);
  assert.equal(result.joursAvantPeremption, -4);
});

test('create persiste la péremption et son seuil dans le contrôleur catalogue', async (t) => {
  const originalCreate = prisma.produit.create;
  const originalFindFirst = prisma.produit.findFirst;
  let createArgs = null;

  prisma.produit.create = async (args) => { createArgs = args; return { id: 91 }; };
  prisma.produit.findFirst = async () => ({ id: 91, nom: 'Café Maxwell', unitesVente: [], categorie: null });

  t.after(() => {
    prisma.produit.create = originalCreate;
    prisma.produit.findFirst = originalFindFirst;
  });

  const res = createMockResponse();

  await create({
    boutiqueId: 3,
    user: { id: 0 },
    body: {
      nom: 'Café Maxwell',
      prixVente: '300',
      prixAchat: '200',
      stock: '10',
      stockAlerte: '2',
      datePeremption: '2026-03-20',
      alertePeremptionJours: '7',
    },
  }, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.payload.success, true);
  assert.equal(createArgs.data.alertePeremptionJours, 7);
  assert.equal(createArgs.data.datePeremption.toISOString().slice(0, 10), '2026-03-20');
});

test('create interprète correctement estDefaut en chaîne dans les unités manuelles', async (t) => {
  const originalCreate = prisma.produit.create;
  const originalFindFirst = prisma.produit.findFirst;
  let createArgs = null;

  prisma.produit.create = async (args) => { createArgs = args; return { id: 191 }; };
  prisma.produit.findFirst = async () => ({ id: 191, nom: 'Riz local', unitesVente: createArgs.data.unitesVente.create, categorie: null });

  t.after(() => {
    prisma.produit.create = originalCreate;
    prisma.produit.findFirst = originalFindFirst;
  });

  const res = createMockResponse();
  await create({
    boutiqueId: 3,
    user: { id: 0 },
    body: {
      nom: 'Riz local',
      prixVente: '300',
      prixAchat: '200',
      stock: '10',
      uniteBase: 'piece',
      unitesVente: [
        { nom: 'Pack 6', facteurConversion: '6', prix: '1800', estDefaut: 'true' },
        { nom: 'Unité', facteurConversion: '1', prix: '300', estDefaut: 'false' },
      ],
    },
  }, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.payload.success, true);
  assert.deepEqual(createArgs.data.unitesVente.create, [
    { nom: 'Pack 6', facteurConversion: 6, prix: 1800, prixAchat: null, estDefaut: true },
    { nom: 'Unité', facteurConversion: 1, prix: 300, prixAchat: null, estDefaut: false },
  ]);
});

test('create remet categorieId et fournisseurId à null quand ils sont vides', async (t) => {
  const originalCreate = prisma.produit.create;
  const originalFindFirst = prisma.produit.findFirst;
  let createArgs = null;

  prisma.produit.create = async (args) => { createArgs = args; return { id: 92 }; };
  prisma.produit.findFirst = async () => ({ id: 92, nom: 'Thé vert', unitesVente: [], categorie: null });

  t.after(() => {
    prisma.produit.create = originalCreate;
    prisma.produit.findFirst = originalFindFirst;
  });

  const res = createMockResponse();

  await create({
    boutiqueId: 3,
    user: { id: 0 },
    body: {
      nom: 'Thé vert',
      prixVente: '500',
      prixAchat: '300',
      stock: '4',
      categorieId: '',
      fournisseurId: '',
    },
  }, res);

  assert.equal(res.statusCode, 201);
  assert.equal(createArgs.data.categorieId, null);
  assert.equal(createArgs.data.fournisseurId, null);
});

test('create retourne une erreur serveur si la création échoue', async (t) => {
  const originalCreate = prisma.produit.create;

  prisma.produit.create = async () => {
    throw new Error('insert failed');
  };

  t.after(() => {
    prisma.produit.create = originalCreate;
  });

  const res = createMockResponse();

  await create({
    boutiqueId: 3,
    user: { id: 0 },
    body: {
      nom: 'Café soluble',
      prixVente: '300',
      prixAchat: '200',
      stock: '10',
    },
  }, res);

  assert.equal(res.statusCode, 500);
  assert.equal(res.payload.success, false);
  assert.match(res.payload.message, /création du produit/i);
});

test('update efface la péremption quand la date est envoyée vide', async (t) => {
  const originalFindFirst = prisma.produit.findFirst;
  const originalUpdate = prisma.produit.update;
  let updateArgs = null;

  prisma.produit.findFirst = async () => ({ id: 64, boutiqueId: 3, datePeremption: new Date('2026-03-20T12:00:00.000Z'), alertePeremptionJours: 7 });
  prisma.produit.update = async (args) => { updateArgs = args; return { id: 64 }; };

  t.after(() => {
    prisma.produit.findFirst = originalFindFirst;
    prisma.produit.update = originalUpdate;
  });

  const res = createMockResponse();

  await update({
    boutiqueId: 3,
    user: { id: 0 },
    params: { id: '64' },
    body: { datePeremption: '', alertePeremptionJours: '' },
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(updateArgs.data.datePeremption, null);
  assert.equal(updateArgs.data.alertePeremptionJours, null);
});

test('update remet categorieId et fournisseurId à null quand ils sont vidés', async (t) => {
  const originalFindFirst = prisma.produit.findFirst;
  const originalUpdate = prisma.produit.update;
  let updateArgs = null;

  prisma.produit.findFirst = async () => ({ id: 64, boutiqueId: 3, categorieId: 2, fournisseurId: 5 });
  prisma.produit.update = async (args) => { updateArgs = args; return { id: 64 }; };

  t.after(() => {
    prisma.produit.findFirst = originalFindFirst;
    prisma.produit.update = originalUpdate;
  });

  const res = createMockResponse();

  await update({
    boutiqueId: 3,
    user: { id: 0 },
    params: { id: '64' },
    body: { categorieId: '', fournisseurId: null },
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(updateArgs.data.categorieId, null);
  assert.equal(updateArgs.data.fournisseurId, null);
});

test('update retourne une erreur serveur si la mise à jour échoue', async (t) => {
  const originalFindFirst = prisma.produit.findFirst;
  const originalUpdate = prisma.produit.update;

  prisma.produit.findFirst = async () => ({ id: 64, boutiqueId: 3, categorieId: 2, fournisseurId: 5 });
  prisma.produit.update = async () => {
    throw new Error('update failed');
  };

  t.after(() => {
    prisma.produit.findFirst = originalFindFirst;
    prisma.produit.update = originalUpdate;
  });

  const res = createMockResponse();

  await update({
    boutiqueId: 3,
    user: { id: 0 },
    params: { id: '64' },
    body: { nom: 'Café soluble' },
  }, res);

  assert.equal(res.statusCode, 500);
  assert.equal(res.payload.success, false);
  assert.match(res.payload.message, /mise à jour/i);
});

test('create refuse un produit automatique sans nombre de conditionnements', async () => {
  const res = createMockResponse();

  await create({
    boutiqueId: 3,
    user: { id: 0 },
    body: {
      nom: 'Riz 50kg',
      commercialMode: 'poids',
      commercialSize: '50',
      prixAchatConditionnement: '18000',
      prixVenteConditionnement: '21000',
      stockAlerte: '1',
    },
  }, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.success, false);
  assert.match(res.payload.message, /nombre de conditionnements est requis/i);
});

test('create refuse un produit automatique avec une taille de conditionnement invalide', async () => {
  const res = createMockResponse();

  await create({
    boutiqueId: 3,
    user: { id: 0 },
    body: {
      nom: 'Carton soda',
      commercialMode: 'carton',
      commercialSize: '0',
      commercialCount: '2',
      prixAchatConditionnement: '10000',
      prixVenteConditionnement: '12000',
    },
  }, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.success, false);
  assert.match(res.payload.message, /taille du conditionnement/i);
});

test('create refuse un produit automatique carton avec un prixVenteDetail négatif', async () => {
  const res = createMockResponse();

  await create({
    boutiqueId: 3,
    user: { id: 0 },
    body: {
      nom: 'Carton soda',
      commercialMode: 'carton',
      commercialSize: '12',
      commercialCount: '2',
      prixAchatConditionnement: '10000',
      prixVenteConditionnement: '12000',
      prixVenteDetail: '-1',
    },
  }, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.success, false);
  assert.match(res.payload.message, /prix de vente unitaire/i);
});

test('create automatique met stockAlerte à 0 quand il est absent', async (t) => {
  const originalCreate = prisma.produit.create;
  const originalFindFirst = prisma.produit.findFirst;
  let createArgs = null;

  prisma.produit.create = async (args) => { createArgs = args; return { id: 112 }; };
  prisma.produit.findFirst = async () => ({ id: 112, nom: 'Carton sucre', unitesVente: createArgs.data.unitesVente.create, categorie: null });

  t.after(() => {
    prisma.produit.create = originalCreate;
    prisma.produit.findFirst = originalFindFirst;
  });

  const res = createMockResponse();

  await create({
    boutiqueId: 3,
    user: { id: 0 },
    body: {
      nom: 'Carton sucre',
      commercialMode: 'carton',
      commercialSize: '6',
      commercialCount: '2',
      prixAchatConditionnement: '2400',
      prixVenteConditionnement: '3600',
    },
  }, res);

  assert.equal(res.statusCode, 201);
  assert.equal(createArgs.data.stock, 12);
  assert.equal(createArgs.data.stockAlerte, 0);
  assert.equal(createArgs.data.prixVente, 600);
});

test('create génère correctement les données d’un produit automatique carton', async (t) => {
  const originalCreate = prisma.produit.create;
  const originalFindFirst = prisma.produit.findFirst;
  let createArgs = null;

  prisma.produit.create = async (args) => { createArgs = args; return { id: 101 }; };
  prisma.produit.findFirst = async () => ({ id: 101, nom: 'Carton soda', unitesVente: createArgs.data.unitesVente.create, categorie: null });

  t.after(() => {
    prisma.produit.create = originalCreate;
    prisma.produit.findFirst = originalFindFirst;
  });

  const res = createMockResponse();

  await create({
    boutiqueId: 3,
    user: { id: 0 },
    body: {
      nom: 'Carton soda',
      commercialMode: 'carton',
      commercialSize: '12',
      commercialCount: '2',
      prixAchatConditionnement: '6000',
      prixVenteConditionnement: '7200',
      prixVenteDetail: '700',
      stockAlerte: '1',
    },
  }, res);

  assert.equal(res.statusCode, 201);
  assert.equal(createArgs.data.uniteBase, 'piece');
  assert.equal(createArgs.data.stock, 24);
  assert.equal(createArgs.data.stockAlerte, 12);
  assert.equal(createArgs.data.prixAchat, 500);
  assert.equal(createArgs.data.prixVente, 700);
  assert.deepEqual(createArgs.data.unitesVente.create, [
    { nom: 'Carton 12 unités', facteurConversion: 12, prix: 7200, prixAchat: 6000, estDefaut: true },
    { nom: 'Unité', facteurConversion: 1, prix: 700, prixAchat: null, estDefaut: false },
  ]);
});

test('create automatique ignore des unités manuelles parasites et garde les unités commerciales générées', async (t) => {
  const originalCreate = prisma.produit.create;
  const originalFindFirst = prisma.produit.findFirst;
  let createArgs = null;

  prisma.produit.create = async (args) => { createArgs = args; return { id: 111 }; };
  prisma.produit.findFirst = async () => ({ id: 111, nom: 'Carton spray', unitesVente: createArgs.data.unitesVente.create, categorie: null });

  t.after(() => {
    prisma.produit.create = originalCreate;
    prisma.produit.findFirst = originalFindFirst;
  });

  const res = createMockResponse();

  await create({
    boutiqueId: 3,
    user: { id: 0 },
    body: {
      nom: 'Carton spray',
      uniteBase: 'kg',
      prixVente: '1',
      commercialMode: 'carton',
      commercialSize: '4',
      commercialCount: '2',
      prixAchatConditionnement: '1000',
      prixVenteConditionnement: '1400',
      unitesVente: [
        { nom: 'Parasite XXL', facteurConversion: '99', prix: '9999', estDefaut: true },
      ],
    },
  }, res);

  assert.equal(res.statusCode, 201);
  assert.equal(createArgs.data.uniteBase, 'piece');
  assert.deepEqual(createArgs.data.unitesVente.create, [
    { nom: 'Carton 4 unités', facteurConversion: 4, prix: 1400, prixAchat: 1000, estDefaut: true },
    { nom: 'Unité', facteurConversion: 1, prix: 350, prixAchat: null, estDefaut: false },
  ]);
});

test('create applique un prixVenteDetail explicite pour un produit automatique carton', async (t) => {
  const originalCreate = prisma.produit.create;
  const originalFindFirst = prisma.produit.findFirst;
  let createArgs = null;

  prisma.produit.create = async (args) => { createArgs = args; return { id: 104 }; };
  prisma.produit.findFirst = async () => ({ id: 104, nom: 'Carton biscuits', unitesVente: createArgs.data.unitesVente.create, categorie: null });

  t.after(() => {
    prisma.produit.create = originalCreate;
    prisma.produit.findFirst = originalFindFirst;
  });

  const res = createMockResponse();

  await create({
    boutiqueId: 3,
    user: { id: 0 },
    body: {
      nom: 'Carton biscuits',
      commercialMode: 'carton',
      commercialSize: '24',
      commercialCount: '1',
      prixAchatConditionnement: '9600',
      prixVenteConditionnement: '12000',
      prixVenteDetail: '525.5',
      stockAlerte: '1',
    },
  }, res);

  assert.equal(res.statusCode, 201);
  assert.equal(createArgs.data.stock, 24);
  assert.equal(createArgs.data.prixAchat, 400);
  assert.equal(createArgs.data.prixVente, 525.5);
  assert.deepEqual(createArgs.data.unitesVente.create, [
    { nom: 'Carton 24 unités', facteurConversion: 24, prix: 12000, prixAchat: 9600, estDefaut: true },
    { nom: 'Unité', facteurConversion: 1, prix: 525.5, prixAchat: null, estDefaut: false },
  ]);
});

test('create conserve 4 décimales sur prixVente mais arrondit à 2 décimales l’unité dérivée explicite', async (t) => {
  const originalCreate = prisma.produit.create;
  const originalFindFirst = prisma.produit.findFirst;
  let createArgs = null;

  prisma.produit.create = async (args) => { createArgs = args; return { id: 108 }; };
  prisma.produit.findFirst = async () => ({ id: 108, nom: 'Carton bonbons', unitesVente: createArgs.data.unitesVente.create, categorie: null });

  t.after(() => {
    prisma.produit.create = originalCreate;
    prisma.produit.findFirst = originalFindFirst;
  });

  const res = createMockResponse();

  await create({
    boutiqueId: 3,
    user: { id: 0 },
    body: {
      nom: 'Carton bonbons',
      commercialMode: 'carton',
      commercialSize: '3',
      commercialCount: '2',
      prixAchatConditionnement: '500',
      prixVenteConditionnement: '1200',
      prixVenteDetail: '333.375',
    },
  }, res);

  assert.equal(res.statusCode, 201);
  assert.equal(createArgs.data.prixVente, 333.375);
  assert.deepEqual(createArgs.data.unitesVente.create, [
    { nom: 'Carton 3 unités', facteurConversion: 3, prix: 1200, prixAchat: 500, estDefaut: true },
    { nom: 'Unité', facteurConversion: 1, prix: 333.38, prixAchat: null, estDefaut: false },
  ]);
});

test('create dérive et arrondit correctement le prix détail d’un carton sans prixVenteDetail explicite', async (t) => {
  const originalCreate = prisma.produit.create;
  const originalFindFirst = prisma.produit.findFirst;
  let createArgs = null;

  prisma.produit.create = async (args) => { createArgs = args; return { id: 106 }; };
  prisma.produit.findFirst = async () => ({ id: 106, nom: 'Carton jus', unitesVente: createArgs.data.unitesVente.create, categorie: null });

  t.after(() => {
    prisma.produit.create = originalCreate;
    prisma.produit.findFirst = originalFindFirst;
  });

  const res = createMockResponse();

  await create({
    boutiqueId: 3,
    user: { id: 0 },
    body: {
      nom: 'Carton jus',
      commercialMode: 'carton',
      commercialSize: '3',
      commercialCount: '2',
      prixAchatConditionnement: '900.9',
      prixVenteConditionnement: '1000',
      stockAlerte: '1.5',
    },
  }, res);

  assert.equal(res.statusCode, 201);
  assert.equal(createArgs.data.stock, 6);
  assert.equal(createArgs.data.stockAlerte, 4.5);
  assert.equal(createArgs.data.prixAchat, 300.3);
  assert.equal(createArgs.data.prixVente, 333.3333);
  assert.deepEqual(createArgs.data.unitesVente.create, [
    { nom: 'Carton 3 unités', facteurConversion: 3, prix: 1000, prixAchat: 900.9, estDefaut: true },
    { nom: 'Unité', facteurConversion: 1, prix: 333.33, prixAchat: null, estDefaut: false },
  ]);
});

test('create génère correctement les données d’un produit automatique poids avec arrondis', async (t) => {
  const originalCreate = prisma.produit.create;
  const originalFindFirst = prisma.produit.findFirst;
  let createArgs = null;

  prisma.produit.create = async (args) => { createArgs = args; return { id: 102 }; };
  prisma.produit.findFirst = async () => ({ id: 102, nom: 'Sac farine', unitesVente: createArgs.data.unitesVente.create, categorie: null });

  t.after(() => {
    prisma.produit.create = originalCreate;
    prisma.produit.findFirst = originalFindFirst;
  });

  const res = createMockResponse();

  await create({
    boutiqueId: 3,
    user: { id: 0 },
    body: {
      nom: 'Sac farine',
      commercialMode: 'poids',
      commercialSize: '1.25',
      commercialCount: '2',
      prixAchatConditionnement: '2500',
      prixVenteConditionnement: '3333',
      stockAlerte: '1',
    },
  }, res);

  assert.equal(res.statusCode, 201);
  assert.equal(createArgs.data.uniteBase, 'g');
  assert.equal(createArgs.data.stock, 2500);
  assert.equal(createArgs.data.stockAlerte, 1250);
  assert.equal(createArgs.data.prixAchat, 2);
  assert.equal(createArgs.data.prixVente, 2.6664);
  assert.deepEqual(createArgs.data.unitesVente.create, [
    { nom: 'Sac 1.25 kg', facteurConversion: 1250, prix: 3333, prixAchat: 2500, estDefaut: true },
    { nom: '1 kg', facteurConversion: 1000, prix: 2666.4, prixAchat: null, estDefaut: false },
    { nom: '500 g', facteurConversion: 500, prix: 1333.2, prixAchat: null, estDefaut: false },
    { nom: '250 g', facteurConversion: 250, prix: 666.6, prixAchat: null, estDefaut: false },
  ]);
});

test('create génère correctement les données d’un produit automatique volume avec arrondis', async (t) => {
  const originalCreate = prisma.produit.create;
  const originalFindFirst = prisma.produit.findFirst;
  let createArgs = null;

  prisma.produit.create = async (args) => { createArgs = args; return { id: 103 }; };
  prisma.produit.findFirst = async () => ({ id: 103, nom: 'Sirop', unitesVente: createArgs.data.unitesVente.create, categorie: null });

  t.after(() => {
    prisma.produit.create = originalCreate;
    prisma.produit.findFirst = originalFindFirst;
  });

  const res = createMockResponse();

  await create({
    boutiqueId: 3,
    user: { id: 0 },
    body: {
      nom: 'Sirop',
      commercialMode: 'volume',
      commercialSize: '1.25',
      commercialCount: '4',
      prixAchatConditionnement: '4321',
      prixVenteConditionnement: '5678',
      stockAlerte: '2',
    },
  }, res);

  assert.equal(res.statusCode, 201);
  assert.equal(createArgs.data.uniteBase, 'ml');
  assert.equal(createArgs.data.stock, 5000);
  assert.equal(createArgs.data.stockAlerte, 2500);
  assert.equal(createArgs.data.prixAchat, 3.4568);
  assert.equal(createArgs.data.prixVente, 4.5424);
  assert.deepEqual(createArgs.data.unitesVente.create, [
    { nom: 'Bidon 1.25 L', facteurConversion: 1250, prix: 5678, prixAchat: 4321, estDefaut: true },
    { nom: '1 L', facteurConversion: 1000, prix: 4542.4, prixAchat: null, estDefaut: false },
    { nom: '1/2 L', facteurConversion: 500, prix: 2271.2, prixAchat: null, estDefaut: false },
    { nom: '1/4 L', facteurConversion: 250, prix: 1135.6, prixAchat: null, estDefaut: false },
    { nom: '1/8 L', facteurConversion: 125, prix: 567.8, prixAchat: null, estDefaut: false },
  ]);
});

test('create gère aussi les prix de conditionnement décimaux en automatique volume', async (t) => {
  const originalCreate = prisma.produit.create;
  const originalFindFirst = prisma.produit.findFirst;
  let createArgs = null;

  prisma.produit.create = async (args) => { createArgs = args; return { id: 105 }; };
  prisma.produit.findFirst = async () => ({ id: 105, nom: 'Huile fine', unitesVente: createArgs.data.unitesVente.create, categorie: null });

  t.after(() => {
    prisma.produit.create = originalCreate;
    prisma.produit.findFirst = originalFindFirst;
  });

  const res = createMockResponse();

  await create({
    boutiqueId: 3,
    user: { id: 0 },
    body: {
      nom: 'Huile fine',
      commercialMode: 'volume',
      commercialSize: '1.2',
      commercialCount: '2',
      prixAchatConditionnement: '4321.92',
      prixVenteConditionnement: '5678.88',
      stockAlerte: '1.5',
    },
  }, res);

  assert.equal(res.statusCode, 201);
  assert.equal(createArgs.data.stock, 2400);
  assert.equal(createArgs.data.stockAlerte, 1800);
  assert.equal(createArgs.data.prixAchat, 3.6016);
  assert.equal(createArgs.data.prixVente, 4.7324);
  assert.deepEqual(createArgs.data.unitesVente.create, [
    { nom: 'Bidon 1.2 L', facteurConversion: 1200, prix: 5678.88, prixAchat: 4321.92, estDefaut: true },
    { nom: '1 L', facteurConversion: 1000, prix: 4732.4, prixAchat: null, estDefaut: false },
    { nom: '1/2 L', facteurConversion: 500, prix: 2366.2, prixAchat: null, estDefaut: false },
    { nom: '1/4 L', facteurConversion: 250, prix: 1183.1, prixAchat: null, estDefaut: false },
    { nom: '1/8 L', facteurConversion: 125, prix: 591.55, prixAchat: null, estDefaut: false },
  ]);
});

test('update régénère correctement les unités d’un produit automatique volume', async (t) => {
  const originalFindFirst = prisma.produit.findFirst;
  const originalUpdate = prisma.produit.update;
  let updateArgs = null;

  prisma.produit.findFirst = async () => ({ id: 64, boutiqueId: 3, nom: 'Huile', uniteBase: 'ml' });
  prisma.produit.update = async (args) => { updateArgs = args; return { id: 64 }; };

  t.after(() => {
    prisma.produit.findFirst = originalFindFirst;
    prisma.produit.update = originalUpdate;
  });

  const res = createMockResponse();

  await update({
    boutiqueId: 3,
    user: { id: 0 },
    params: { id: '64' },
    body: {
      commercialMode: 'volume',
      commercialSize: '5',
      prixAchatConditionnement: '4000',
      prixVenteConditionnement: '5500',
      stockAlerte: '2',
    },
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(updateArgs.data.uniteBase, 'ml');
  assert.equal(updateArgs.data.prixAchat, 0.8);
  assert.equal(updateArgs.data.prixVente, 1.1);
  assert.equal(updateArgs.data.stockAlerte, 10000);
  assert.deepEqual(updateArgs.data.unitesVente, {
    deleteMany: {},
    create: [
      { nom: 'Bidon 5 L', facteurConversion: 5000, prix: 5500, prixAchat: 4000, estDefaut: true },
      { nom: '1 L', facteurConversion: 1000, prix: 1100, prixAchat: null, estDefaut: false },
      { nom: '1/2 L', facteurConversion: 500, prix: 550, prixAchat: null, estDefaut: false },
      { nom: '1/4 L', facteurConversion: 250, prix: 275, prixAchat: null, estDefaut: false },
      { nom: '1/8 L', facteurConversion: 125, prix: 137.5, prixAchat: null, estDefaut: false },
    ],
  });
});

test('update automatique ignore des unités manuelles parasites et régénère uniquement les unités commerciales', async (t) => {
  const originalFindFirst = prisma.produit.findFirst;
  const originalUpdate = prisma.produit.update;
  let updateArgs = null;

  prisma.produit.findFirst = async () => ({ id: 64, boutiqueId: 3, nom: 'Huile', uniteBase: 'ml' });
  prisma.produit.update = async (args) => { updateArgs = args; return { id: 64 }; };

  t.after(() => {
    prisma.produit.findFirst = originalFindFirst;
    prisma.produit.update = originalUpdate;
  });

  const res = createMockResponse();

  await update({
    boutiqueId: 3,
    user: { id: 0 },
    params: { id: '64' },
    body: {
      commercialMode: 'volume',
      commercialSize: '2',
      commercialCount: '3',
      prixAchatConditionnement: '2400',
      prixVenteConditionnement: '3600',
      stockAlerte: '1',
      unitesVente: [
        { nom: 'Bidon pirate', facteurConversion: '999', prix: '9999', estDefaut: true },
      ],
    },
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(updateArgs.data.uniteBase, 'ml');
  assert.deepEqual(updateArgs.data.unitesVente, {
    deleteMany: {},
    create: [
      { nom: 'Bidon 2 L', facteurConversion: 2000, prix: 3600, prixAchat: 2400, estDefaut: true },
      { nom: '1 L', facteurConversion: 1000, prix: 1800, prixAchat: null, estDefaut: false },
      { nom: '1/2 L', facteurConversion: 500, prix: 900, prixAchat: null, estDefaut: false },
      { nom: '1/4 L', facteurConversion: 250, prix: 450, prixAchat: null, estDefaut: false },
      { nom: '1/8 L', facteurConversion: 125, prix: 225, prixAchat: null, estDefaut: false },
    ],
  });
});

test('update bascule un produit manuel vers un carton automatique avec prixVenteDetail explicite', async (t) => {
  const originalFindFirst = prisma.produit.findFirst;
  const originalUpdate = prisma.produit.update;
  let updateArgs = null;

  prisma.produit.findFirst = async () => ({ id: 64, boutiqueId: 3, nom: 'Boisson manuelle', uniteBase: 'piece' });
  prisma.produit.update = async (args) => { updateArgs = args; return { id: 64 }; };

  t.after(() => {
    prisma.produit.findFirst = originalFindFirst;
    prisma.produit.update = originalUpdate;
  });

  const res = createMockResponse();

  await update({
    boutiqueId: 3,
    user: { id: 0 },
    params: { id: '64' },
    body: {
      stock: '999',
      prixVente: '9999',
      uniteBase: 'kg',
      commercialMode: 'carton',
      commercialSize: '6',
      commercialCount: '3',
      prixAchatConditionnement: '2100',
      prixVenteConditionnement: '3600',
      prixVenteDetail: '650.25',
      stockAlerte: '2',
    },
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(updateArgs.data.stock, 18);
  assert.equal(updateArgs.data.stockAlerte, 12);
  assert.equal(updateArgs.data.uniteBase, 'piece');
  assert.equal(updateArgs.data.prixAchat, 350);
  assert.equal(updateArgs.data.prixVente, 650.25);
  assert.deepEqual(updateArgs.data.unitesVente, {
    deleteMany: {},
    create: [
      { nom: 'Carton 6 unités', facteurConversion: 6, prix: 3600, prixAchat: 2100, estDefaut: true },
      { nom: 'Unité', facteurConversion: 1, prix: 650.25, prixAchat: null, estDefaut: false },
    ],
  });
});

test('update conserve le stock manuel quand un produit automatique est mis à jour sans nombre de conditionnements', async (t) => {
  const originalFindFirst = prisma.produit.findFirst;
  const originalUpdate = prisma.produit.update;
  let updateArgs = null;

  prisma.produit.findFirst = async () => ({ id: 64, boutiqueId: 3, nom: 'Jus', uniteBase: 'ml' });
  prisma.produit.update = async (args) => { updateArgs = args; return { id: 64 }; };

  t.after(() => {
    prisma.produit.findFirst = originalFindFirst;
    prisma.produit.update = originalUpdate;
  });

  const res = createMockResponse();

  await update({
    boutiqueId: 3,
    user: { id: 0 },
    params: { id: '64' },
    body: {
      stock: '1450',
      commercialMode: 'volume',
      commercialSize: '1.5',
      prixAchatConditionnement: '1234',
      prixVenteConditionnement: '1999',
      stockAlerte: '2',
    },
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(updateArgs.data.stock, 1450);
  assert.equal(updateArgs.data.stockAlerte, 3000);
  assert.equal(updateArgs.data.prixAchat, 0.8227);
  assert.equal(updateArgs.data.prixVente, 1.3327);
  assert.deepEqual(updateArgs.data.unitesVente.create, [
    { nom: 'Bidon 1.5 L', facteurConversion: 1500, prix: 1999, prixAchat: 1234, estDefaut: true },
    { nom: '1 L', facteurConversion: 1000, prix: 1332.67, prixAchat: null, estDefaut: false },
    { nom: '1/2 L', facteurConversion: 500, prix: 666.33, prixAchat: null, estDefaut: false },
    { nom: '1/4 L', facteurConversion: 250, prix: 333.17, prixAchat: null, estDefaut: false },
    { nom: '1/8 L', facteurConversion: 125, prix: 166.58, prixAchat: null, estDefaut: false },
  ]);
});

test('update laisse le stock inchangé quand un produit automatique est mis à jour sans commercialCount ni stock manuel', async (t) => {
  const originalFindFirst = prisma.produit.findFirst;
  const originalUpdate = prisma.produit.update;
  let updateArgs = null;

  prisma.produit.findFirst = async () => ({ id: 64, boutiqueId: 3, nom: 'Jus', uniteBase: 'ml', stock: 1450 });
  prisma.produit.update = async (args) => { updateArgs = args; return { id: 64 }; };

  t.after(() => {
    prisma.produit.findFirst = originalFindFirst;
    prisma.produit.update = originalUpdate;
  });

  const res = createMockResponse();

  await update({
    boutiqueId: 3,
    user: { id: 0 },
    params: { id: '64' },
    body: {
      commercialMode: 'volume',
      commercialSize: '1.5',
      prixAchatConditionnement: '1234',
      prixVenteConditionnement: '1999',
    },
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(updateArgs.data.stock, undefined);
  assert.equal(updateArgs.data.stockAlerte, undefined);
  assert.equal(updateArgs.data.prixAchat, 0.8227);
  assert.equal(updateArgs.data.prixVente, 1.3327);
  assert.deepEqual(updateArgs.data.unitesVente.create, [
    { nom: 'Bidon 1.5 L', facteurConversion: 1500, prix: 1999, prixAchat: 1234, estDefaut: true },
    { nom: '1 L', facteurConversion: 1000, prix: 1332.67, prixAchat: null, estDefaut: false },
    { nom: '1/2 L', facteurConversion: 500, prix: 666.33, prixAchat: null, estDefaut: false },
    { nom: '1/4 L', facteurConversion: 250, prix: 333.17, prixAchat: null, estDefaut: false },
    { nom: '1/8 L', facteurConversion: 125, prix: 166.58, prixAchat: null, estDefaut: false },
  ]);
});

test('update automatique ignore stockAlerte vide au lieu de le convertir en 0', async (t) => {
  const originalFindFirst = prisma.produit.findFirst;
  const originalUpdate = prisma.produit.update;
  let updateArgs = null;

  prisma.produit.findFirst = async () => ({ id: 64, boutiqueId: 3, nom: 'Jus', uniteBase: 'ml', stockAlerte: 2000 });
  prisma.produit.update = async (args) => { updateArgs = args; return { id: 64 }; };

  t.after(() => {
    prisma.produit.findFirst = originalFindFirst;
    prisma.produit.update = originalUpdate;
  });

  const res = createMockResponse();

  await update({
    boutiqueId: 3,
    user: { id: 0 },
    params: { id: '64' },
    body: {
      commercialMode: 'volume',
      commercialSize: '1.5',
      prixAchatConditionnement: '1234',
      prixVenteConditionnement: '1999',
      stockAlerte: '',
    },
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(updateArgs.data.stockAlerte, undefined);
  assert.equal(updateArgs.data.prixAchat, 0.8227);
  assert.equal(updateArgs.data.prixVente, 1.3327);
});

test('update ignore le stock manuel quand un produit automatique reçoit un nombre de conditionnements', async (t) => {
  const originalFindFirst = prisma.produit.findFirst;
  const originalUpdate = prisma.produit.update;
  let updateArgs = null;

  prisma.produit.findFirst = async () => ({ id: 64, boutiqueId: 3, nom: 'Riz', uniteBase: 'g' });
  prisma.produit.update = async (args) => { updateArgs = args; return { id: 64 }; };

  t.after(() => {
    prisma.produit.findFirst = originalFindFirst;
    prisma.produit.update = originalUpdate;
  });

  const res = createMockResponse();

  await update({
    boutiqueId: 3,
    user: { id: 0 },
    params: { id: '64' },
    body: {
      stock: '9999',
      commercialMode: 'poids',
      commercialSize: '2.5',
      commercialCount: '3',
      prixAchatConditionnement: '3333',
      prixVenteConditionnement: '4444',
      stockAlerte: '1',
    },
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(updateArgs.data.stock, 7500);
  assert.equal(updateArgs.data.stockAlerte, 2500);
  assert.equal(updateArgs.data.prixAchat, 1.3332);
  assert.equal(updateArgs.data.prixVente, 1.7776);
  assert.deepEqual(updateArgs.data.unitesVente.create, [
    { nom: 'Sac 2.5 kg', facteurConversion: 2500, prix: 4444, prixAchat: 3333, estDefaut: true },
    { nom: '1 kg', facteurConversion: 1000, prix: 1777.6, prixAchat: null, estDefaut: false },
    { nom: '500 g', facteurConversion: 500, prix: 888.8, prixAchat: null, estDefaut: false },
    { nom: '250 g', facteurConversion: 250, prix: 444.4, prixAchat: null, estDefaut: false },
  ]);
});

test('update poids automatique arrondit correctement les unités dérivées sur une frontière décimale', async (t) => {
  const originalFindFirst = prisma.produit.findFirst;
  const originalUpdate = prisma.produit.update;
  let updateArgs = null;

  prisma.produit.findFirst = async () => ({ id: 64, boutiqueId: 3, nom: 'Farine', uniteBase: 'g' });
  prisma.produit.update = async (args) => { updateArgs = args; return { id: 64 }; };

  t.after(() => {
    prisma.produit.findFirst = originalFindFirst;
    prisma.produit.update = originalUpdate;
  });

  const res = createMockResponse();

  await update({
    boutiqueId: 3,
    user: { id: 0 },
    params: { id: '64' },
    body: {
      commercialMode: 'poids',
      commercialSize: '1.25',
      commercialCount: '2',
      prixAchatConditionnement: '888.125',
      prixVenteConditionnement: '1111.875',
      stockAlerte: '1',
    },
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(updateArgs.data.prixAchat, 0.7105);
  assert.equal(updateArgs.data.prixVente, 0.8895);
  assert.deepEqual(updateArgs.data.unitesVente.create, [
    { nom: 'Sac 1.25 kg', facteurConversion: 1250, prix: 1111.88, prixAchat: 888.13, estDefaut: true },
    { nom: '1 kg', facteurConversion: 1000, prix: 889.5, prixAchat: null, estDefaut: false },
    { nom: '500 g', facteurConversion: 500, prix: 444.75, prixAchat: null, estDefaut: false },
    { nom: '250 g', facteurConversion: 250, prix: 222.38, prixAchat: null, estDefaut: false },
  ]);
});

test('update applique les champs manuels sans régénérer les unités quand aucun mode automatique n’est fourni', async (t) => {
  const originalFindFirst = prisma.produit.findFirst;
  const originalUpdate = prisma.produit.update;
  let updateArgs = null;

  prisma.produit.findFirst = async () => ({ id: 64, boutiqueId: 3, nom: 'Huile auto', uniteBase: 'ml' });
  prisma.produit.update = async (args) => { updateArgs = args; return { id: 64 }; };

  t.after(() => {
    prisma.produit.findFirst = originalFindFirst;
    prisma.produit.update = originalUpdate;
  });

  const res = createMockResponse();

  await update({
    boutiqueId: 3,
    user: { id: 0 },
    params: { id: '64' },
    body: {
      nom: 'Huile manuelle',
      prixVente: '900',
      prixAchat: '650',
      stock: '17',
      stockAlerte: '4',
      uniteBase: 'piece',
    },
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(updateArgs.data.nom, 'Huile manuelle');
  assert.equal(updateArgs.data.prixVente, 900);
  assert.equal(updateArgs.data.prixAchat, 650);
  assert.equal(updateArgs.data.stock, 17);
  assert.equal(updateArgs.data.stockAlerte, 4);
  assert.equal(updateArgs.data.uniteBase, 'piece');
  assert.equal(updateArgs.data.unitesVente, undefined);
});

test('update ignore les champs numériques vides en mode manuel', async (t) => {
  const originalFindFirst = prisma.produit.findFirst;
  const originalUpdate = prisma.produit.update;
  let updateArgs = null;

  prisma.produit.findFirst = async () => ({ id: 64, boutiqueId: 3, nom: 'Huile auto', uniteBase: 'ml' });
  prisma.produit.update = async (args) => { updateArgs = args; return { id: 64 }; };

  t.after(() => {
    prisma.produit.findFirst = originalFindFirst;
    prisma.produit.update = originalUpdate;
  });

  const res = createMockResponse();

  await update({
    boutiqueId: 3,
    user: { id: 0 },
    params: { id: '64' },
    body: {
      prixVente: '',
      prixAchat: '',
      stock: '',
      stockAlerte: '',
      nom: 'Huile inchangée',
    },
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(updateArgs.data.nom, 'Huile inchangée');
  assert.equal(updateArgs.data.prixVente, undefined);
  assert.equal(updateArgs.data.prixAchat, undefined);
  assert.equal(updateArgs.data.stock, undefined);
  assert.equal(updateArgs.data.stockAlerte, undefined);
  assert.equal(updateArgs.data.unitesVente, undefined);
});

test('update autorise une bascule partielle d’un produit automatique vers un mode manuel', async (t) => {
  const originalFindFirst = prisma.produit.findFirst;
  const originalUpdate = prisma.produit.update;
  let updateArgs = null;

  prisma.produit.findFirst = async () => ({ id: 64, boutiqueId: 3, nom: 'Huile auto', uniteBase: 'ml' });
  prisma.produit.update = async (args) => { updateArgs = args; return { id: 64 }; };

  t.after(() => {
    prisma.produit.findFirst = originalFindFirst;
    prisma.produit.update = originalUpdate;
  });

  const res = createMockResponse();

  await update({
    boutiqueId: 3,
    user: { id: 0 },
    params: { id: '64' },
    body: {
      nom: 'Huile semi-manuelle',
      prixVente: '901.5',
      stock: '22.5',
    },
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(updateArgs.data.nom, 'Huile semi-manuelle');
  assert.equal(updateArgs.data.prixVente, 901.5);
  assert.equal(updateArgs.data.prixAchat, undefined);
  assert.equal(updateArgs.data.stock, 22.5);
  assert.equal(updateArgs.data.stockAlerte, undefined);
  assert.equal(updateArgs.data.uniteBase, undefined);
  assert.equal(updateArgs.data.unitesVente, undefined);
});

test('update bascule un produit manuel vers un volume automatique sans commercialCount en conservant le stock manuel', async (t) => {
  const originalFindFirst = prisma.produit.findFirst;
  const originalUpdate = prisma.produit.update;
  let updateArgs = null;

  prisma.produit.findFirst = async () => ({ id: 64, boutiqueId: 3, nom: 'Boisson manuelle', uniteBase: 'piece' });
  prisma.produit.update = async (args) => { updateArgs = args; return { id: 64 }; };

  t.after(() => {
    prisma.produit.findFirst = originalFindFirst;
    prisma.produit.update = originalUpdate;
  });

  const res = createMockResponse();

  await update({
    boutiqueId: 3,
    user: { id: 0 },
    params: { id: '64' },
    body: {
      stock: '321',
      commercialMode: 'volume',
      commercialSize: '1.5',
      prixAchatConditionnement: '1500.75',
      prixVenteConditionnement: '2250.9',
      stockAlerte: '1.5',
    },
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(updateArgs.data.stock, 321);
  assert.equal(updateArgs.data.stockAlerte, 2250);
  assert.equal(updateArgs.data.uniteBase, 'ml');
  assert.equal(updateArgs.data.prixAchat, 1.0005);
  assert.equal(updateArgs.data.prixVente, 1.5006);
  assert.deepEqual(updateArgs.data.unitesVente, {
    deleteMany: {},
    create: [
      { nom: 'Bidon 1.5 L', facteurConversion: 1500, prix: 2250.9, prixAchat: 1500.75, estDefaut: true },
      { nom: '1 L', facteurConversion: 1000, prix: 1500.6, prixAchat: null, estDefaut: false },
      { nom: '1/2 L', facteurConversion: 500, prix: 750.3, prixAchat: null, estDefaut: false },
      { nom: '1/4 L', facteurConversion: 250, prix: 375.15, prixAchat: null, estDefaut: false },
      { nom: '1/8 L', facteurConversion: 125, prix: 187.58, prixAchat: null, estDefaut: false },
    ],
  });
});

test('addUniteVente refuse les champs requis manquants', async (t) => {
  const originalFindFirst = prisma.produit.findFirst;

  prisma.produit.findFirst = async () => ({ id: 81, nom: 'Sucre' });

  t.after(() => {
    prisma.produit.findFirst = originalFindFirst;
  });

  const res = createMockResponse();
  await addUniteVente({
    boutiqueId: 3,
    params: { produitId: '81' },
    body: { nom: 'Sac 25kg', facteurConversion: '', prix: '' },
  }, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.success, false);
  assert.match(res.payload.message, /facteur de conversion et prix sont requis/i);
});

test('addUniteVente retourne 404 quand le produit est introuvable', async (t) => {
  const originalFindFirst = prisma.produit.findFirst;
  const originalCreate = prisma.uniteVente.create;
  let createCalled = false;

  prisma.produit.findFirst = async () => null;
  prisma.uniteVente.create = async () => {
    createCalled = true;
    return { id: 501 };
  };

  t.after(() => {
    prisma.produit.findFirst = originalFindFirst;
    prisma.uniteVente.create = originalCreate;
  });

  const res = createMockResponse();
  await addUniteVente({
    boutiqueId: 3,
    params: { produitId: '999' },
    body: { nom: 'Pack', facteurConversion: '6', prix: '1800' },
  }, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.payload.success, false);
  assert.match(res.payload.message, /Produit non trouvé/i);
  assert.equal(createCalled, false);
});

test('addUniteVente persiste les valeurs numériques correctement', async (t) => {
  const originalFindFirst = prisma.produit.findFirst;
  const originalTransaction = prisma.$transaction;
  let createArgs = null;

  prisma.produit.findFirst = async () => ({ id: 81, nom: 'Sucre' });
  prisma.$transaction = async (callback) => callback({
    uniteVente: {
      updateMany: async () => ({ count: 0 }),
      create: async (args) => {
        createArgs = args;
        return { id: 501, ...args.data };
      },
    },
  });

  t.after(() => {
    prisma.produit.findFirst = originalFindFirst;
    prisma.$transaction = originalTransaction;
  });

  const res = createMockResponse();
  await addUniteVente({
    boutiqueId: 3,
    params: { produitId: '81' },
    body: { nom: 'Sac 25kg', facteurConversion: '25000', prix: '13000', prixAchat: '11000', estDefaut: true },
  }, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.payload.success, true);
  assert.deepEqual(createArgs, {
    data: {
      nom: 'Sac 25kg',
      facteurConversion: 25000,
      prix: 13000,
      prixAchat: 11000,
      estDefaut: true,
      produitId: 81,
    },
  });
});

test('addUniteVente interprète correctement estDefaut envoyé en chaîne false', async (t) => {
  const originalFindFirst = prisma.produit.findFirst;
  const originalCreate = prisma.uniteVente.create;
  let createArgs = null;

  prisma.produit.findFirst = async () => ({ id: 81, nom: 'Sucre' });
  prisma.uniteVente.create = async (args) => {
    createArgs = args;
    return { id: 502, ...args.data };
  };

  t.after(() => {
    prisma.produit.findFirst = originalFindFirst;
    prisma.uniteVente.create = originalCreate;
  });

  const res = createMockResponse();
  await addUniteVente({
    boutiqueId: 3,
    params: { produitId: '81' },
    body: { nom: 'Pack 6', facteurConversion: '6', prix: '1800', prixAchat: '', estDefaut: 'false' },
  }, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.payload.success, true);
  assert.deepEqual(createArgs, {
    data: {
      nom: 'Pack 6',
      facteurConversion: 6,
      prix: 1800,
      prixAchat: null,
      estDefaut: false,
      produitId: 81,
    },
  });
});

test('addUniteVente retire le défaut des autres unités quand la nouvelle unité devient défaut', async (t) => {
  const originalFindFirst = prisma.produit.findFirst;
  const originalTransaction = prisma.$transaction;
  let updateManyArgs = null;
  let createArgs = null;

  prisma.produit.findFirst = async () => ({ id: 81, nom: 'Sucre' });
  prisma.$transaction = async (callback) => callback({
    uniteVente: {
      updateMany: async (args) => {
        updateManyArgs = args;
        return { count: 2 };
      },
      create: async (args) => {
        createArgs = args;
        return { id: 503, ...args.data };
      },
    },
  });

  t.after(() => {
    prisma.produit.findFirst = originalFindFirst;
    prisma.$transaction = originalTransaction;
  });

  const res = createMockResponse();
  await addUniteVente({
    boutiqueId: 3,
    params: { produitId: '81' },
    body: { nom: 'Pack 12', facteurConversion: '12', prix: '3200', estDefaut: true },
  }, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.payload.success, true);
  assert.deepEqual(updateManyArgs, {
    where: { produitId: 81 },
    data: { estDefaut: false },
  });
  assert.deepEqual(createArgs, {
    data: {
      nom: 'Pack 12',
      facteurConversion: 12,
      prix: 3200,
      prixAchat: null,
      estDefaut: true,
      produitId: 81,
    },
  });
});

test('addUniteVente retourne une erreur serveur si la persistance échoue', async (t) => {
  const originalFindFirst = prisma.produit.findFirst;
  const originalCreate = prisma.uniteVente.create;

  prisma.produit.findFirst = async () => ({ id: 81, nom: 'Sucre' });
  prisma.uniteVente.create = async () => {
    throw new Error('db unavailable');
  };

  t.after(() => {
    prisma.produit.findFirst = originalFindFirst;
    prisma.uniteVente.create = originalCreate;
  });

  const res = createMockResponse();
  await addUniteVente({
    boutiqueId: 3,
    params: { produitId: '81' },
    body: { nom: 'Sac 25kg', facteurConversion: '25000', prix: '13000' },
  }, res);

  assert.equal(res.statusCode, 500);
  assert.equal(res.payload.success, false);
  assert.match(res.payload.message, /Erreur serveur/i);
});

test('removeUniteVente supprime une unité appartenant à la boutique', async (t) => {
  const originalFindFirst = prisma.uniteVente.findFirst;
  const originalDelete = prisma.uniteVente.delete;
  let deleteArgs = null;

  prisma.uniteVente.findFirst = async () => ({ id: 33, produit: { boutiqueId: 3 } });
  prisma.uniteVente.delete = async (args) => {
    deleteArgs = args;
    return { id: 33 };
  };

  t.after(() => {
    prisma.uniteVente.findFirst = originalFindFirst;
    prisma.uniteVente.delete = originalDelete;
  });

  const res = createMockResponse();
  await removeUniteVente({ boutiqueId: 3, params: { uniteId: '33' } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.success, true);
  assert.deepEqual(deleteArgs, { where: { id: 33 } });
});

test('removeUniteVente retourne 404 quand l’unité est absente sans tenter de suppression', async (t) => {
  const originalFindFirst = prisma.uniteVente.findFirst;
  const originalDelete = prisma.uniteVente.delete;
  let deleteCalled = false;

  prisma.uniteVente.findFirst = async () => null;
  prisma.uniteVente.delete = async () => {
    deleteCalled = true;
    return { id: 33 };
  };

  t.after(() => {
    prisma.uniteVente.findFirst = originalFindFirst;
    prisma.uniteVente.delete = originalDelete;
  });

  const res = createMockResponse();
  await removeUniteVente({ boutiqueId: 3, params: { uniteId: '404' } }, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.payload.success, false);
  assert.match(res.payload.message, /Unité non trouvée/i);
  assert.equal(deleteCalled, false);
});

test('removeUniteVente refuse une unité absente ou hors boutique', async (t) => {
  const originalFindFirst = prisma.uniteVente.findFirst;

  prisma.uniteVente.findFirst = async () => ({ id: 33, produit: { boutiqueId: 99 } });

  t.after(() => {
    prisma.uniteVente.findFirst = originalFindFirst;
  });

  const res = createMockResponse();
  await removeUniteVente({ boutiqueId: 3, params: { uniteId: '33' } }, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.payload.success, false);
  assert.match(res.payload.message, /Unité non trouvée/i);
});

test('removeUniteVente retourne une erreur serveur si la suppression échoue', async (t) => {
  const originalFindFirst = prisma.uniteVente.findFirst;
  const originalDelete = prisma.uniteVente.delete;

  prisma.uniteVente.findFirst = async () => ({ id: 33, produit: { boutiqueId: 3 } });
  prisma.uniteVente.delete = async () => {
    throw new Error('delete failed');
  };

  t.after(() => {
    prisma.uniteVente.findFirst = originalFindFirst;
    prisma.uniteVente.delete = originalDelete;
  });

  const res = createMockResponse();
  await removeUniteVente({ boutiqueId: 3, params: { uniteId: '33' } }, res);

  assert.equal(res.statusCode, 500);
  assert.equal(res.payload.success, false);
  assert.match(res.payload.message, /Erreur serveur/i);
});

test('updateUniteVente met à jour les champs numériques et booléens', async (t) => {
  const originalFindFirst = prisma.uniteVente.findFirst;
  const originalTransaction = prisma.$transaction;
  let updateArgs = null;

  prisma.uniteVente.findFirst = async () => ({
    id: 77,
    nom: 'Pack',
    facteurConversion: 6,
    prix: 1200,
    prixAchat: 1000,
    estDefaut: false,
    produit: { boutiqueId: 3 },
  });
  prisma.$transaction = async (callback) => callback({
    uniteVente: {
      updateMany: async () => ({ count: 1 }),
      update: async (args) => {
        updateArgs = args;
        return { id: 77, ...args.data };
      },
    },
  });

  t.after(() => {
    prisma.uniteVente.findFirst = originalFindFirst;
    prisma.$transaction = originalTransaction;
  });

  const res = createMockResponse();
  await updateUniteVente({
    boutiqueId: 3,
    params: { uniteId: '77' },
    body: { nom: 'Pack XXL', facteurConversion: '12', prix: '2300', prixAchat: '', estDefaut: true },
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.success, true);
  assert.deepEqual(updateArgs, {
    where: { id: 77 },
    data: {
      nom: 'Pack XXL',
      facteurConversion: 12,
      prix: 2300,
      prixAchat: null,
      estDefaut: true,
    },
  });
});

test('updateUniteVente conserve les valeurs existantes quand les champs sont omis et accepte estDefaut à false', async (t) => {
  const originalFindFirst = prisma.uniteVente.findFirst;
  const originalUpdate = prisma.uniteVente.update;
  let updateArgs = null;

  prisma.uniteVente.findFirst = async () => ({
    id: 77,
    nom: 'Pack',
    facteurConversion: 6,
    prix: 1200,
    prixAchat: 1000,
    estDefaut: true,
    produit: { boutiqueId: 3 },
  });
  prisma.uniteVente.update = async (args) => {
    updateArgs = args;
    return { id: 77, ...args.data };
  };

  t.after(() => {
    prisma.uniteVente.findFirst = originalFindFirst;
    prisma.uniteVente.update = originalUpdate;
  });

  const res = createMockResponse();
  await updateUniteVente({
    boutiqueId: 3,
    params: { uniteId: '77' },
    body: { nom: '', estDefaut: false },
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.success, true);
  assert.deepEqual(updateArgs, {
    where: { id: 77 },
    data: {
      nom: 'Pack',
      facteurConversion: 6,
      prix: 1200,
      prixAchat: 1000,
      estDefaut: false,
    },
  });
});

test('updateUniteVente interprète estDefaut en chaîne false et vide prixAchat à null', async (t) => {
  const originalFindFirst = prisma.uniteVente.findFirst;
  const originalUpdate = prisma.uniteVente.update;
  let updateArgs = null;

  prisma.uniteVente.findFirst = async () => ({
    id: 77,
    nom: 'Pack',
    facteurConversion: 6,
    prix: 1200,
    prixAchat: 1000,
    estDefaut: true,
    produit: { boutiqueId: 3 },
  });
  prisma.uniteVente.update = async (args) => {
    updateArgs = args;
    return { id: 77, ...args.data };
  };

  t.after(() => {
    prisma.uniteVente.findFirst = originalFindFirst;
    prisma.uniteVente.update = originalUpdate;
  });

  const res = createMockResponse();
  await updateUniteVente({
    boutiqueId: 3,
    params: { uniteId: '77' },
    body: { estDefaut: 'false', prixAchat: '' },
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.success, true);
  assert.deepEqual(updateArgs, {
    where: { id: 77 },
    data: {
      nom: 'Pack',
      facteurConversion: 6,
      prix: 1200,
      prixAchat: null,
      estDefaut: false,
    },
  });
});

test('updateUniteVente retire le défaut des autres unités quand celle-ci devient défaut', async (t) => {
  const originalFindFirst = prisma.uniteVente.findFirst;
  const originalTransaction = prisma.$transaction;
  let updateManyArgs = null;
  let updateArgs = null;

  prisma.uniteVente.findFirst = async () => ({
    id: 77,
    produitId: 81,
    nom: 'Pack',
    facteurConversion: 6,
    prix: 1200,
    prixAchat: 1000,
    estDefaut: false,
    produit: { boutiqueId: 3 },
  });
  prisma.$transaction = async (callback) => callback({
    uniteVente: {
      updateMany: async (args) => {
        updateManyArgs = args;
        return { count: 1 };
      },
      update: async (args) => {
        updateArgs = args;
        return { id: 77, ...args.data };
      },
    },
  });

  t.after(() => {
    prisma.uniteVente.findFirst = originalFindFirst;
    prisma.$transaction = originalTransaction;
  });

  const res = createMockResponse();
  await updateUniteVente({
    boutiqueId: 3,
    params: { uniteId: '77' },
    body: { estDefaut: true },
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.success, true);
  assert.deepEqual(updateManyArgs, {
    where: {
      produitId: 81,
      id: { not: 77 },
    },
    data: { estDefaut: false },
  });
  assert.deepEqual(updateArgs, {
    where: { id: 77 },
    data: {
      nom: 'Pack',
      facteurConversion: 6,
      prix: 1200,
      prixAchat: 1000,
      estDefaut: true,
    },
  });
});

test('updateUniteVente refuse une unité absente ou hors boutique', async (t) => {
  const originalFindFirst = prisma.uniteVente.findFirst;

  prisma.uniteVente.findFirst = async () => ({
    id: 77,
    produit: { boutiqueId: 99 },
  });

  t.after(() => {
    prisma.uniteVente.findFirst = originalFindFirst;
  });

  const res = createMockResponse();
  await updateUniteVente({
    boutiqueId: 3,
    params: { uniteId: '77' },
    body: { nom: 'Pack XXL' },
  }, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.payload.success, false);
  assert.match(res.payload.message, /Unité non trouvée/i);
});

test('updateUniteVente retourne une erreur serveur si la mise à jour échoue', async (t) => {
  const originalFindFirst = prisma.uniteVente.findFirst;
  const originalUpdate = prisma.uniteVente.update;

  prisma.uniteVente.findFirst = async () => ({
    id: 77,
    nom: 'Pack',
    facteurConversion: 6,
    prix: 1200,
    prixAchat: 1000,
    estDefaut: false,
    produit: { boutiqueId: 3 },
  });
  prisma.uniteVente.update = async () => {
    throw new Error('write failed');
  };

  t.after(() => {
    prisma.uniteVente.findFirst = originalFindFirst;
    prisma.uniteVente.update = originalUpdate;
  });

  const res = createMockResponse();
  await updateUniteVente({
    boutiqueId: 3,
    params: { uniteId: '77' },
    body: { prix: '2300' },
  }, res);

  assert.equal(res.statusCode, 500);
  assert.equal(res.payload.success, false);
  assert.match(res.payload.message, /Erreur serveur/i);
});

test('getInventaire remonte une alerte de péremption dans le module inventory', async (t) => {
  const originalFindMany = prisma.produit.findMany;
  const futureDate = formatDateOnly(3);

  prisma.produit.findMany = async () => ([{
    id: 11,
    nom: 'Yaourt nature',
    stock: 12,
    stockAlerte: 2,
    uniteBase: 'piece',
    prixAchat: 250,
    prixVente: 400,
    datePeremption: futureDate,
    alertePeremptionJours: 5,
    categorie: { nom: 'Frais' },
    unitesVente: [],
    _count: { venteDetails: 0 },
  }]);

  t.after(() => {
    prisma.produit.findMany = originalFindMany;
  });

  const res = createMockResponse();
  await getInventaire({ boutiqueId: 3 }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.success, true);
  assert.equal(res.payload.data.produitsEnAlerte, 1);
  assert.equal(res.payload.data.produits[0].enAlertePeremption, true);
  assert.equal(res.payload.data.produits[0].enAlerte, true);
});
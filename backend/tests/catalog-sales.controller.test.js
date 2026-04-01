const test = require('node:test');
const assert = require('node:assert/strict');

const prisma = require('../src/config/database');
const produitController = require('../src/modules/catalog/produit.controller');
const venteController = require('../src/modules/sales/vente.controller');

// Override $transaction for array (read-only parallel): use Promise.all instead of real DB tx
const _origTx = prisma.$transaction.bind(prisma);
prisma.$transaction = async (arrOrFn) => {
  if (Array.isArray(arrOrFn)) return Promise.all(arrOrFn);
  return _origTx(arrOrFn);
};



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

test('produit.getAll filtre les produits en alerte stock quand alerteStock=true', async (t) => {
  const originalFindMany = prisma.produit.findMany;

  const originalCount40 = prisma.produit.count;
  prisma.produit.findMany = async () => ([
    { id: 1, nom: 'Riz', stock: 2, stockAlerte: 5 },
    { id: 2, nom: 'Sucre', stock: 10, stockAlerte: 3 },
  ]);
  prisma.produit.count = async () => 2;

  t.after(() => { prisma.produit.findMany = originalFindMany; prisma.produit.count = originalCount40; });

  const res = createMockResponse();
  await produitController.getAll({ boutiqueId: 4, query: { alerteStock: 'true' } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.success, true);
  assert.equal(res.payload.data.length, 1);
  assert.equal(res.payload.data[0].nom, 'Riz');
});

test('produit.getAll retourne une liste vide quand aucun produit ne correspond', async (t) => {
  const originalFindMany = prisma.produit.findMany;
  let findArgs = null;

  const originalCount41 = prisma.produit.count;
  prisma.produit.findMany = async (args) => {
    findArgs = args;
    return [];
  };
  prisma.produit.count = async () => 0;

  t.after(() => { prisma.produit.findMany = originalFindMany; prisma.produit.count = originalCount41; });

  const res = createMockResponse();
  await produitController.getAll({ boutiqueId: 4, query: { search: 'inconnu' } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.success, true);
  assert.deepEqual(res.payload.data, []);
  assert.deepEqual(findArgs, {
    where: {
      boutiqueId: 4,
      actif: true,
      OR: [
        { nom: { contains: 'inconnu', mode: 'insensitive' } },
        { codeBarre: { contains: 'inconnu' } },
      ],
    },
    include: {
      categorie: true,
      fournisseur: { select: { id: true, nom: true } },
      unitesVente: { orderBy: { estDefaut: 'desc' } },
    },
    orderBy: { nom: 'asc' },
    skip: 0,
    take: 20,
  });
});

test('produit.getAll combine recherche, catégorie et alerte de stock', async (t) => {
  const originalFindMany = prisma.produit.findMany;
  let findArgs = null;

  prisma.produit.findMany = async (args) => {
    findArgs = args;
    return [
      { id: 1, nom: 'Huile', stock: 2, stockAlerte: 3, categorieId: 8 },
      { id: 2, nom: 'Huile premium', stock: 9, stockAlerte: 3, categorieId: 8 },
    ];
  };

  const originalCount42 = prisma.produit.count;
  prisma.produit.count = async () => 2;

  t.after(() => { prisma.produit.findMany = originalFindMany; prisma.produit.count = originalCount42; });

  const res = createMockResponse();
  await produitController.getAll({ boutiqueId: 4, query: { search: 'huile', categorieId: '8', alerteStock: 'true' } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.success, true);
  assert.equal(res.payload.data.length, 1);
  assert.equal(res.payload.data[0].nom, 'Huile');
  assert.deepEqual(findArgs.where, {
    boutiqueId: 4,
    actif: true,
    OR: [
      { nom: { contains: 'huile', mode: 'insensitive' } },
      { codeBarre: { contains: 'huile' } },
    ],
    categorieId: 8,
  });
});

test('produit.getAll retourne une erreur serveur si la lecture échoue', async (t) => {
  const originalFindMany = prisma.produit.findMany;

  prisma.produit.findMany = async () => {
    throw new Error('read failed');
  };

  t.after(() => { prisma.produit.findMany = originalFindMany; });

  const res = createMockResponse();
  await produitController.getAll({ boutiqueId: 4, query: {} }, res);

  assert.equal(res.statusCode, 500);
  assert.equal(res.payload.success, false);
  assert.match(res.payload.message, /Erreur serveur/i);
});

test('produit.getAlertesStock retourne seulement les produits sous le seuil', async (t) => {
  const originalFindMany = prisma.produit.findMany;
  let findArgs = null;

  const origQR44 = prisma.$queryRaw;
  prisma.$queryRaw = async () => [{ id: 1 }];
  prisma.produit.findMany = async (args) => {
    findArgs = args;
    return [
      { id: 1, nom: 'Riz', stock: 2, stockAlerte: 5, categorie: null, unitesVente: [] },
    ];
  };

  t.after(() => { prisma.produit.findMany = originalFindMany; prisma.$queryRaw = origQR44; });

  const res = createMockResponse();
  await produitController.getAlertesStock({ boutiqueId: 4 }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.success, true);
  assert.equal(res.payload.data.length, 1);
  assert.equal(res.payload.data[0].nom, 'Riz');
  assert.deepEqual(findArgs, {
    where: { boutiqueId: 4, actif: true },
    include: { categorie: { select: { nom: true } }, unitesVente: true },
    orderBy: { stock: 'asc' },
  });
});

test('produit.getAlertesStock retourne une liste vide sans alerte stock', async (t) => {
  const originalFindMany = prisma.produit.findMany;
  const origQR45 = prisma.$queryRaw;

  prisma.$queryRaw = async () => [];
  prisma.produit.findMany = async () => ([
    { id: 1, nom: 'Riz', stock: 10, stockAlerte: 5 },
    { id: 2, nom: 'Sucre', stock: 8, stockAlerte: 3 },
  ]);

  t.after(() => { prisma.produit.findMany = originalFindMany; });

  const res = createMockResponse();
  await produitController.getAlertesStock({ boutiqueId: 4 }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.success, true);
  assert.deepEqual(res.payload.data, []);
});

test('produit.getAlertesStock retourne une erreur serveur si la lecture échoue', async (t) => {
  const originalFindMany = prisma.produit.findMany;

  prisma.produit.findMany = async () => {
    throw new Error('alerts failed');
  };

  t.after(() => { prisma.produit.findMany = originalFindMany; });

  const res = createMockResponse();
  await produitController.getAlertesStock({ boutiqueId: 4 }, res);

  assert.equal(res.statusCode, 500);
  assert.equal(res.payload.success, false);
  assert.match(res.payload.message, /Erreur serveur/i);
});

test('produit.remove effectue une désactivation logique', async (t) => {
  const originalFindFirst = prisma.produit.findFirst;
  const originalUpdate = prisma.produit.update;
  let updateArgs = null;

  prisma.produit.findFirst = async () => ({ id: 7, boutiqueId: 4, nom: 'Huile' });
  prisma.produit.update = async (args) => { updateArgs = args; return { id: 7, actif: false }; };

  t.after(() => {
    prisma.produit.findFirst = originalFindFirst;
    prisma.produit.update = originalUpdate;
  });

  const res = createMockResponse();
  await produitController.remove({ boutiqueId: 4, params: { id: '7' }, user: { id: 0 } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.success, true);
  assert.deepEqual(updateArgs, { where: { id: 7 }, data: { actif: false } });
});

test('produit.remove retourne une erreur serveur si la désactivation échoue', async (t) => {
  const originalFindFirst = prisma.produit.findFirst;
  const originalUpdate = prisma.produit.update;

  prisma.produit.findFirst = async () => ({ id: 7, boutiqueId: 4, nom: 'Huile' });
  prisma.produit.update = async () => { throw new Error('update failed'); };

  t.after(() => {
    prisma.produit.findFirst = originalFindFirst;
    prisma.produit.update = originalUpdate;
  });

  const res = createMockResponse();
  await produitController.remove({ boutiqueId: 4, params: { id: '7' } }, res);

  assert.equal(res.statusCode, 500);
  assert.equal(res.payload.success, false);
  assert.match(res.payload.message, /Erreur serveur/i);
});

test('produit.remove retourne une erreur serveur si la lecture initiale échoue', async (t) => {
  const originalFindFirst = prisma.produit.findFirst;
  const originalUpdate = prisma.produit.update;
  let updateCalled = false;

  prisma.produit.findFirst = async () => {
    throw new Error('read failed');
  };
  prisma.produit.update = async () => {
    updateCalled = true;
    return null;
  };

  t.after(() => {
    prisma.produit.findFirst = originalFindFirst;
    prisma.produit.update = originalUpdate;
  });

  const res = createMockResponse();
  await produitController.remove({ boutiqueId: 4, params: { id: '7' } }, res);

  assert.equal(res.statusCode, 500);
  assert.equal(res.payload.success, false);
  assert.match(res.payload.message, /Erreur serveur/i);
  assert.equal(updateCalled, false);
});

test('produit.remove retourne 404 quand le produit est introuvable', async (t) => {
  const originalFindFirst = prisma.produit.findFirst;
  const originalUpdate = prisma.produit.update;
  let updateCalled = false;

  prisma.produit.findFirst = async () => null;
  prisma.produit.update = async () => {
    updateCalled = true;
    return null;
  };

  t.after(() => {
    prisma.produit.findFirst = originalFindFirst;
    prisma.produit.update = originalUpdate;
  });

  const res = createMockResponse();
  await produitController.remove({ boutiqueId: 4, params: { id: '404' } }, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.payload.success, false);
  assert.match(res.payload.message, /Produit non trouvé/i);
  assert.equal(updateCalled, false);
});

test('produit.getById retourne 404 quand le produit est introuvable', async (t) => {
  const originalFindFirst = prisma.produit.findFirst;

  prisma.produit.findFirst = async () => null;

  t.after(() => {
    prisma.produit.findFirst = originalFindFirst;
  });

  const res = createMockResponse();
  await produitController.getById({ boutiqueId: 4, params: { id: '404' } }, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.payload.success, false);
  assert.match(res.payload.message, /Produit non trouvé/i);
});

test('produit.getById retourne une erreur serveur si la lecture échoue', async (t) => {
  const originalFindFirst = prisma.produit.findFirst;

  prisma.produit.findFirst = async () => {
    throw new Error('read failed');
  };

  t.after(() => {
    prisma.produit.findFirst = originalFindFirst;
  });

  const res = createMockResponse();
  await produitController.getById({ boutiqueId: 4, params: { id: '7' } }, res);

  assert.equal(res.statusCode, 500);
  assert.equal(res.payload.success, false);
  assert.match(res.payload.message, /Erreur serveur/i);
});

test('produit.getById retourne le produit détaillé avec ses relations et unités', async (t) => {
  const originalFindFirst = prisma.produit.findFirst;
  let findArgs = null;

  prisma.produit.findFirst = async (args) => {
    findArgs = args;
    return {
      id: 7,
      nom: 'Huile 1L',
      categorie: { id: 3, nom: 'Épicerie' },
      fournisseur: { id: 5, nom: 'Grossiste Dakar' },
      unitesVente: [
        { id: 11, nom: 'Carton', estDefaut: true, facteurConversion: 12, prix: 15000 },
      ],
    };
  };

  t.after(() => {
    prisma.produit.findFirst = originalFindFirst;
  });

  const res = createMockResponse();
  await produitController.getById({ boutiqueId: 4, params: { id: '7' } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.success, true);
  assert.equal(res.payload.data.nom, 'Huile 1L');
  assert.equal(res.payload.data.categorie.nom, 'Épicerie');
  assert.equal(res.payload.data.fournisseur.nom, 'Grossiste Dakar');
  assert.equal(res.payload.data.unitesVente[0].nom, 'Carton');
  assert.deepEqual(findArgs, {
    where: { id: 7, boutiqueId: 4 },
    include: { categorie: true, fournisseur: true, unitesVente: { orderBy: { estDefaut: 'desc' } } },
  });
});

test('produit.getById parse aussi un identifiant textuel tout en gardant le filtre boutique', async (t) => {
  const originalFindFirst = prisma.produit.findFirst;
  let findArgs = null;

  prisma.produit.findFirst = async (args) => {
    findArgs = args;
    return {
      id: 7,
      nom: 'Huile 1L',
      categorie: null,
      fournisseur: null,
      unitesVente: [],
    };
  };

  t.after(() => {
    prisma.produit.findFirst = originalFindFirst;
  });

  const res = createMockResponse();
  await produitController.getById({ boutiqueId: 12, params: { id: '007' } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.success, true);
  assert.equal(res.payload.data.id, 7);
  assert.deepEqual(findArgs, {
    where: { id: 7, boutiqueId: 12 },
    include: { categorie: true, fournisseur: true, unitesVente: { orderBy: { estDefaut: 'desc' } } },
  });
});

test('produit.getById retourne aussi les données de péremption détaillées', async (t) => {
  const originalFindFirst = prisma.produit.findFirst;

  prisma.produit.findFirst = async () => ({
    id: 8,
    nom: 'Yaourt nature',
    datePeremption: new Date('2026-04-15T00:00:00.000Z'),
    alertePeremptionJours: 10,
    categorie: { id: 4, nom: 'Frais' },
    fournisseur: { id: 6, nom: 'Laiterie Dakar' },
    unitesVente: [],
  });

  t.after(() => {
    prisma.produit.findFirst = originalFindFirst;
  });

  const res = createMockResponse();
  await produitController.getById({ boutiqueId: 4, params: { id: '8' } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.success, true);
  assert.equal(res.payload.data.nom, 'Yaourt nature');
  assert.equal(res.payload.data.alertePeremptionJours, 10);
  assert.equal(new Date(res.payload.data.datePeremption).toISOString(), '2026-04-15T00:00:00.000Z');
});

test('produit.remove vérifie la boutique avant de chercher le produit', async (t) => {
  const originalFindFirst = prisma.produit.findFirst;
  let findArgs = null;

  prisma.produit.findFirst = async (args) => {
    findArgs = args;
    return null;
  };

  t.after(() => {
    prisma.produit.findFirst = originalFindFirst;
  });

  const res = createMockResponse();
  await produitController.remove({ boutiqueId: 22, params: { id: '7' } }, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.payload.success, false);
  assert.match(res.payload.message, /Produit non trouvé/i);
  assert.deepEqual(findArgs, {
    where: { id: 7, boutiqueId: 22 },
  });
});

test('vente.create refuse une vente à crédit sans client', async (t) => {
  const originalTransaction = prisma.$transaction;

  prisma.$transaction = async (callback) => callback({
    produit: {
      findFirst: async () => ({ id: 10, nom: 'Yaourt', stock: 12, prixVente: 500, uniteBase: 'piece', unitesVente: [] }),
      update: async () => null,
    },
    stockBalance: { upsert: async () => null },
    vente: { create: async () => { throw new Error('should not create sale'); } },
    dette: { create: async () => null },
    stockMovement: { createMany: async () => null },
  });

  t.after(() => { prisma.$transaction = originalTransaction; });

  const res = createMockResponse();
  await venteController.create({
    boutiqueId: 4,
    user: { id: 9 },
    body: { details: [{ produitId: 10, quantite: 1 }], modePaiement: 'CREDIT' },
  }, res);

  assert.equal(res.statusCode, 400);
  assert.match(res.payload.message, /client est requis/i);
});

test('vente.create refuse une vente quand le stock est insuffisant', async (t) => {
  const originalTransaction = prisma.$transaction;
  let produitUpdated = false;
  let venteCreated = false;

  prisma.$transaction = async (callback) => callback({
    produit: {
      findFirst: async () => ({ id: 10, nom: 'Yaourt', stock: 1, prixVente: 500, uniteBase: 'piece', unitesVente: [] }),
      update: async () => { produitUpdated = true; return null; },
    },
    stockBalance: { upsert: async () => null },
    vente: { create: async () => { venteCreated = true; return null; } },
    dette: { create: async () => null },
    stockMovement: { createMany: async () => null },
  });

  t.after(() => { prisma.$transaction = originalTransaction; });

  const res = createMockResponse();
  await venteController.create({
    boutiqueId: 4,
    user: { id: 9 },
    body: { details: [{ produitId: 10, quantite: 2 }], modePaiement: 'CASH' },
  }, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.success, false);
  assert.match(res.payload.message, /Stock insuffisant pour Yaourt/i);
  assert.equal(produitUpdated, false);
  assert.equal(venteCreated, false);
});

test('vente.create enregistre une dette quand le montant payé est partiel', async (t) => {
  const originalTransaction = prisma.$transaction;
  let venteCreateArgs = null;
  let detteCreateArgs = null;
  let movementArgs = null;

  prisma.$transaction = async (callback) => callback({
    client: { findFirst: async () => ({ id: 3, boutiqueId: 4 }) },
    produit: {
      findFirst: async () => ({ id: 11, nom: 'Lait', stock: 20, prixVente: 300, uniteBase: 'piece', unitesVente: [] }),
      update: async () => null,
    },
    stockBalance: { upsert: async () => null },
    vente: {
      create: async (args) => {
        venteCreateArgs = args;
        return { id: 99, numero: 'VNT-TEST', ...args.data };
      },
    },
    dette: {
      create: async (args) => {
        detteCreateArgs = args;
        return { id: 8, ...args.data };
      },
    },
    stockMovement: {
      createMany: async (args) => {
        movementArgs = args;
        return { count: 1 };
      },
    },
  });

  t.after(() => { prisma.$transaction = originalTransaction; });

  const res = createMockResponse();
  await venteController.create({
    boutiqueId: 4,
    user: { id: 9 },
    body: {
      details: [{ produitId: 11, quantite: 2 }],
      clientId: '3',
      modePaiement: 'CASH',
      montantPaye: '200',
    },
  }, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.payload.success, true);
  assert.equal(venteCreateArgs.data.montantTotal, 600);
  assert.equal(venteCreateArgs.data.montantPaye, 200);
  assert.equal(venteCreateArgs.data.statut, 'EN_CREDIT');
  assert.equal(venteCreateArgs.data.modePaiement, 'CASH');
  assert.equal(detteCreateArgs.data.montantRestant, 400);
  assert.equal(detteCreateArgs.data.clientId, 3);
  assert.equal(movementArgs.data[0].type, 'SALE');
});

test('vente.create enregistre plusieurs lignes et mouvements pour une vente multi-produit', async (t) => {
  const originalTransaction = prisma.$transaction;
  const productUpdates = [];
  const stockUpserts = [];
  let venteCreateArgs = null;
  let movementArgs = null;

  prisma.$transaction = async (callback) => callback({
    produit: {
      findFirst: async ({ where }) => {
        if (where.id === 20) {
          return {
            id: 20,
            nom: 'Jus mangue',
            stock: 15,
            prixVente: 250,
            uniteBase: 'bouteille',
            unitesVente: [],
          };
        }

        return {
          id: 21,
          nom: 'Pack eau',
          stock: 24,
          prixVente: 100,
          uniteBase: 'bouteille',
          unitesVente: [
            { id: 91, nom: 'Pack', facteurConversion: 6, prix: 500 },
          ],
        };
      },
      update: async (args) => {
        productUpdates.push(args);
        return args;
      },
    },
    stockBalance: {
      upsert: async (args) => {
        stockUpserts.push(args);
        return args;
      },
    },
    vente: {
      create: async (args) => {
        venteCreateArgs = args;
        return { id: 120, numero: 'VNT-MULTI', ...args.data };
      },
    },
    dette: { create: async () => null },
    stockMovement: {
      createMany: async (args) => {
        movementArgs = args;
        return { count: args.data.length };
      },
    },
  });

  t.after(() => { prisma.$transaction = originalTransaction; });

  const res = createMockResponse();
  await venteController.create({
    boutiqueId: 4,
    user: { id: 9 },
    body: {
      details: [
        { produitId: 20, quantite: 2 },
        { produitId: 21, quantite: 1, uniteVenteId: 91 },
      ],
      modePaiement: 'CASH',
    },
  }, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.payload.success, true);
  assert.equal(venteCreateArgs.data.montantTotal, 1000);
  assert.equal(venteCreateArgs.data.montantPaye, 1000);
  assert.equal(venteCreateArgs.data.statut, 'COMPLETEE');
  assert.equal(venteCreateArgs.data.details.create.length, 2);
  assert.deepEqual(venteCreateArgs.data.details.create[0], {
    produitId: 20,
    quantite: 2,
    quantiteBase: 2,
    prixUnitaire: 250,
    sousTotal: 500,
    uniteNom: 'bouteille',
  });
  assert.deepEqual(venteCreateArgs.data.details.create[1], {
    produitId: 21,
    quantite: 1,
    quantiteBase: 6,
    prixUnitaire: 500,
    sousTotal: 500,
    uniteNom: 'Pack',
  });
  assert.deepEqual(productUpdates, [
    { where: { id: 20 }, data: { stock: { decrement: 2 } } },
    { where: { id: 21 }, data: { stock: { decrement: 6 } } },
  ]);
  assert.equal(stockUpserts.length, 2);
  assert.equal(movementArgs.data.length, 2);
  assert.deepEqual(movementArgs.data.map((item) => item.quantiteBase), [2, 6]);
  assert.deepEqual(movementArgs.data.map((item) => item.uniteNom), ['bouteille', 'Pack']);
});

test('vente.create refuse une unité de vente introuvable pour un produit', async (t) => {
  const originalTransaction = prisma.$transaction;
  let produitUpdated = false;
  let venteCreated = false;

  prisma.$transaction = async (callback) => callback({
    produit: {
      findFirst: async () => ({
        id: 40,
        nom: 'Pack jus',
        stock: 18,
        prixVente: 300,
        uniteBase: 'bouteille',
        unitesVente: [{ id: 90, nom: 'Pack 6', facteurConversion: 6, prix: 1500 }],
      }),
      update: async () => {
        produitUpdated = true;
        return null;
      },
    },
    stockBalance: { upsert: async () => null },
    vente: { create: async () => { venteCreated = true; return null; } },
    dette: { create: async () => null },
    stockMovement: { createMany: async () => null },
  });

  t.after(() => { prisma.$transaction = originalTransaction; });

  const res = createMockResponse();
  await venteController.create({
    boutiqueId: 4,
    user: { id: 9 },
    body: {
      details: [{ produitId: 40, quantite: 1, uniteVenteId: 999 }],
      modePaiement: 'CASH',
    },
  }, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.success, false);
  assert.match(res.payload.message, /Unité de vente non trouvée pour Pack jus/i);
  assert.equal(produitUpdated, false);
  assert.equal(venteCreated, false);
});

test('vente.annuler refuse une vente déjà annulée', async (t) => {
  const originalFindFirst = prisma.vente.findFirst;

  prisma.vente.findFirst = async () => ({ id: 15, statut: 'ANNULEE', details: [] });

  t.after(() => { prisma.vente.findFirst = originalFindFirst; });

  const res = createMockResponse();
  await venteController.annuler({ boutiqueId: 4, user: { id: 9 }, params: { id: '15' } }, res);

  assert.equal(res.statusCode, 400);
  assert.match(res.payload.message, /déjà annulée/i);
});
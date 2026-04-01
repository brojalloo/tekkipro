const test = require('node:test');
const assert = require('node:assert/strict');

const prisma = require('../src/config/database');
const { entreeStock, getInventaire } = require('../src/modules/inventory/stock.controller');

// Global mock: getInventaire uses Promise.all([findMany, count])
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

test('entreeStock refuse un produit introuvable', async (t) => {
  const originalFindFirst = prisma.produit.findFirst;

  prisma.produit.findFirst = async () => null;

  t.after(() => {
    prisma.produit.findFirst = originalFindFirst;
  });

  const res = createMockResponse();
  await entreeStock({ boutiqueId: 1, body: { produitId: '55', quantite: '3' } }, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.payload.success, false);
  assert.match(res.payload.message, /Produit non trouvé/i);
});

test('entreeStock refuse une unité de vente inconnue', async (t) => {
  const originalFindFirst = prisma.produit.findFirst;

  prisma.produit.findFirst = async () => ({
    id: 55,
    nom: 'Sucre',
    stock: 8,
    prixAchat: 300,
    uniteBase: 'kg',
    unitesVente: [{ id: 9, nom: 'Sac', facteurConversion: 25, prixAchat: 6000 }],
  });

  t.after(() => {
    prisma.produit.findFirst = originalFindFirst;
  });

  const res = createMockResponse();
  await entreeStock({
    boutiqueId: 1,
    body: { produitId: '55', quantite: '1', uniteVenteId: '404' },
  }, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.success, false);
  assert.match(res.payload.message, /Unité de vente non trouvée/i);
});

test('getInventaire valorise Maggi depuis la plus petite unité commerciale quand aucun défaut n’est défini', async (t) => {
  const originalFindMany = prisma.produit.findMany;

  prisma.produit.findMany = async () => ([
    {
      id: 47,
      nom: 'maggi tablette',
      stock: 14400,
      stockAlerte: 3000,
      uniteBase: 'g',
      prixAchat: 25,
      prixVente: 50,
      categorie: { nom: 'Épicerie' },
      _count: { venteDetails: 0 },
      unitesVente: [
        { id: 152, nom: 'paquet maggi', facteurConversion: 600, prixAchat: null, estDefaut: false },
        { id: 153, nom: '3 cube de maggi', facteurConversion: 30, prixAchat: null, estDefaut: false },
        { id: 151, nom: 'cube de maggi', facteurConversion: 10, prixAchat: null, estDefaut: false },
      ],
    },
  ]);

  t.after(() => {
    prisma.produit.findMany = originalFindMany;
  });

  let statusCode = 200;
  let payload = null;

  const req = { boutiqueId: 1 };
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

  await getInventaire(req, res);

  assert.equal(statusCode, 200);
  assert.equal(payload.success, true);
  assert.equal(payload.data.produits.length, 1);
  assert.equal(payload.data.produits[0].valeurStock, 36000);
  assert.equal(payload.data.totalValeurStock, 36000);
});

test('getInventaire valorise Boisson X plus depuis le pack quand le prix produit correspond à l’unité vendue', async (t) => {
  const originalFindMany = prisma.produit.findMany;

  prisma.produit.findMany = async () => ([
    {
      id: 50,
      nom: 'Boisson X plus',
      stock: 21000,
      stockAlerte: 8400,
      uniteBase: 'ml',
      prixAchat: 3200,
      prixVente: 3400,
      categorie: { nom: 'Boissons' },
      _count: { venteDetails: 0 },
      unitesVente: [
        { id: 159, nom: 'X plus', facteurConversion: 350, prix: 300, prixAchat: null, estDefaut: false },
        { id: 158, nom: 'pack X plus', facteurConversion: 4200, prix: 3400, prixAchat: null, estDefaut: false },
      ],
    },
  ]);

  t.after(() => {
    prisma.produit.findMany = originalFindMany;
  });

  let statusCode = 200;
  let payload = null;

  const req = { boutiqueId: 1 };
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

  await getInventaire(req, res);

  assert.equal(statusCode, 200);
  assert.equal(payload.success, true);
  assert.equal(payload.data.produits.length, 1);
  assert.equal(payload.data.produits[0].valeurStock, 16000);
  assert.equal(payload.data.totalValeurStock, 16000);
});
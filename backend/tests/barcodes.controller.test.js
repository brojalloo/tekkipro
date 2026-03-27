const test = require('node:test');
const assert = require('node:assert/strict');

const prisma = require('../src/config/database');
const barcodeController = require('../src/modules/barcodes/barcode.controller');

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

// ─── lookupByBarcode ───────────────────────────────────────────────────────

test('barcode.lookup trouve dans product_barcodes en priorité', async (t) => {
  const orig = prisma.productBarcode.findFirst;
  prisma.productBarcode.findFirst = async () => ({
    barcode: '1234567890',
    uniteId: 2,
    produit: { id: 10, nom: 'Riz 5kg', unitesVente: [] },
  });
  t.after(() => { prisma.productBarcode.findFirst = orig; });

  const res = createMockResponse();
  await barcodeController.lookupByBarcode({ boutiqueId: 1, params: { code: '1234567890' } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.success, true);
  assert.equal(res.payload.source, 'product_barcodes');
  assert.equal(res.payload.data.produit.nom, 'Riz 5kg');
  assert.equal(res.payload.data.uniteId, 2);
});

test('barcode.lookup utilise le fallback produit.codeBarre si pas dans product_barcodes', async (t) => {
  const origBarcodeFind = prisma.productBarcode.findFirst;
  const origProduitFind = prisma.produit.findFirst;
  prisma.productBarcode.findFirst = async () => null;
  prisma.produit.findFirst = async () => ({ id: 5, nom: 'Sucre', unitesVente: [] });
  t.after(() => {
    prisma.productBarcode.findFirst = origBarcodeFind;
    prisma.produit.findFirst = origProduitFind;
  });

  const res = createMockResponse();
  await barcodeController.lookupByBarcode({ boutiqueId: 1, params: { code: '0000000001' } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.source, 'produit_legacy');
  assert.equal(res.payload.data.uniteId, null);
});

test('barcode.lookup retourne 404 si code introuvable dans les deux sources', async (t) => {
  const origBarcodeFind = prisma.productBarcode.findFirst;
  const origProduitFind = prisma.produit.findFirst;
  prisma.productBarcode.findFirst = async () => null;
  prisma.produit.findFirst = async () => null;
  t.after(() => {
    prisma.productBarcode.findFirst = origBarcodeFind;
    prisma.produit.findFirst = origProduitFind;
  });

  const res = createMockResponse();
  await barcodeController.lookupByBarcode({ boutiqueId: 1, params: { code: '9999999999' } }, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.payload.code, 'BARCODE_NOT_FOUND');
});

// ─── getByProduit ──────────────────────────────────────────────────────────

test('barcode.getByProduit retourne tous les codes du produit', async (t) => {
  const orig = prisma.productBarcode.findMany;
  prisma.productBarcode.findMany = async () => [
    { id: 1, barcode: '111', isPrimary: true },
    { id: 2, barcode: '222', isPrimary: false },
  ];
  t.after(() => { prisma.productBarcode.findMany = orig; });

  const res = createMockResponse();
  await barcodeController.getByProduit({ boutiqueId: 1, params: { produitId: '10' } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.success, true);
  assert.equal(res.payload.data.length, 2);
});

test('barcode.getByProduit retourne liste vide si aucun code', async (t) => {
  const orig = prisma.productBarcode.findMany;
  prisma.productBarcode.findMany = async () => [];
  t.after(() => { prisma.productBarcode.findMany = orig; });

  const res = createMockResponse();
  await barcodeController.getByProduit({ boutiqueId: 1, params: { produitId: '10' } }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.payload.data, []);
});

// ─── addBarcode ────────────────────────────────────────────────────────────

test('barcode.add crée un nouveau code-barres', async (t) => {
  const origFind = prisma.productBarcode.findFirst;
  const origCreate = prisma.productBarcode.create;
  let createdData = null;
  prisma.productBarcode.findFirst = async () => null;
  prisma.productBarcode.create = async ({ data }) => { createdData = data; return { id: 10, ...data }; };
  t.after(() => {
    prisma.productBarcode.findFirst = origFind;
    prisma.productBarcode.create = origCreate;
  });

  const res = createMockResponse();
  await barcodeController.addBarcode(
    { boutiqueId: 1, params: { produitId: '5' }, body: { barcode: '9876543210', isPrimary: false } },
    res,
  );

  assert.equal(res.statusCode, 201);
  assert.equal(createdData.barcode, '9876543210');
  assert.equal(createdData.produitId, 5);
  assert.equal(createdData.boutiqueId, 1);
});

test('barcode.add rejette si barcode absent', async (t) => {
  const res = createMockResponse();
  await barcodeController.addBarcode(
    { boutiqueId: 1, params: { produitId: '5' }, body: {} },
    res,
  );

  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.code, 'BARCODE_REQUIRED');
});

test('barcode.add retourne 409 si le code existe déjà dans la boutique', async (t) => {
  const orig = prisma.productBarcode.findFirst;
  prisma.productBarcode.findFirst = async () => ({ id: 1, barcode: '111' });
  t.after(() => { prisma.productBarcode.findFirst = orig; });

  const res = createMockResponse();
  await barcodeController.addBarcode(
    { boutiqueId: 1, params: { produitId: '5' }, body: { barcode: '111' } },
    res,
  );

  assert.equal(res.statusCode, 409);
  assert.equal(res.payload.code, 'BARCODE_DUPLICATE');
});

test('barcode.add retire l\'ancien primary si isPrimary=true', async (t) => {
  const origFind = prisma.productBarcode.findFirst;
  const origUpdateMany = prisma.productBarcode.updateMany;
  const origCreate = prisma.productBarcode.create;
  let updateManyCalled = false;

  prisma.productBarcode.findFirst = async () => null;
  prisma.productBarcode.updateMany = async () => { updateManyCalled = true; return {}; };
  prisma.productBarcode.create = async ({ data }) => ({ id: 11, ...data });

  t.after(() => {
    prisma.productBarcode.findFirst = origFind;
    prisma.productBarcode.updateMany = origUpdateMany;
    prisma.productBarcode.create = origCreate;
  });

  const res = createMockResponse();
  await barcodeController.addBarcode(
    { boutiqueId: 1, params: { produitId: '5' }, body: { barcode: '555', isPrimary: true } },
    res,
  );

  assert.equal(updateManyCalled, true);
  assert.equal(res.statusCode, 201);
});

// ─── removeBarcode ─────────────────────────────────────────────────────────

test('barcode.remove supprime un code-barres existant', async (t) => {
  const origFind = prisma.productBarcode.findFirst;
  const origDelete = prisma.productBarcode.delete;
  prisma.productBarcode.findFirst = async () => ({ id: 1, barcode: '111' });
  prisma.productBarcode.delete = async () => ({});
  t.after(() => {
    prisma.productBarcode.findFirst = origFind;
    prisma.productBarcode.delete = origDelete;
  });

  const res = createMockResponse();
  await barcodeController.removeBarcode({ boutiqueId: 1, params: { id: '1' } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.success, true);
  assert.equal(res.payload.message, 'Code-barres supprimé');
});

test('barcode.remove retourne 404 si code introuvable', async (t) => {
  const orig = prisma.productBarcode.findFirst;
  prisma.productBarcode.findFirst = async () => null;
  t.after(() => { prisma.productBarcode.findFirst = orig; });

  const res = createMockResponse();
  await barcodeController.removeBarcode({ boutiqueId: 1, params: { id: '99' } }, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.payload.code, 'BARCODE_NOT_FOUND');
});

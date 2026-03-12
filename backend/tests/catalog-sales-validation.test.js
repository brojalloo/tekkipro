const test = require('node:test');
const assert = require('node:assert/strict');

const { handleValidationErrors } = require('../src/middleware/validation.middleware');
const {
  createProductValidation,
  createUnitValidation,
  listProductsValidation,
  productIdValidation,
  updateProductValidation,
  updateUnitValidation,
  unitIdValidation,
} = require('../src/modules/catalog/produit.validation');
const {
  createSaleValidation,
  listSalesValidation,
  saleIdValidation,
} = require('../src/modules/sales/vente.validation');

const runValidation = async (validators, req) => {
  for (const validator of validators) {
    await validator.run(req);
  }

  const res = {
    statusCode: null,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.payload = data;
      return this;
    },
  };

  let nextCalled = false;
  handleValidationErrors(req, res, () => {
    nextCalled = true;
  });

  return { req, res, nextCalled };
};

test('listProductsValidation refuse un filtre categorieId invalide et normalise alerteStock', async () => {
  const invalid = await runValidation(listProductsValidation, {
    body: {},
    params: {},
    query: { categorieId: 'abc', alerteStock: 'maybe' },
    headers: {},
  });

  assert.equal(invalid.res.statusCode, 400);
  assert.equal(invalid.res.payload.code, 'VALIDATION_ERROR');
  assert.equal(invalid.res.payload.errorCount, 2);
  assert.deepEqual(invalid.res.payload.errors.map((error) => error.field), ['categorieId', 'alerteStock']);

  const valid = await runValidation(listProductsValidation, {
    body: {},
    params: {},
    query: { categorieId: '4', alerteStock: '1' },
    headers: {},
  });

  assert.equal(valid.nextCalled, true);
  assert.equal(valid.req.query.alerteStock, 'true');
});

test('createProductValidation refuse un mode commercial invalide et une date de péremption mal formée', async () => {
  const outcome = await runValidation(createProductValidation, {
    body: {
      nom: 'Huile',
      commercialMode: 'palette',
      datePeremption: '2026/12/31',
    },
    params: {},
    query: {},
    headers: {},
  });

  assert.equal(outcome.res.statusCode, 400);
  assert.deepEqual(outcome.res.payload.errors.map((error) => error.field), ['commercialMode', 'datePeremption']);
});

test('updateProductValidation accepte les ids et nombres valides', async () => {
  const outcome = await runValidation(updateProductValidation, {
    body: {
      nom: 'Riz parfumé',
      stockAlerte: '0',
      actif: 'false',
      commercialMode: 'carton',
      commercialSize: '12',
    },
    params: { id: '7' },
    query: {},
    headers: {},
  });

  assert.equal(outcome.nextCalled, true);
  assert.equal(outcome.req.params.id, 7);
  assert.equal(outcome.req.body.commercialMode, 'carton');
});

test('createUnitValidation et updateUnitValidation refusent des valeurs d’unité invalides', async () => {
  const createOutcome = await runValidation(createUnitValidation, {
    body: { nom: '', facteurConversion: '0', prix: '-1' },
    params: { produitId: '2' },
    query: {},
    headers: {},
  });
  const updateOutcome = await runValidation(updateUnitValidation, {
    body: { prix: '0', estDefaut: 'maybe' },
    params: { uniteId: '3' },
    query: {},
    headers: {},
  });

  assert.equal(createOutcome.res.statusCode, 400);
  assert.deepEqual(createOutcome.res.payload.errors.map((error) => error.field), ['nom', 'facteurConversion', 'prix']);
  assert.equal(updateOutcome.res.statusCode, 400);
  assert.deepEqual(updateOutcome.res.payload.errors.map((error) => error.field), ['prix', 'estDefaut']);
});

test('productIdValidation et unitIdValidation refusent des ids invalides', async () => {
  const productOutcome = await runValidation(productIdValidation, {
    body: {},
    params: { id: '0' },
    query: {},
    headers: {},
  });
  const unitOutcome = await runValidation(unitIdValidation, {
    body: {},
    params: { uniteId: 'abc' },
    query: {},
    headers: {},
  });

  assert.equal(productOutcome.res.statusCode, 400);
  assert.equal(unitOutcome.res.statusCode, 400);
});

test('createSaleValidation refuse des lignes invalides et normalise le mode de paiement', async () => {
  const invalid = await runValidation(createSaleValidation, {
    body: {
      details: [{ produitId: 'x', quantite: '0' }],
      modePaiement: 'cheque',
    },
    params: {},
    query: {},
    headers: {},
  });

  assert.equal(invalid.res.statusCode, 400);
  assert.equal(invalid.res.payload.errors[0].location, 'body');
  assert.deepEqual(invalid.res.payload.errors.map((error) => error.field), ['details[0].produitId', 'details[0].quantite', 'modePaiement']);

  const valid = await runValidation(createSaleValidation, {
    body: {
      details: [{ produitId: '5', quantite: '2', uniteVenteId: '9' }],
      modePaiement: 'mobile_money',
      montantPaye: '1500',
    },
    params: {},
    query: {},
    headers: {},
  });

  assert.equal(valid.nextCalled, true);
  assert.equal(valid.req.body.modePaiement, 'MOBILE_MONEY');
});

test('listSalesValidation refuse des dates ou statuts invalides', async () => {
  const outcome = await runValidation(listSalesValidation, {
    body: {},
    params: {},
    query: { dateDebut: '2026-12-31', dateFin: '2026-01-01', statut: 'BROKEN', userId: 'abc' },
    headers: {},
  });

  assert.equal(outcome.res.statusCode, 400);
  assert.deepEqual(outcome.res.payload.errors.map((error) => error.field), ['statut', 'userId', 'dateFin']);
});

test('saleIdValidation accepte un id valide et refuse un id invalide', async () => {
  const invalid = await runValidation(saleIdValidation, {
    body: {},
    params: { id: 'abc' },
    query: {},
    headers: {},
  });
  const valid = await runValidation(saleIdValidation, {
    body: {},
    params: { id: '12' },
    query: {},
    headers: {},
  });

  assert.equal(invalid.res.statusCode, 400);
  assert.equal(valid.nextCalled, true);
  assert.equal(valid.req.params.id, 12);
});
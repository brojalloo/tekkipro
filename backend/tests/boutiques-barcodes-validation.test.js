const test = require('node:test');
const assert = require('node:assert/strict');

const { handleValidationErrors } = require('../src/middleware/validation.middleware');
const {
  boutiqueIdValidation,
  createBoutiqueValidation,
  updateBoutiqueValidation,
} = require('../src/modules/boutiques/boutique.validation');
const {
  addBarcodeValidation,
  barcodeIdValidation,
  barcodeLookupValidation,
  produitBarcodeValidation,
} = require('../src/modules/barcodes/barcode.validation');

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

test('updateBoutiqueValidation refuse des champs boutique invalides et normalise les champs valides', async () => {
  const invalid = await runValidation(updateBoutiqueValidation, {
    body: { telephone: '77-AB', email: 'bad-email', devise: '123', ninea: '***' },
    params: {},
    query: {},
    headers: {},
  });
  const valid = await runValidation(updateBoutiqueValidation, {
    body: { nom: 'Tekki Shop', telephone: '+221 77 000 00 00', email: 'SHOP@TEST.COM', devise: 'fcfa', ninea: 'sn-12345' },
    params: {},
    query: {},
    headers: {},
  });

  assert.equal(invalid.res.statusCode, 400);
  assert.equal(invalid.res.payload.code, 'VALIDATION_ERROR');
  assert.deepEqual(invalid.res.payload.errors.map((error) => error.field), ['telephone', 'email', 'devise', 'ninea']);
  assert.equal(valid.nextCalled, true);
  assert.equal(valid.req.body.telephone, '+221770000000');
  assert.equal(valid.req.body.email, 'shop@test.com');
  assert.equal(valid.req.body.devise, 'FCFA');
  assert.equal(valid.req.body.ninea, 'SN-12345');
});

test('createBoutiqueValidation refuse un slug invalide et accepte une boutique valide', async () => {
  const invalid = await runValidation(createBoutiqueValidation, {
    body: { nom: 'A', slug: 'Slug Invalide!', email: 'nope' },
    params: {},
    query: {},
    headers: {},
  });
  const valid = await runValidation(createBoutiqueValidation, {
    body: { nom: 'Boutique Nord', slug: 'boutique-nord', telephone: '770000000', email: 'north@test.com' },
    params: {},
    query: {},
    headers: {},
  });

  assert.equal(invalid.res.statusCode, 400);
  assert.deepEqual(invalid.res.payload.errors.map((error) => error.field), ['nom', 'slug', 'email']);
  assert.equal(valid.nextCalled, true);
  assert.equal(valid.req.body.slug, 'boutique-nord');
});

test('boutiqueIdValidation refuse un identifiant boutique invalide', async () => {
  const outcome = await runValidation(boutiqueIdValidation, {
    body: {},
    params: { id: '0' },
    query: {},
    headers: {},
  });

  assert.equal(outcome.res.statusCode, 400);
  assert.equal(outcome.res.payload.errors[0].field, 'id');
  assert.equal(outcome.res.payload.errors[0].location, 'params');
});

test('barcodeLookupValidation et produitBarcodeValidation refusent des paramètres invalides', async () => {
  const lookupOutcome = await runValidation(barcodeLookupValidation, {
    body: {},
    params: { code: 'bad code !' },
    query: {},
    headers: {},
  });
  const produitOutcome = await runValidation(produitBarcodeValidation, {
    body: {},
    params: { produitId: 'abc' },
    query: {},
    headers: {},
  });

  assert.equal(lookupOutcome.res.statusCode, 400);
  assert.equal(produitOutcome.res.statusCode, 400);
});

test('addBarcodeValidation refuse un payload invalide et normalise isPrimary', async () => {
  const invalid = await runValidation(addBarcodeValidation, {
    body: { barcode: 'bad code !', uniteId: '0', isPrimary: 'maybe' },
    params: { produitId: '0' },
    query: {},
    headers: {},
  });
  const valid = await runValidation(addBarcodeValidation, {
    body: { barcode: '1234567890123', uniteId: '8', isPrimary: 'yes' },
    params: { produitId: '4' },
    query: {},
    headers: {},
  });

  assert.equal(invalid.res.statusCode, 400);
  assert.deepEqual(invalid.res.payload.errors.map((error) => error.field), ['produitId', 'barcode', 'uniteId', 'isPrimary']);
  assert.equal(valid.nextCalled, true);
  assert.equal(valid.req.params.produitId, 4);
  assert.equal(valid.req.body.uniteId, 8);
  assert.equal(valid.req.body.isPrimary, 'true');
});

test('barcodeIdValidation refuse un identifiant barcode invalide', async () => {
  const outcome = await runValidation(barcodeIdValidation, {
    body: {},
    params: { id: 'abc' },
    query: {},
    headers: {},
  });

  assert.equal(outcome.res.statusCode, 400);
  assert.equal(outcome.res.payload.errors[0].field, 'id');
});
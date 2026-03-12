const test = require('node:test');
const assert = require('node:assert/strict');

const { handleValidationErrors } = require('../src/middleware/validation.middleware');
const {
  createSupplierValidation,
  fournisseurIdValidation,
  updateSupplierValidation,
} = require('../src/modules/suppliers/fournisseur.validation');
const {
  detteIdValidation,
  listDettesValidation,
  rembourserDetteValidation,
} = require('../src/modules/sales/dette.validation');
const { factureIdValidation } = require('../src/modules/sales/facture.validation');

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

test('createSupplierValidation refuse des champs fournisseur invalides et normalise les champs valides', async () => {
  const invalid = await runValidation(createSupplierValidation, {
    body: { nom: ' ', telephone: '77-AB', adresse: 'x'.repeat(256), email: 'bad-email' },
    params: {},
    query: {},
    headers: {},
  });
  const valid = await runValidation(createSupplierValidation, {
    body: { nom: 'Nestlé', telephone: '+221 77 000 00 00', adresse: 'Dakar', email: 'SUPPLIER@TEST.COM' },
    params: {},
    query: {},
    headers: {},
  });

  assert.equal(invalid.res.statusCode, 400);
  assert.equal(invalid.res.payload.code, 'VALIDATION_ERROR');
  assert.deepEqual(invalid.res.payload.errors.map((error) => error.field), ['nom', 'telephone', 'adresse', 'email']);
  assert.equal(valid.nextCalled, true);
  assert.equal(valid.req.body.telephone, '+221770000000');
  assert.equal(valid.req.body.email, 'supplier@test.com');
});

test('updateSupplierValidation et fournisseurIdValidation refusent des ids invalides', async () => {
  const updateOutcome = await runValidation(updateSupplierValidation, {
    body: { nom: 'Total', telephone: '770000000' },
    params: { id: 'abc' },
    query: {},
    headers: {},
  });
  const idOutcome = await runValidation(fournisseurIdValidation, {
    body: {},
    params: { id: '0' },
    query: {},
    headers: {},
  });

  assert.equal(updateOutcome.res.statusCode, 400);
  assert.equal(updateOutcome.res.payload.errors[0].field, 'id');
  assert.equal(idOutcome.res.statusCode, 400);
});

test('listDettesValidation refuse un statut ou clientId invalides', async () => {
  const invalid = await runValidation(listDettesValidation, {
    body: {},
    params: {},
    query: { statut: 'BROKEN', clientId: 'abc' },
    headers: {},
  });
  const valid = await runValidation(listDettesValidation, {
    body: {},
    params: {},
    query: { statut: 'EN_COURS', clientId: '5' },
    headers: {},
  });

  assert.equal(invalid.res.statusCode, 400);
  assert.deepEqual(invalid.res.payload.errors.map((error) => error.field), ['statut', 'clientId']);
  assert.equal(valid.nextCalled, true);
});

test('rembourserDetteValidation refuse un id ou montant invalides', async () => {
  const invalid = await runValidation(rembourserDetteValidation, {
    body: { montant: '0' },
    params: { id: 'abc' },
    query: {},
    headers: {},
  });
  const valid = await runValidation(rembourserDetteValidation, {
    body: { montant: '2500' },
    params: { id: '8' },
    query: {},
    headers: {},
  });

  assert.equal(invalid.res.statusCode, 400);
  assert.deepEqual(invalid.res.payload.errors.map((error) => error.field), ['id', 'montant']);
  assert.deepEqual(invalid.res.payload.errors.map((error) => error.code), ['INVALID_IDENTIFIER', 'INVALID_VALUE']);
  assert.equal(valid.nextCalled, true);
  assert.equal(valid.req.params.id, 8);
});

test('detteIdValidation et factureIdValidation refusent des identifiants invalides', async () => {
  const detteOutcome = await runValidation(detteIdValidation, {
    body: {},
    params: { id: '0' },
    query: {},
    headers: {},
  });
  const factureOutcome = await runValidation(factureIdValidation, {
    body: {},
    params: { id: 'bad' },
    query: {},
    headers: {},
  });

  assert.equal(detteOutcome.res.statusCode, 400);
  assert.equal(factureOutcome.res.statusCode, 400);
});
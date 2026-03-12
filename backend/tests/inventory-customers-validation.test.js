const test = require('node:test');
const assert = require('node:assert/strict');

const { handleValidationErrors } = require('../src/middleware/validation.middleware');
const { stockEntryValidation, stockHistoryValidation } = require('../src/modules/inventory/stock.validation');
const {
  clientIdValidation,
  createClientValidation,
  listClientsValidation,
  updateClientValidation,
} = require('../src/modules/customers/client.validation');

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

test('stockEntryValidation refuse ids/quantités invalides', async () => {
  const outcome = await runValidation(stockEntryValidation, {
    body: { produitId: '0', quantite: '-3', prixAchat: '0', fournisseurId: 'abc', uniteVenteId: 'xyz' },
    params: {},
    query: {},
    headers: {},
  });

  assert.equal(outcome.res.statusCode, 400);
  assert.equal(outcome.res.payload.errorCount, 5);
  assert.deepEqual(outcome.res.payload.errors.map((error) => error.field), ['produitId', 'quantite', 'prixAchat', 'fournisseurId', 'uniteVenteId']);
});

test('stockEntryValidation accepte une entrée de stock valide', async () => {
  const outcome = await runValidation(stockEntryValidation, {
    body: { produitId: '5', quantite: '3.5', prixAchat: '1200', fournisseurId: '9', uniteVenteId: '2' },
    params: {},
    query: {},
    headers: {},
  });

  assert.equal(outcome.nextCalled, true);
  assert.equal(outcome.req.body.produitId, 5);
});

test('stockHistoryValidation refuse des filtres invalides', async () => {
  const outcome = await runValidation(stockHistoryValidation, {
    body: {},
    params: {},
    query: { produitId: 'abc', fournisseurId: '0', dateDebut: '2026/01/01', dateFin: '2025-12-31' },
    headers: {},
  });

  assert.equal(outcome.res.statusCode, 400);
  assert.deepEqual(outcome.res.payload.errors.map((error) => error.field), ['produitId', 'fournisseurId', 'dateDebut']);
});

test('stockHistoryValidation refuse une plage de dates incohérente', async () => {
  const outcome = await runValidation(stockHistoryValidation, {
    body: {},
    params: {},
    query: { dateDebut: '2026-12-31', dateFin: '2026-01-01' },
    headers: {},
  });

  assert.equal(outcome.res.statusCode, 400);
  assert.equal(outcome.res.payload.errors[0].field, 'dateFin');
  assert.equal(outcome.res.payload.errors[0].code, 'INVALID_VALUE');
});

test('listClientsValidation borne la recherche', async () => {
  const invalid = await runValidation(listClientsValidation, {
    body: {},
    params: {},
    query: { search: 'a'.repeat(121) },
    headers: {},
  });
  const valid = await runValidation(listClientsValidation, {
    body: {},
    params: {},
    query: { search: 'awa' },
    headers: {},
  });

  assert.equal(invalid.res.statusCode, 400);
  assert.equal(valid.nextCalled, true);
});

test('createClientValidation refuse un client invalide et normalise le téléphone', async () => {
  const invalid = await runValidation(createClientValidation, {
    body: { nom: ' ', telephone: '77-AB', adresse: 'x'.repeat(256) },
    params: {},
    query: {},
    headers: {},
  });
  const valid = await runValidation(createClientValidation, {
    body: { nom: 'Diop', prenom: 'Awa', telephone: '+221 77 000 00 00', adresse: 'Dakar' },
    params: {},
    query: {},
    headers: {},
  });

  assert.equal(invalid.res.statusCode, 400);
  assert.deepEqual(invalid.res.payload.errors.map((error) => error.field), ['nom', 'telephone', 'adresse']);
  assert.equal(valid.nextCalled, true);
  assert.equal(valid.req.body.telephone, '+221770000000');
});

test('updateClientValidation et clientIdValidation refusent des ids invalides', async () => {
  const updateOutcome = await runValidation(updateClientValidation, {
    body: { nom: 'Fall', telephone: '770000000' },
    params: { id: 'abc' },
    query: {},
    headers: {},
  });
  const idOutcome = await runValidation(clientIdValidation, {
    body: {},
    params: { id: '0' },
    query: {},
    headers: {},
  });

  assert.equal(updateOutcome.res.statusCode, 400);
  assert.equal(updateOutcome.res.payload.errors[0].field, 'id');
  assert.equal(idOutcome.res.statusCode, 400);
});
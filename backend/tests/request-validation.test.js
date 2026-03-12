const test = require('node:test');
const assert = require('node:assert/strict');

const {
  handleValidationErrors,
  inferValidationCode,
} = require('../src/middleware/validation.middleware');
const {
  addEmployeeValidation,
  loginValidation,
  registerValidation,
  resetPasswordValidation,
  toggleEmployeeValidation,
  verifyEmailValidation,
} = require('../src/modules/auth/auth.validation');
const {
  createStripeSessionValidation,
  getPaymentStatusValidation,
  initiateWavePaymentValidation,
  verifyStripeSessionValidation,
} = require('../src/modules/payments/payment.validation');

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

  return { res, nextCalled, req };
};

test('registerValidation refuse un slug invalide et un email mal formé', async () => {
  const outcome = await runValidation(registerValidation, {
    body: {
      nomBoutique: 'Tekki Shop',
      slug: 'Slug Invalide!',
      nom: 'Diop',
      prenom: 'Awa',
      email: 'not-an-email',
      password: 'MotDePasse!2026',
      telephone: '770000000',
    },
    params: {},
    query: {},
    headers: {},
  });

  assert.equal(outcome.nextCalled, false);
  assert.equal(outcome.res.statusCode, 400);
  assert.equal(outcome.res.payload.success, false);
  assert.equal(outcome.res.payload.code, 'VALIDATION_ERROR');
  assert.equal(outcome.res.payload.message, 'La requête contient des données invalides.');
  assert.equal(outcome.res.payload.errorCount, 2);
  assert.deepEqual(outcome.res.payload.errors.map((error) => error.field), ['slug', 'email']);
  assert.deepEqual(outcome.res.payload.errors.map((error) => error.location), ['body', 'body']);
});

test('loginValidation accepte un email valide et un mot de passe présent', async () => {
  const outcome = await runValidation(loginValidation, {
    body: { email: 'boss@tekki.test', password: 'MotDePasse!2026' },
    params: {},
    query: {},
    headers: {},
  });

  assert.equal(outcome.nextCalled, true);
  assert.equal(outcome.req.body.email, 'boss@tekki.test');
});

test('verifyEmailValidation et resetPasswordValidation refusent un token mal formé', async () => {
  const verifyOutcome = await runValidation(verifyEmailValidation, {
    body: { token: 'short-token' },
    params: {},
    query: {},
    headers: {},
  });
  const resetOutcome = await runValidation(resetPasswordValidation, {
    body: { token: 'short-token', password: 'MotDePasse!2026' },
    params: {},
    query: {},
    headers: {},
  });

  assert.equal(verifyOutcome.res.statusCode, 400);
  assert.equal(resetOutcome.res.statusCode, 400);
  assert.equal(verifyOutcome.res.payload.errors[0].field, 'token');
  assert.equal(resetOutcome.res.payload.errors[0].field, 'token');
});

test('resetPasswordValidation accepte un mot de passe de 8 caractères si le token est bien formé', async () => {
  const outcome = await runValidation(resetPasswordValidation, {
    body: { token: 'a'.repeat(64), password: 'Passer@1' },
    params: {},
    query: {},
    headers: {},
  });

  assert.equal(outcome.nextCalled, true);
});

test('addEmployeeValidation refuse un téléphone invalide et toggleEmployeeValidation refuse un id non numérique', async () => {
  const employeeOutcome = await runValidation(addEmployeeValidation, {
    body: {
      nom: 'Ndiaye',
      prenom: 'Moussa',
      email: 'moussa@tekki.test',
      password: 'MotDePasse!2026',
      telephone: '77-00-ABCD',
    },
    params: {},
    query: {},
    headers: {},
  });
  const toggleOutcome = await runValidation(toggleEmployeeValidation, {
    body: {},
    params: { id: 'abc' },
    query: {},
    headers: {},
  });

  assert.equal(employeeOutcome.res.statusCode, 400);
  assert.equal(employeeOutcome.res.payload.errors[0].field, 'telephone');
  assert.equal(toggleOutcome.res.statusCode, 400);
  assert.equal(toggleOutcome.res.payload.errors[0].field, 'id');
});

test('createStripeSessionValidation normalise plan/type et accepte une entrée valide', async () => {
  const outcome = await runValidation(createStripeSessionValidation, {
    body: { plan: 'pro', type: ' Renouveler ' },
    params: {},
    query: {},
    headers: {},
  });

  assert.equal(outcome.nextCalled, true);
  assert.equal(outcome.req.body.plan, 'PRO');
  assert.equal(outcome.req.body.type, 'renouveler');
});

test('initiateWavePaymentValidation refuse un numéro de téléphone invalide', async () => {
  const outcome = await runValidation(initiateWavePaymentValidation, {
    body: { plan: 'BUSINESS', type: 'souscrire', telephone: 'invalid-phone' },
    params: {},
    query: {},
    headers: {},
  });

  assert.equal(outcome.res.statusCode, 400);
  assert.equal(outcome.res.payload.errors[0].field, 'telephone');
});

test('verifyStripeSessionValidation et getPaymentStatusValidation refusent des paramètres invalides', async () => {
  const stripeOutcome = await runValidation(verifyStripeSessionValidation, {
    body: {},
    params: { sessionId: 'bad session id!' },
    query: {},
    headers: {},
  });
  const statusOutcome = await runValidation(getPaymentStatusValidation, {
    body: {},
    params: { paiementId: '0' },
    query: {},
    headers: {},
  });

  assert.equal(stripeOutcome.res.statusCode, 400);
  assert.equal(statusOutcome.res.statusCode, 400);
  assert.equal(stripeOutcome.res.payload.errors[0].field, 'sessionId');
  assert.equal(statusOutcome.res.payload.errors[0].field, 'paiementId');
  assert.equal(stripeOutcome.res.payload.errors[0].location, 'params');
  assert.equal(statusOutcome.res.payload.errors[0].location, 'params');
});

test('inferValidationCode classe les messages de validation de façon cohérente', () => {
  assert.equal(inferValidationCode('Mot de passe requis'), 'REQUIRED_FIELD');
  assert.equal(inferValidationCode('Identifiant boutique invalide'), 'INVALID_IDENTIFIER');
  assert.equal(inferValidationCode('dateDebut doit être au format AAAA-MM-JJ'), 'INVALID_FORMAT');
  assert.equal(inferValidationCode('Le nom ne peut pas dépasser 120 caractères'), 'INVALID_LENGTH');
  assert.equal(inferValidationCode('Plan invalide'), 'INVALID_VALUE');
});
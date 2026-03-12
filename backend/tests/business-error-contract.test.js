const test = require('node:test');
const assert = require('node:assert/strict');

const {
  AppError,
  ConflictError,
  ServiceUnavailableError,
} = require('../src/common/errors/AppError');
const {
  buildErrorPayload,
  getDefaultErrorCode,
} = require('../src/common/utils/response');

test('getDefaultErrorCode mappe les statuts métier principaux', () => {
  assert.equal(getDefaultErrorCode(400), 'BAD_REQUEST');
  assert.equal(getDefaultErrorCode(401), 'UNAUTHORIZED');
  assert.equal(getDefaultErrorCode(403), 'FORBIDDEN');
  assert.equal(getDefaultErrorCode(404), 'NOT_FOUND');
  assert.equal(getDefaultErrorCode(409), 'CONFLICT');
  assert.equal(getDefaultErrorCode(429), 'RATE_LIMITED');
  assert.equal(getDefaultErrorCode(503), 'SERVICE_UNAVAILABLE');
});

test('buildErrorPayload conserve un code explicite et les métadonnées utiles', () => {
  const payload = buildErrorPayload('Plan supérieur requis', 403, {
    code: 'PLAN_UPGRADE_REQUIRED',
    upgrade: true,
    requiredPlan: 'PRO',
  });

  assert.deepEqual(payload, {
    success: false,
    code: 'PLAN_UPGRADE_REQUIRED',
    message: 'Plan supérieur requis',
    upgrade: true,
    requiredPlan: 'PRO',
  });
});

test('AppError et ses variantes exposent status, code et détails', () => {
  const baseError = new AppError('Erreur générique', 500, 'GENERIC_FAILURE', {
    details: { origin: 'test' },
    meta: { requestId: 'req_123' },
  });
  const conflictError = new ConflictError('Email déjà utilisé', 'EMAIL_ALREADY_USED');
  const unavailableError = new ServiceUnavailableError('Stripe indisponible', 'STRIPE_NOT_CONFIGURED');

  assert.equal(baseError.statusCode, 500);
  assert.equal(baseError.code, 'GENERIC_FAILURE');
  assert.deepEqual(baseError.details, { origin: 'test' });
  assert.deepEqual(baseError.meta, { requestId: 'req_123' });
  assert.equal(conflictError.statusCode, 409);
  assert.equal(conflictError.code, 'EMAIL_ALREADY_USED');
  assert.equal(unavailableError.statusCode, 503);
  assert.equal(unavailableError.code, 'STRIPE_NOT_CONFIGURED');
});
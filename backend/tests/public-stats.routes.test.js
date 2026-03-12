const test = require('node:test');
const assert = require('node:assert/strict');

const router = require('../src/modules/reports/publicStats.routes');

test('public-stats exige auth puis adminOnly avant le contrôleur', () => {
  const layer = router.stack.find((entry) => entry.route?.path === '/' && entry.route.methods.get);

  assert.ok(layer, 'La route GET / doit exister dans publicStats.routes');

  const handlerNames = layer.route.stack.map((entry) => entry.handle.name);
  assert.deepEqual(handlerNames, ['auth', 'adminOnly', 'getPublicStats']);
});
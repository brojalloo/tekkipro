const test = require('node:test');
const assert = require('node:assert/strict');

const { buildPasswordResetEmail, buildVerificationEmail } = require('../src/services/email.service');

test('buildVerificationEmail précise le contexte et invite à ignorer le mail si nécessaire', () => {
  const { subject, html } = buildVerificationEmail(
    { prenom: 'Awa', email: 'awa@example.com' },
    'token-demo'
  );

  assert.equal(subject, '✅ TekkiPro — Activez votre compte');
  assert.match(html, /awa@example\.com/i);
  assert.match(html, /vient d’être utilisée pour créer un compte sur TekkiPro/i);
  assert.match(html, /Si vous êtes bien à l’origine de cette inscription/i);
  assert.match(html, /Activer mon compte/i);
  assert.match(html, /Si vous n’êtes pas à l’origine de cette demande/i);
  assert.match(html, /n’activez pas ce compte/i);
  assert.match(html, /Besoin d’aide/i);
  assert.match(html, /support@tekkipro\.com/i);
  assert.match(html, /verify-email\?token=token-demo/i);
});

test('buildPasswordResetEmail adopte le même ton de sécurité', () => {
  const { subject, html } = buildPasswordResetEmail(
    { prenom: 'Awa', email: 'awa@example.com' },
    'reset-token-demo'
  );

  assert.equal(subject, '🔑 TekkiPro — Réinitialisez votre mot de passe');
  assert.match(html, /awa@example\.com/i);
  assert.match(html, /demande de réinitialisation du mot de passe a été effectuée/i);
  assert.match(html, /Si vous êtes bien à l’origine de cette demande/i);
  assert.match(html, /Réinitialiser mon mot de passe/i);
  assert.match(html, /Si vous n’êtes pas à l’origine de cette demande, ne cliquez pas sur ce bouton/i);
  assert.match(html, /Besoin d’aide/i);
  assert.match(html, /support@tekkipro\.com/i);
  assert.match(html, /reset-password\?token=reset-token-demo/i);
});
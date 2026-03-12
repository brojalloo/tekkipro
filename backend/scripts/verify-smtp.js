require('dotenv').config();

const { validateEnvironment } = require('../src/config/env');
const { verifyEmailTransport, __getSmtpConfigSummaryForTests } = require('../src/services/email.service');

const REQUIRED_SMTP_KEYS = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];

const maskValue = (value) => {
  if (!value) return '—';
  if (value.length <= 4) return '*'.repeat(value.length);
  return `${value.slice(0, 2)}***${value.slice(-2)}`;
};

async function main() {
  const providedKeys = REQUIRED_SMTP_KEYS.filter((key) => process.env[key]);
  if (providedKeys.length === 0) {
    console.error('SMTP non configuré. Définissez SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS et EMAIL_FROM.');
    process.exitCode = 1;
    return;
  }

  if (providedKeys.length !== REQUIRED_SMTP_KEYS.length) {
    console.error(`Configuration SMTP partielle. Clés présentes: ${providedKeys.join(', ')}`);
    process.exitCode = 1;
    return;
  }

  validateEnvironment();

  await verifyEmailTransport();
  const summary = __getSmtpConfigSummaryForTests();

  console.log('SMTP vérifié avec succès.');
  console.log(`- host: ${summary.host}`);
  console.log(`- port: ${summary.port}`);
  console.log(`- secure: ${summary.secure}`);
  console.log(`- user: ${maskValue(summary.user)}`);
  console.log(`- from: ${summary.from}`);
}

main().catch((error) => {
  console.error(`Échec vérification SMTP: ${error.message}`);
  process.exitCode = 1;
});
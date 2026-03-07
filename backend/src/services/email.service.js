// Service d'envoi d'emails — Tekkipro
// Utilise Nodemailer avec SMTP (compatible SendGrid, Mailgun, Gmail, etc.)
const nodemailer = require('nodemailer');

// Configuration du transporteur
const createTransporter = () => {
  // Production : utiliser SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Développement : mode preview (log dans la console)
  console.log('📧 Email: mode développement (pas de SMTP configuré, emails logués en console)');
  return {
    sendMail: async (mailOptions) => {
      console.log('\n═══════════ EMAIL PREVIEW ═══════════');
      console.log(`À: ${mailOptions.to}`);
      console.log(`Sujet: ${mailOptions.subject}`);
      console.log(`Lien: ${mailOptions.html?.match(/href="([^"]+)"/)?.[1] || '—'}`);
      console.log('════════════════════════════════════\n');
      return { messageId: 'dev-' + Date.now() };
    },
  };
};

let transporter = null;

const getTransporter = () => {
  if (!transporter) transporter = createTransporter();
  return transporter;
};

const FROM_EMAIL = () => process.env.EMAIL_FROM || 'TekkiPro <noreply@tekkipro.com>';
const APP_URL = () => process.env.APP_URL || 'http://localhost:5173';

// ─────────────────────────────────────────
//  EMAIL DE VÉRIFICATION DE COMPTE
// ─────────────────────────────────────────
const sendVerificationEmail = async (user, token) => {
  const verifyUrl = `${APP_URL()}/verify-email?token=${token}`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:580px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">
    <div style="background:linear-gradient(135deg,#6366f1,#818cf8);padding:32px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:28px;">🛒 TekkiPro</h1>
      <p style="color:rgba(255,255,255,.85);margin:8px 0 0;font-size:14px;">Gestion de boutique intelligente</p>
    </div>
    <div style="padding:32px;">
      <h2 style="color:#1a1a2e;margin:0 0 12px;">Bienvenue, ${user.prenom} !</h2>
      <p style="color:#555;line-height:1.6;margin:0 0 24px;">
        Merci de vous être inscrit sur TekkiPro. Veuillez confirmer votre adresse email pour activer votre compte.
      </p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${verifyUrl}" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:14px 40px;border-radius:8px;font-weight:600;font-size:16px;">
          ✅ Vérifier mon email
        </a>
      </div>
      <p style="color:#888;font-size:13px;line-height:1.5;">
        Ce lien expire dans <strong>48 heures</strong>.<br>
        Si vous n'avez pas créé de compte, ignorez simplement cet email.
      </p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
      <p style="color:#aaa;font-size:12px;text-align:center;">
        Ou copiez ce lien : <a href="${verifyUrl}" style="color:#6366f1;">${verifyUrl}</a>
      </p>
    </div>
    <div style="background:#f8f9fa;padding:16px;text-align:center;">
      <p style="color:#999;font-size:12px;margin:0;">© ${new Date().getFullYear()} TekkiPro — Fait avec ❤️ pour l'Afrique</p>
    </div>
  </div>
</body>
</html>`;

  await getTransporter().sendMail({
    from: FROM_EMAIL(),
    to: user.email,
    subject: '✅ TekkiPro — Vérifiez votre adresse email',
    html,
  });
};

// ─────────────────────────────────────────
//  EMAIL DE RÉINITIALISATION DE MOT DE PASSE
// ─────────────────────────────────────────
const sendPasswordResetEmail = async (user, token) => {
  const resetUrl = `${APP_URL()}/reset-password?token=${token}`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:580px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">
    <div style="background:linear-gradient(135deg,#ef4444,#f97316);padding:32px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:28px;">🔒 TekkiPro</h1>
      <p style="color:rgba(255,255,255,.85);margin:8px 0 0;font-size:14px;">Réinitialisation de mot de passe</p>
    </div>
    <div style="padding:32px;">
      <h2 style="color:#1a1a2e;margin:0 0 12px;">Bonjour, ${user.prenom}</h2>
      <p style="color:#555;line-height:1.6;margin:0 0 24px;">
        Vous avez demandé la réinitialisation de votre mot de passe. Cliquez ci-dessous pour choisir un nouveau mot de passe.
      </p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${resetUrl}" style="display:inline-block;background:#ef4444;color:#fff;text-decoration:none;padding:14px 40px;border-radius:8px;font-weight:600;font-size:16px;">
          🔑 Nouveau mot de passe
        </a>
      </div>
      <p style="color:#888;font-size:13px;line-height:1.5;">
        Ce lien expire dans <strong>1 heure</strong>.<br>
        Si vous n'avez pas fait cette demande, ignorez cet email.
      </p>
    </div>
    <div style="background:#f8f9fa;padding:16px;text-align:center;">
      <p style="color:#999;font-size:12px;margin:0;">© ${new Date().getFullYear()} TekkiPro — Fait avec ❤️ pour l'Afrique</p>
    </div>
  </div>
</body>
</html>`;

  await getTransporter().sendMail({
    from: FROM_EMAIL(),
    to: user.email,
    subject: '🔑 TekkiPro — Réinitialisation de votre mot de passe',
    html,
  });
};

// ─────────────────────────────────────────
//  EMAIL DE CONFIRMATION DE PAIEMENT
// ─────────────────────────────────────────
const sendPaymentConfirmationEmail = async (user, boutique, plan, montant) => {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:580px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">
    <div style="background:linear-gradient(135deg,#10b981,#059669);padding:32px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:28px;">💳 TekkiPro</h1>
      <p style="color:rgba(255,255,255,.85);margin:8px 0 0;font-size:14px;">Confirmation de paiement</p>
    </div>
    <div style="padding:32px;">
      <h2 style="color:#1a1a2e;margin:0 0 12px;">Paiement confirmé !</h2>
      <p style="color:#555;line-height:1.6;margin:0 0 24px;">
        Merci ${user.prenom}, votre paiement pour <strong>${boutique.nom}</strong> a bien été reçu.
      </p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin:20px 0;">
        <table style="width:100%;color:#333;font-size:14px;">
          <tr><td style="padding:6px 0;color:#888;">Plan</td><td style="text-align:right;font-weight:600;">${plan}</td></tr>
          <tr><td style="padding:6px 0;color:#888;">Montant</td><td style="text-align:right;font-weight:600;">${montant?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} FCFA</td></tr>
          <tr><td style="padding:6px 0;color:#888;">Date</td><td style="text-align:right;">${new Date().toLocaleDateString('fr-FR')}</td></tr>
          <tr><td style="padding:6px 0;color:#888;">Boutique</td><td style="text-align:right;">${boutique.nom}</td></tr>
        </table>
      </div>
      <p style="color:#888;font-size:13px;text-align:center;">
        Votre abonnement est maintenant actif. Profitez de toutes les fonctionnalités !
      </p>
    </div>
    <div style="background:#f8f9fa;padding:16px;text-align:center;">
      <p style="color:#999;font-size:12px;margin:0;">© ${new Date().getFullYear()} TekkiPro — Fait avec ❤️ pour l'Afrique</p>
    </div>
  </div>
</body>
</html>`;

  await getTransporter().sendMail({
    from: FROM_EMAIL(),
    to: user.email,
    subject: `💳 TekkiPro — Paiement confirmé (Plan ${plan})`,
    html,
  });
};

// ─────────────────────────────────────────
//  EMAIL D'EXPIRATION D'ABONNEMENT
// ─────────────────────────────────────────
const sendSubscriptionExpiryEmail = async (user, boutique, daysLeft) => {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:580px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">
    <div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:32px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:28px;">⏰ TekkiPro</h1>
      <p style="color:rgba(255,255,255,.85);margin:8px 0 0;">Rappel d'abonnement</p>
    </div>
    <div style="padding:32px;">
      <h2 style="color:#1a1a2e;margin:0 0 12px;">Votre abonnement expire bientôt</h2>
      <p style="color:#555;line-height:1.6;">
        Bonjour ${user.prenom},<br>
        L'abonnement de <strong>${boutique.nom}</strong> expire dans <strong>${daysLeft} jour${daysLeft > 1 ? 's' : ''}</strong>.
        Renouvelez-le pour continuer à profiter de toutes les fonctionnalités.
      </p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${APP_URL()}/app/abonnement" style="display:inline-block;background:#f59e0b;color:#fff;text-decoration:none;padding:14px 40px;border-radius:8px;font-weight:600;">
          🔄 Renouveler maintenant
        </a>
      </div>
    </div>
    <div style="background:#f8f9fa;padding:16px;text-align:center;">
      <p style="color:#999;font-size:12px;margin:0;">© ${new Date().getFullYear()} TekkiPro</p>
    </div>
  </div>
</body>
</html>`;

  await getTransporter().sendMail({
    from: FROM_EMAIL(),
    to: user.email,
    subject: `⏰ TekkiPro — Votre abonnement expire dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}`,
    html,
  });
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPaymentConfirmationEmail,
  sendSubscriptionExpiryEmail,
};

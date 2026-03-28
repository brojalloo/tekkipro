// Service d'envoi d'emails — Tekkipro
// Utilise Nodemailer avec SMTP (compatible SendGrid, Mailgun, Gmail, etc.)
const nodemailer = require('nodemailer');

const hasSmtpConfig = () => Boolean(process.env.SMTP_HOST);
const getSmtpPort = () => Number.parseInt(process.env.SMTP_PORT, 10) || 587;
const isSmtpSecure = () => process.env.SMTP_SECURE === 'true';

const getSmtpConfigSummary = () => ({
  configured: hasSmtpConfig(),
  host: process.env.SMTP_HOST || null,
  port: hasSmtpConfig() ? getSmtpPort() : null,
  secure: hasSmtpConfig() ? isSmtpSecure() : null,
  user: process.env.SMTP_USER || null,
  from: process.env.EMAIL_FROM || 'TekkiPro <noreply@tekkipro.com>',
});

// Configuration du transporteur
const createTransporter = () => {
  // Production : utiliser SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS
  if (hasSmtpConfig()) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: getSmtpPort(),
      secure: isSmtpSecure(),
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

const resetTransporterForTests = () => {
  transporter = null;
};

const verifyEmailTransport = async () => {
  const config = getSmtpConfigSummary();
  if (!config.configured) {
    return { ...config, mode: 'preview', verified: false };
  }

  const activeTransporter = getTransporter();
  if (typeof activeTransporter.verify === 'function') {
    await activeTransporter.verify();
  }

  return { ...config, mode: 'smtp', verified: true };
};

const FROM_EMAIL = () => process.env.EMAIL_FROM || 'TekkiPro <noreply@tekkipro.com>';
const APP_URL = () => process.env.APP_URL || 'http://localhost:5173';
const SUPPORT_EMAIL = () => process.env.SUPPORT_EMAIL || 'support@tekkipro.com';

// Bande kente décorative réutilisable
const KENTE_STRIP = `
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td style="background:#1B5E20;height:6px;"></td>
      <td style="background:#FFD600;height:6px;"></td>
      <td style="background:#D32F2F;height:6px;"></td>
      <td style="background:#1B5E20;height:6px;"></td>
      <td style="background:#FFD600;height:6px;"></td>
      <td style="background:#D32F2F;height:6px;"></td>
      <td style="background:#1B5E20;height:6px;"></td>
      <td style="background:#FFD600;height:6px;"></td>
      <td style="background:#D32F2F;height:6px;"></td>
    </tr>
  </table>`;

// Header commun
const emailHeader = (subtitle) => `
  <div style="background:#071C08;padding:28px 32px;text-align:center;">
    <div style="display:inline-block;background:#FFD600;border-radius:50%;width:48px;height:48px;line-height:48px;text-align:center;font-family:Georgia,serif;font-weight:900;font-size:26px;color:#071C08;margin-bottom:12px;">T</div>
    <div style="color:#fff;font-family:Georgia,serif;font-size:22px;font-weight:700;letter-spacing:1px;">TekkiPro</div>
    <div style="color:rgba(255,255,255,0.6);font-size:13px;margin-top:4px;">${subtitle}</div>
  </div>
  ${KENTE_STRIP}`;

// Footer commun
const emailFooter = () => `
  ${KENTE_STRIP}
  <div style="background:#071C08;padding:20px 32px;text-align:center;">
    <p style="color:rgba(255,255,255,0.45);font-size:12px;margin:0;">
      © ${new Date().getFullYear()} TekkiPro — Fait avec ♥ pour l'Afrique de l'Ouest
    </p>
    <p style="color:rgba(255,255,255,0.3);font-size:11px;margin:6px 0 0;">
      Des questions ? <a href="mailto:support@tekkipro.com" style="color:#FFD600;text-decoration:none;">support@tekkipro.com</a>
    </p>
  </div>`;

// Wrapper body commun
const emailWrap = (content) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>TekkiPro</title></head>
<body style="margin:0;padding:0;background:#e8ede8;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:580px;margin:40px auto;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.15);">
    ${content}
  </div>
</body>
</html>`;

// ─────────────────────────────────────────
//  EMAIL DE VÉRIFICATION DE COMPTE
// ─────────────────────────────────────────
const buildVerificationEmail = (user, token) => {
  const verifyUrl = `${APP_URL()}/verify-email?token=${token}`;

  const html = emailWrap(`
    ${emailHeader('Activation de votre compte')}
    <div style="background:#FFFAF0;padding:36px 32px;">
      <h2 style="font-family:Georgia,serif;color:#071C08;margin:0 0 16px;font-size:22px;">Bienvenue, ${user.prenom} !</h2>
      <p style="color:#3d3d3d;line-height:1.7;margin:0 0 16px;font-size:15px;">
        Votre adresse <strong>${user.email}</strong> a été utilisée pour créer un compte sur TekkiPro.
      </p>
      <p style="color:#3d3d3d;line-height:1.7;margin:0 0 28px;font-size:15px;">
        Cliquez sur le bouton ci-dessous pour activer votre compte et commencer à gérer votre boutique.
      </p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${verifyUrl}" style="display:inline-block;background:#FFD600;color:#071C08;text-decoration:none;padding:15px 44px;border-radius:8px;font-weight:700;font-size:16px;letter-spacing:0.3px;">
          Activer mon compte
        </a>
      </div>
      <div style="background:#fff;border-left:4px solid #1B5E20;border-radius:0 8px 8px 0;padding:14px 16px;margin:24px 0;">
        <p style="color:#1B5E20;font-size:13px;line-height:1.6;margin:0;">
          Si vous n'êtes pas à l'origine de cette inscription, ignorez simplement cet email.
        </p>
      </div>
      <p style="color:#888;font-size:13px;text-align:center;margin:16px 0 0;">
        Ce lien expire dans <strong>48 heures</strong>.<br>
        <a href="${verifyUrl}" style="color:#1B5E20;font-size:12px;word-break:break-all;">${verifyUrl}</a>
      </p>
    </div>
    ${emailFooter()}
  `);

  return {
    subject: 'TekkiPro — Activez votre compte',
    html,
  };
};

const sendVerificationEmail = async (user, token) => {
  const { subject, html } = buildVerificationEmail(user, token);

  await getTransporter().sendMail({
    from: FROM_EMAIL(),
    to: user.email,
    subject,
    html,
  });
};

// ─────────────────────────────────────────
//  EMAIL DE RÉINITIALISATION DE MOT DE PASSE
// ─────────────────────────────────────────
const buildPasswordResetEmail = (user, token) => {
  const resetUrl = `${APP_URL()}/reset-password?token=${token}`;

  const html = emailWrap(`
    ${emailHeader('Réinitialisation de mot de passe')}
    <div style="background:#FFFAF0;padding:36px 32px;">
      <h2 style="font-family:Georgia,serif;color:#071C08;margin:0 0 16px;font-size:22px;">Bonjour, ${user.prenom}</h2>
      <p style="color:#3d3d3d;line-height:1.7;margin:0 0 16px;font-size:15px;">
        Une demande de réinitialisation de mot de passe a été effectuée pour le compte associé à <strong>${user.email}</strong>.
      </p>
      <p style="color:#3d3d3d;line-height:1.7;margin:0 0 28px;font-size:15px;">
        Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe sécurisé.
      </p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${resetUrl}" style="display:inline-block;background:#FFD600;color:#071C08;text-decoration:none;padding:15px 44px;border-radius:8px;font-weight:700;font-size:16px;letter-spacing:0.3px;">
          Réinitialiser mon mot de passe
        </a>
      </div>
      <div style="background:#fff;border-left:4px solid #D32F2F;border-radius:0 8px 8px 0;padding:14px 16px;margin:24px 0;">
        <p style="color:#D32F2F;font-size:13px;line-height:1.6;margin:0;">
          Si vous n'êtes pas à l'origine de cette demande, ignorez cet email. Votre mot de passe ne sera pas modifié.
        </p>
      </div>
      <p style="color:#888;font-size:13px;text-align:center;margin:16px 0 0;">
        Ce lien expire dans <strong>1 heure</strong>.<br>
        <a href="${resetUrl}" style="color:#D32F2F;font-size:12px;word-break:break-all;">${resetUrl}</a>
      </p>
    </div>
    ${emailFooter()}
  `);

  return {
    subject: 'TekkiPro — Réinitialisez votre mot de passe',
    html,
  };
};

const sendPasswordResetEmail = async (user, token) => {
  const { subject, html } = buildPasswordResetEmail(user, token);

  await getTransporter().sendMail({
    from: FROM_EMAIL(),
    to: user.email,
    subject,
    html,
  });
};

// ─────────────────────────────────────────
//  EMAIL DE CONFIRMATION DE PAIEMENT
// ─────────────────────────────────────────
const sendPaymentConfirmationEmail = async (user, boutique, plan, montant) => {
  const montantFormate = montant?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const html = emailWrap(`
    ${emailHeader('Confirmation de paiement')}
    <div style="background:#FFFAF0;padding:36px 32px;">
      <h2 style="font-family:Georgia,serif;color:#071C08;margin:0 0 16px;font-size:22px;">Paiement confirme !</h2>
      <p style="color:#3d3d3d;line-height:1.7;margin:0 0 24px;font-size:15px;">
        Merci <strong>${user.prenom}</strong>, votre paiement pour la boutique <strong>${boutique.nom}</strong> a bien ete recu.
      </p>
      <div style="background:#fff;border:1px solid #d4e8d4;border-radius:10px;overflow:hidden;margin:24px 0;">
        <div style="background:#1B5E20;padding:12px 20px;">
          <span style="color:#FFD600;font-family:Georgia,serif;font-weight:700;font-size:14px;letter-spacing:0.5px;">RECAPITULATIF</span>
        </div>
        <table style="width:100%;border-collapse:collapse;">
          <tr style="border-bottom:1px solid #eee;">
            <td style="padding:12px 20px;color:#666;font-size:14px;">Plan</td>
            <td style="padding:12px 20px;text-align:right;font-weight:700;color:#071C08;font-size:14px;">${plan}</td>
          </tr>
          <tr style="border-bottom:1px solid #eee;">
            <td style="padding:12px 20px;color:#666;font-size:14px;">Montant</td>
            <td style="padding:12px 20px;text-align:right;font-weight:700;color:#071C08;font-size:14px;">${montantFormate} FCFA</td>
          </tr>
          <tr style="border-bottom:1px solid #eee;">
            <td style="padding:12px 20px;color:#666;font-size:14px;">Date</td>
            <td style="padding:12px 20px;text-align:right;color:#071C08;font-size:14px;">${new Date().toLocaleDateString('fr-FR')}</td>
          </tr>
          <tr>
            <td style="padding:12px 20px;color:#666;font-size:14px;">Boutique</td>
            <td style="padding:12px 20px;text-align:right;color:#071C08;font-size:14px;">${boutique.nom}</td>
          </tr>
        </table>
      </div>
      <div style="background:#fff;border-left:4px solid #1B5E20;border-radius:0 8px 8px 0;padding:14px 16px;margin:24px 0;">
        <p style="color:#1B5E20;font-size:13px;line-height:1.6;margin:0;">
          Votre abonnement est maintenant actif. Profitez de toutes les fonctionnalites de votre plan !
        </p>
      </div>
    </div>
    ${emailFooter()}
  `);

  await getTransporter().sendMail({
    from: FROM_EMAIL(),
    to: user.email,
    subject: `TekkiPro — Paiement confirme (Plan ${plan})`,
    html,
  });
};

// ─────────────────────────────────────────
//  EMAIL D'EXPIRATION D'ABONNEMENT
// ─────────────────────────────────────────
const sendSubscriptionExpiryEmail = async (user, boutique, daysLeft) => {
  const urgence = daysLeft <= 3;
  const html = emailWrap(`
    ${emailHeader('Rappel d\'abonnement')}
    <div style="background:#FFFAF0;padding:36px 32px;">
      <h2 style="font-family:Georgia,serif;color:#071C08;margin:0 0 16px;font-size:22px;">
        Votre abonnement expire ${daysLeft === 1 ? 'demain' : `dans ${daysLeft} jours`}
      </h2>
      <p style="color:#3d3d3d;line-height:1.7;margin:0 0 24px;font-size:15px;">
        Bonjour <strong>${user.prenom}</strong>,<br>
        L'abonnement de la boutique <strong>${boutique.nom}</strong> expire dans
        <strong>${daysLeft} jour${daysLeft > 1 ? 's' : ''}</strong>.
        Renouvelez-le maintenant pour ne pas interrompre votre activite.
      </p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${APP_URL()}/app/abonnement" style="display:inline-block;background:#FFD600;color:#071C08;text-decoration:none;padding:15px 44px;border-radius:8px;font-weight:700;font-size:16px;letter-spacing:0.3px;">
          Renouveler maintenant
        </a>
      </div>
      <div style="background:#fff;border-left:4px solid #D32F2F;border-radius:0 8px 8px 0;padding:14px 16px;margin:24px 0;">
        <p style="color:#D32F2F;font-size:13px;line-height:1.6;margin:0;">
          ${urgence
            ? 'Attention : votre acces sera suspendu tres prochainement. Renouvelez des maintenant pour eviter toute interruption.'
            : 'Apres expiration, vous ne pourrez plus enregistrer de ventes ni acceder a vos donnees. Renouvelez avant la date limite.'}
        </p>
      </div>
    </div>
    ${emailFooter()}
  `);

  await getTransporter().sendMail({
    from: FROM_EMAIL(),
    to: user.email,
    subject: `TekkiPro — Votre abonnement expire dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}`,
    html,
  });
};

module.exports = {
  verifyEmailTransport,
  buildVerificationEmail,
  buildPasswordResetEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPaymentConfirmationEmail,
  sendSubscriptionExpiryEmail,
  __getSmtpConfigSummaryForTests: getSmtpConfigSummary,
  __resetTransporterForTests: resetTransporterForTests,
};

const crypto = require('crypto');
const logger = require('../../common/utils/logger');
// Contrôleur Paiements — Stripe, Wave, Orange Money
const prisma = require('../../config/database');
const { PLAN_LIMITS } = require('../../middleware/auth.middleware');
const { sendPaymentConfirmationEmail } = require('../../services/email.service');
const { normalizePaymentMode } = require('../../common/constants/paymentModes');
const { badRequest, error: sendError, notFound, serviceUnavailable } = require('../../common/utils/response');

const SUBSCRIPTION_TYPES = ['souscrire', 'renouveler'];

const getSubscriptionType = (type) => {
  if (!type) return 'souscrire';
  const normalizedType = String(type).trim().toLowerCase();
  return SUBSCRIPTION_TYPES.includes(normalizedType) ? normalizedType : null;
};

const isProduction = () => process.env.NODE_ENV === 'production';

const rejectDemoProviderInProduction = (res, providerLabel) => {
  return serviceUnavailable(res, `${providerLabel} n'est pas disponible en production tant que l'intégration réelle n'est pas configurée.`, {
    code: 'PAYMENT_PROVIDER_NOT_CONFIGURED',
    provider: providerLabel,
  });
};

const getActiveSubscriptionForRenewal = async (boutiqueId, plan) => {
  const actif = await prisma.abonnement.findFirst({
    where: { boutiqueId, statut: 'ACTIF' },
    orderBy: { createdAt: 'desc' },
  });

  if (!actif) {
    return { error: 'Aucun abonnement actif à renouveler' };
  }

  if (plan && actif.plan !== plan) {
    return { error: 'Le renouvellement doit conserver le plan actuellement actif' };
  }

  return { actif };
};

const createConfirmedRenewal = async ({ abonnement, modePaiement, telephone, reference }) => {
  const nouvelleFin = new Date(abonnement.dateFin);
  nouvelleFin.setMonth(nouvelleFin.getMonth() + 1);

  return prisma.abonnement.update({
    where: { id: abonnement.id },
    data: {
      dateFin: nouvelleFin,
      paiements: {
        create: {
          montant: abonnement.montant,
          modePaiement: normalizePaymentMode(modePaiement),
          statut: 'CONFIRME',
          telephone: telephone || null,
          reference: reference || null,
        },
      },
    },
    include: { paiements: true },
  });
};

// ============================================
// STRIPE
// ============================================
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
}

// POST /api/payments/stripe/create-session — Créer une session Stripe Checkout
const createStripeSession = async (req, res) => {
  try {
    if (!stripe) {
      return serviceUnavailable(res, 'Stripe non configuré. Ajoutez STRIPE_SECRET_KEY dans .env', { code: 'STRIPE_NOT_CONFIGURED' });
    }

    const { plan, type } = req.body; // type = 'souscrire' | 'renouveler'
    const subscriptionType = getSubscriptionType(type);

    if (!plan || !['PRO', 'BUSINESS'].includes(plan)) {
      return badRequest(res, 'Plan invalide', { code: 'INVALID_PLAN' });
    }
    if (!subscriptionType) {
      return badRequest(res, 'Type de paiement invalide', { code: 'INVALID_SUBSCRIPTION_TYPE' });
    }

    let actif = null;
    if (subscriptionType === 'renouveler') {
      const renewalContext = await getActiveSubscriptionForRenewal(req.boutiqueId, plan);
      if (renewalContext.error) {
        return badRequest(res, renewalContext.error, { code: 'INVALID_RENEWAL_CONTEXT' });
      }
      actif = renewalContext.actif;
    }

    // Idempotence — éviter les doublons si session EN_ATTENTE récente (< 30 min)
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
    const existingPending = await prisma.paiementAbonnement.findFirst({
      where: {
        modePaiement: 'STRIPE',
        statut: 'EN_ATTENTE',
        createdAt: { gte: thirtyMinAgo },
        abonnement: { boutiqueId: req.boutiqueId },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (existingPending?.stripeSessionId) {
      try {
        const existingSession = await stripe.checkout.sessions.retrieve(existingPending.stripeSessionId);
        if (existingSession.status === 'open') {
          return res.json({ success: true, data: { sessionId: existingSession.id, url: existingSession.url } });
        }
      } catch (_) { /* session expirée ou invalide, on en crée une nouvelle */ }
    }

    const planInfo = PLAN_LIMITS[plan];
    const montantCFA = planInfo.prix; // en FCFA
    // Stripe gère les centimes, FCFA n'a pas de subdivision → montant en unités entières
    // Utiliser XOF (Franc CFA BCEAO) comme devise
    const appUrl = process.env.APP_URL || 'http://localhost:5173';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'xof',
          product_data: {
            name: `TekkiPro - Plan ${planInfo.nom}`,
            description: `Abonnement mensuel ${planInfo.nom} — Gestion boutique`,
          },
          unit_amount: montantCFA, // XOF is zero-decimal currency
        },
        quantity: 1,
      }],
      metadata: {
        boutiqueId: String(req.boutiqueId),
        userId: String(req.user.id),
        plan,
        type: subscriptionType,
      },
      success_url: `${appUrl}/abonnement?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/abonnement?payment=cancel`,
    });

    // Enregistrer la référence Stripe dans un paiement en attente
    const dateDebut = new Date();
    const dateFin = new Date();
    dateFin.setMonth(dateFin.getMonth() + 1);

    if (subscriptionType === 'renouveler') {
      await prisma.paiementAbonnement.create({
        data: {
          montant: montantCFA,
          modePaiement: 'STRIPE',
          statut: 'EN_ATTENTE',
          stripeSessionId: session.id,
          abonnementId: actif.id,
        },
      });
    } else {
      // Créer un abonnement en attente de confirmation paiement
      await prisma.abonnement.create({
        data: {
          plan,
          statut: 'EN_ATTENTE',
          montant: montantCFA,
          dateDebut,
          dateFin,
          boutiqueId: req.boutiqueId,
          paiements: {
            create: {
              montant: montantCFA,
              modePaiement: 'STRIPE',
              statut: 'EN_ATTENTE',
              stripeSessionId: session.id,
            },
          },
        },
      });
    }

    res.json({
      success: true,
      data: { sessionId: session.id, url: session.url },
    });
  } catch (error) {
    logger.error('Erreur createStripeSession', error);
    return sendError(res, 'Erreur lors de la création de la session Stripe', 500, { code: 'STRIPE_SESSION_CREATE_FAILED' });
  }
};

// POST /api/payments/stripe/webhook — Webhook Stripe
const stripeWebhook = async (req, res) => {
  try {
    if (!stripe) {
      return serviceUnavailable(res, 'Stripe non configuré', { code: 'STRIPE_NOT_CONFIGURED' });
    }

    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body, // raw body
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      logger.warn('Webhook signature verification failed', { err: err.message });
      return badRequest(res, 'Signature invalide', { code: 'INVALID_STRIPE_SIGNATURE' });
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const { boutiqueId, userId, plan, type } = session.metadata;

      // Trouver le paiement en attente
      const paiement = await prisma.paiementAbonnement.findUnique({
        where: { stripeSessionId: session.id },
        include: { abonnement: true },
      });

      if (paiement && paiement.statut === 'EN_ATTENTE') {
        await prisma.paiementAbonnement.update({
          where: { id: paiement.id },
          data: {
            statut: 'CONFIRME',
            stripePaymentId: session.payment_intent,
            reference: session.payment_intent,
          },
        });

        if (type === 'souscrire') {
          // Activer le nouvel abonnement
          await prisma.abonnement.update({
            where: { id: paiement.abonnementId },
            data: { statut: 'ACTIF' },
          });

          // Expirer les anciens abonnements actifs
          await prisma.abonnement.updateMany({
            where: {
              boutiqueId: parseInt(boutiqueId),
              statut: 'ACTIF',
              id: { not: paiement.abonnementId },
            },
            data: { statut: 'EXPIRE' },
          });

          // Mettre à jour le plan de la boutique
          await prisma.boutique.update({
            where: { id: parseInt(boutiqueId) },
            data: { plan },
          });
        } else if (type === 'renouveler') {
          // Prolonger l'abonnement actif
          const actif = await prisma.abonnement.findUnique({
            where: { id: paiement.abonnementId },
          });
          if (actif) {
            const nouvelleFin = new Date(actif.dateFin);
            nouvelleFin.setMonth(nouvelleFin.getMonth() + 1);
            await prisma.abonnement.update({
              where: { id: actif.id },
              data: { dateFin: nouvelleFin },
            });
          }
        }

        // Envoyer email de confirmation
        try {
          const user = await prisma.user.findUnique({ where: { id: parseInt(userId) } });
          const boutique = await prisma.boutique.findUnique({ where: { id: parseInt(boutiqueId) } });
          if (user && boutique) {
            await sendPaymentConfirmationEmail(user, boutique, plan, paiement.montant);
          }
        } catch (emailErr) {
          logger.warn('Erreur envoi email confirmation paiement', { err: emailErr.message });
        }
      }
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Erreur stripeWebhook', error);
    return sendError(res, 'Erreur webhook', 500, { code: 'STRIPE_WEBHOOK_FAILED' });
  }
};

// GET /api/payments/stripe/verify/:sessionId — Vérifier le statut d'une session
const verifyStripeSession = async (req, res) => {
  try {
    if (!stripe) {
      return serviceUnavailable(res, 'Stripe non configuré', { code: 'STRIPE_NOT_CONFIGURED' });
    }

    const { sessionId } = req.params;
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const paiement = await prisma.paiementAbonnement.findFirst({
      where: {
        stripeSessionId: sessionId,
        abonnement: { boutiqueId: req.boutiqueId },
      },
      include: { abonnement: true },
    });

    res.json({
      success: true,
      data: {
        status: session.payment_status,
        paiement: paiement ? {
          id: paiement.id,
          statut: paiement.statut,
          montant: paiement.montant,
          plan: paiement.abonnement?.plan,
        } : null,
      },
    });
  } catch (error) {
    logger.error('Erreur verifyStripeSession', error);
    return sendError(res, 'Erreur vérification session', 500, { code: 'STRIPE_SESSION_VERIFY_FAILED' });
  }
};

// ============================================
// WAVE MOBILE MONEY (Sénégal)
// ============================================

// POST /api/payments/wave/initiate — Initier un paiement Wave
const initiateWavePayment = async (req, res) => {
  try {
    const { plan, type, telephone } = req.body;
    const subscriptionType = getSubscriptionType(type);

    if (!plan || !['PRO', 'BUSINESS'].includes(plan)) {
      return badRequest(res, 'Plan invalide', { code: 'INVALID_PLAN' });
    }
    if (!subscriptionType) {
      return badRequest(res, 'Type de paiement invalide', { code: 'INVALID_SUBSCRIPTION_TYPE' });
    }
    if (!telephone) {
      return badRequest(res, 'Numéro de téléphone requis pour Wave', { code: 'WAVE_PHONE_REQUIRED' });
    }

    let actif = null;
    if (subscriptionType === 'renouveler') {
      const renewalContext = await getActiveSubscriptionForRenewal(req.boutiqueId, plan);
      if (renewalContext.error) {
        return badRequest(res, renewalContext.error, { code: 'INVALID_RENEWAL_CONTEXT' });
      }
      actif = renewalContext.actif;
    }

    const planInfo = PLAN_LIMITS[plan];
    const montant = planInfo.prix;
    const appUrl = process.env.APP_URL || 'http://localhost:5173';

    // Si Wave API est configurée, initier le paiement via l'API
    if (process.env.WAVE_API_KEY) {
      // Wave Checkout API
      const waveResponse = await fetch('https://api.wave.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.WAVE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: montant,
          currency: 'XOF',
          error_url: `${appUrl}/abonnement?payment=error`,
          success_url: `${appUrl}/abonnement?payment=success&provider=wave`,
        }),
      });

      if (!waveResponse.ok) {
        throw new Error('Erreur Wave API');
      }

      const waveData = await waveResponse.json();

      if (subscriptionType === 'renouveler') {
        await prisma.paiementAbonnement.create({
          data: {
            montant: actif.montant,
            modePaiement: 'WAVE',
            statut: 'EN_ATTENTE',
            telephone,
            reference: waveData.id || null,
            abonnementId: actif.id,
          },
        });
      } else {
        // Créer abonnement + paiement en attente
        const dateDebut = new Date();
        const dateFin = new Date();
        dateFin.setMonth(dateFin.getMonth() + 1);

        await prisma.abonnement.create({
          data: {
            plan,
            statut: 'EN_ATTENTE',
            montant,
            dateDebut,
            dateFin,
            boutiqueId: req.boutiqueId,
            paiements: {
              create: {
                montant,
                modePaiement: 'WAVE',
                statut: 'EN_ATTENTE',
                telephone,
                reference: waveData.id || null,
              },
            },
          },
        });
      }

      return res.json({
        success: true,
        data: {
          paymentUrl: waveData.wave_launch_url,
          reference: waveData.id,
        },
      });
    }

    if (isProduction()) {
      return rejectDemoProviderInProduction(res, 'Wave');
    }

    // Mode DÉMO — paiement simulé sans API Wave
    const reference = `WAVE-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    let abonnement;
    if (subscriptionType === 'renouveler') {
      abonnement = await createConfirmedRenewal({
        abonnement: actif,
        modePaiement: 'WAVE',
        telephone,
        reference,
      });
    } else {
      await prisma.abonnement.updateMany({
        where: { boutiqueId: req.boutiqueId, statut: 'ACTIF' },
        data: { statut: 'EXPIRE' },
      });

      const dateDebut = new Date();
      const dateFin = new Date();
      dateFin.setMonth(dateFin.getMonth() + 1);

      abonnement = await prisma.abonnement.create({
        data: {
          plan,
          statut: 'ACTIF',
          montant,
          dateDebut,
          dateFin,
          boutiqueId: req.boutiqueId,
          paiements: {
            create: {
              montant,
              modePaiement: 'WAVE',
              statut: 'CONFIRME',
              telephone,
              reference,
            },
          },
        },
        include: { paiements: true },
      });

      await prisma.boutique.update({
        where: { id: req.boutiqueId },
        data: { plan },
      });
    }

    // Email de confirmation
    try {
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      const boutique = await prisma.boutique.findUnique({ where: { id: req.boutiqueId } });
      if (user && boutique) {
        sendPaymentConfirmationEmail(user, boutique, plan, montant).catch(() => {});
      }
    } catch (e) { /* ignore */ }

    res.json({
      success: true,
      message: `Paiement Wave confirmé ! Plan ${planInfo.nom} activé.`,
      data: { abonnement, reference },
    });
  } catch (error) {
    logger.error('Erreur initiateWavePayment', error);
    return sendError(res, 'Erreur paiement Wave', 500, { code: 'WAVE_PAYMENT_FAILED' });
  }
};

// POST /api/payments/wave/webhook — Notification de paiement Wave
const waveWebhook = async (req, res) => {
  try {
    // Vérification signature Wave — header wave-signature contient HMAC-SHA256
    const waveSignature = req.headers['wave-signature'];
    if (process.env.WAVE_WEBHOOK_SECRET) {
      if (!waveSignature) {
        logger.warn('Wave webhook: header wave-signature manquant');
        return badRequest(res, 'Signature manquante', { code: 'WAVE_MISSING_SIGNATURE' });
      }
      const expectedSig = require('crypto')
        .createHmac('sha256', process.env.WAVE_WEBHOOK_SECRET)
        .update(JSON.stringify(req.body))
        .digest('hex');
      if (!require('crypto').timingSafeEqual(Buffer.from(waveSignature), Buffer.from(expectedSig))) {
        logger.warn('Wave webhook: signature invalide');
        return badRequest(res, 'Signature invalide', { code: 'WAVE_INVALID_SIGNATURE' });
      }
    }

    const { type, data: eventData } = req.body;
    if (type !== 'checkout.session.completed' || !eventData?.id) {
      return res.json({ received: true });
    }

    const waveSessionId = eventData.id;

    const paiement = await prisma.paiementAbonnement.findFirst({
      where: { reference: waveSessionId, modePaiement: 'WAVE', statut: 'EN_ATTENTE' },
      include: { abonnement: true },
    });

    if (!paiement) return res.json({ received: true });

    await prisma.paiementAbonnement.update({
      where: { id: paiement.id },
      data: { statut: 'CONFIRME' },
    });

    const abo = paiement.abonnement;

    if (abo.statut === 'EN_ATTENTE') {
      await prisma.abonnement.update({ where: { id: abo.id }, data: { statut: 'ACTIF' } });
      await prisma.abonnement.updateMany({
        where: { boutiqueId: abo.boutiqueId, statut: 'ACTIF', id: { not: abo.id } },
        data: { statut: 'EXPIRE' },
      });
      await prisma.boutique.update({ where: { id: abo.boutiqueId }, data: { plan: abo.plan } });
    } else {
      const nouvelleFin = new Date(abo.dateFin);
      nouvelleFin.setMonth(nouvelleFin.getMonth() + 1);
      await prisma.abonnement.update({ where: { id: abo.id }, data: { dateFin: nouvelleFin } });
    }

    try {
      const user = await prisma.user.findFirst({ where: { boutiqueId: abo.boutiqueId, role: 'ADMIN' } });
      const boutique = await prisma.boutique.findUnique({ where: { id: abo.boutiqueId } });
      if (user && boutique) sendPaymentConfirmationEmail(user, boutique, abo.plan, paiement.montant).catch(() => {});
    } catch (_) {}

    res.json({ received: true });
  } catch (error) {
    logger.error('Erreur waveWebhook', error);
    return sendError(res, 'Erreur webhook Wave', 500, { code: 'WAVE_WEBHOOK_FAILED' });
  }
};

// ============================================
// ORANGE MONEY (Sénégal)
// ============================================

// POST /api/payments/orange-money/initiate — Initier un paiement Orange Money
const initiateOrangeMoneyPayment = async (req, res) => {
  try {
    const { plan, type, telephone } = req.body;
    const subscriptionType = getSubscriptionType(type);

    if (!plan || !['PRO', 'BUSINESS'].includes(plan)) {
      return badRequest(res, 'Plan invalide', { code: 'INVALID_PLAN' });
    }
    if (!subscriptionType) {
      return badRequest(res, 'Type de paiement invalide', { code: 'INVALID_SUBSCRIPTION_TYPE' });
    }
    if (!telephone) {
      return badRequest(res, 'Numéro de téléphone requis pour Orange Money', { code: 'ORANGE_MONEY_PHONE_REQUIRED' });
    }

    let actif = null;
    if (subscriptionType === 'renouveler') {
      const renewalContext = await getActiveSubscriptionForRenewal(req.boutiqueId, plan);
      if (renewalContext.error) {
        return badRequest(res, renewalContext.error, { code: 'INVALID_RENEWAL_CONTEXT' });
      }
      actif = renewalContext.actif;
    }

    const planInfo = PLAN_LIMITS[plan];
    const montant = planInfo.prix;

    // Si API Orange Money configurée
    if (process.env.ORANGE_MONEY_API_KEY) {
      const appUrl = process.env.APP_URL || 'http://localhost:5173';
      const orderId = `OM-${Date.now()}-${req.boutiqueId}`;

      const omResponse = await fetch('https://api.orange.com/orange-money-webpay/sn/v1/webpayment', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.ORANGE_MONEY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          merchant_key: process.env.ORANGE_MONEY_MERCHANT_KEY,
          currency: 'OUV',
          order_id: orderId,
          amount: montant,
          return_url: `${appUrl}/abonnement?payment=success&provider=orange-money`,
          cancel_url: `${appUrl}/abonnement?payment=cancel`,
          notif_url: `${process.env.APP_URL}/api/payments/orange-money/webhook`,
          lang: 'fr',
        }),
      });

      if (!omResponse.ok) {
        const errData = await omResponse.json().catch(() => ({}));
        logger.error('Erreur Orange Money API', errData);
        throw new Error('Erreur API Orange Money');
      }

      const omData = await omResponse.json();
      const paymentUrl = omData.data?.payment_url || omData.payment_url;
      const reference = omData.data?.payment_token || omData.payment_token || orderId;

      if (subscriptionType === 'renouveler') {
        await prisma.paiementAbonnement.create({
          data: {
            montant: actif.montant,
            modePaiement: 'ORANGE_MONEY',
            statut: 'EN_ATTENTE',
            telephone,
            reference,
            abonnementId: actif.id,
          },
        });
      } else {
        const dateDebut = new Date();
        const dateFin = new Date();
        dateFin.setMonth(dateFin.getMonth() + 1);

        await prisma.abonnement.create({
          data: {
            plan,
            statut: 'EN_ATTENTE',
            montant,
            dateDebut,
            dateFin,
            boutiqueId: req.boutiqueId,
            paiements: {
              create: {
                montant,
                modePaiement: 'ORANGE_MONEY',
                statut: 'EN_ATTENTE',
                telephone,
                reference,
              },
            },
          },
        });
      }

      return res.json({
        success: true,
        data: { paymentUrl, reference },
      });
    }

    if (isProduction()) {
      return rejectDemoProviderInProduction(res, 'Orange Money');
    }

    // Mode DÉMO — paiement simulé
    const reference = `OM-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    let abonnement;
    if (subscriptionType === 'renouveler') {
      abonnement = await createConfirmedRenewal({
        abonnement: actif,
        modePaiement: 'ORANGE_MONEY',
        telephone,
        reference,
      });
    } else {
      await prisma.abonnement.updateMany({
        where: { boutiqueId: req.boutiqueId, statut: 'ACTIF' },
        data: { statut: 'EXPIRE' },
      });

      const dateDebut = new Date();
      const dateFin = new Date();
      dateFin.setMonth(dateFin.getMonth() + 1);

      abonnement = await prisma.abonnement.create({
        data: {
          plan,
          statut: 'ACTIF',
          montant,
          dateDebut,
          dateFin,
          boutiqueId: req.boutiqueId,
          paiements: {
            create: {
              montant,
              modePaiement: 'ORANGE_MONEY',
              statut: 'CONFIRME',
              telephone,
              reference,
            },
          },
        },
        include: { paiements: true },
      });

      await prisma.boutique.update({
        where: { id: req.boutiqueId },
        data: { plan },
      });
    }

    // Email de confirmation
    try {
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      const boutique = await prisma.boutique.findUnique({ where: { id: req.boutiqueId } });
      if (user && boutique) {
        sendPaymentConfirmationEmail(user, boutique, plan, montant).catch(() => {});
      }
    } catch (e) { /* ignore */ }

    res.json({
      success: true,
      message: `Paiement Orange Money confirmé ! Plan ${planInfo.nom} activé.`,
      data: { abonnement, reference },
    });
  } catch (error) {
    logger.error('Erreur initiateOrangeMoneyPayment', error);
    return sendError(res, 'Erreur paiement Orange Money', 500, { code: 'ORANGE_MONEY_PAYMENT_FAILED' });
  }
};

// POST /api/payments/orange-money/webhook — Notification de paiement Orange Money
const orangeMoneyWebhook = async (req, res) => {
  try {
    const { status, txnid, order_id, notif_token } = req.body;

    if (!order_id) {
      return badRequest(res, 'order_id manquant', { code: 'ORANGE_MONEY_WEBHOOK_INVALID' });
    }

    // Vérification de signature : notif_token = sha256(merchant_key + order_id)
    const merchantKey = process.env.ORANGE_MONEY_MERCHANT_KEY;
    if (merchantKey) {
      if (!notif_token) {
        logger.warn('Orange Money webhook: notif_token absent', { order_id });
        return badRequest(res, 'Signature manquante', { code: 'ORANGE_MONEY_MISSING_SIGNATURE' });
      }
      const expectedToken = crypto
        .createHash('sha256')
        .update(merchantKey + order_id)
        .digest('hex');
      if (!crypto.timingSafeEqual(Buffer.from(notif_token), Buffer.from(expectedToken))) {
        logger.warn('Orange Money webhook: signature invalide', { order_id });
        return badRequest(res, 'Signature invalide', { code: 'ORANGE_MONEY_INVALID_SIGNATURE' });
      }
    }

    const paiement = await prisma.paiementAbonnement.findFirst({
      where: { reference: order_id, modePaiement: 'ORANGE_MONEY', statut: 'EN_ATTENTE' },
      include: { abonnement: true },
    });

    if (!paiement) {
      return res.json({ received: true });
    }

    if (status === 'SUCCESS') {
      await prisma.paiementAbonnement.update({
        where: { id: paiement.id },
        data: { statut: 'CONFIRME', reference: txnid || order_id },
      });

      const abo = paiement.abonnement;

      if (abo.statut === 'EN_ATTENTE') {
        await prisma.abonnement.update({
          where: { id: abo.id },
          data: { statut: 'ACTIF' },
        });

        await prisma.abonnement.updateMany({
          where: { boutiqueId: abo.boutiqueId, statut: 'ACTIF', id: { not: abo.id } },
          data: { statut: 'EXPIRE' },
        });

        await prisma.boutique.update({
          where: { id: abo.boutiqueId },
          data: { plan: abo.plan },
        });
      } else {
        // Renouvellement — prolonger dateFin
        const nouvelleFin = new Date(abo.dateFin);
        nouvelleFin.setMonth(nouvelleFin.getMonth() + 1);
        await prisma.abonnement.update({
          where: { id: abo.id },
          data: { dateFin: nouvelleFin },
        });
      }

      try {
        const user = await prisma.user.findFirst({ where: { boutiqueId: abo.boutiqueId, role: 'ADMIN' } });
        const boutique = await prisma.boutique.findUnique({ where: { id: abo.boutiqueId } });
        if (user && boutique) {
          sendPaymentConfirmationEmail(user, boutique, abo.plan, paiement.montant).catch(() => {});
        }
      } catch (e) { /* ignore */ }
    } else if (status === 'FAILED' || status === 'CANCELLED') {
      await prisma.paiementAbonnement.update({
        where: { id: paiement.id },
        data: { statut: 'ECHOUE' },
      });
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Erreur orangeMoneyWebhook', error);
    return sendError(res, 'Erreur webhook Orange Money', 500, { code: 'ORANGE_MONEY_WEBHOOK_FAILED' });
  }
};

// ============================================
// FREE MONEY (Sénégal)
// ============================================

// POST /api/payments/free-money/initiate — Initier un paiement Free Money
const initiateFreeMoneyPayment = async (req, res) => {
  try {
    const { plan, type, telephone } = req.body;
    const subscriptionType = getSubscriptionType(type);

    if (!plan || !['PRO', 'BUSINESS'].includes(plan)) {
      return badRequest(res, 'Plan invalide', { code: 'INVALID_PLAN' });
    }
    if (!subscriptionType) {
      return badRequest(res, 'Type de paiement invalide', { code: 'INVALID_SUBSCRIPTION_TYPE' });
    }
    if (!telephone) {
      return badRequest(res, 'Numéro de téléphone requis', { code: 'FREE_MONEY_PHONE_REQUIRED' });
    }

    let actif = null;
    if (subscriptionType === 'renouveler') {
      const renewalContext = await getActiveSubscriptionForRenewal(req.boutiqueId, plan);
      if (renewalContext.error) {
        return badRequest(res, renewalContext.error, { code: 'INVALID_RENEWAL_CONTEXT' });
      }
      actif = renewalContext.actif;
    }

    const planInfo = PLAN_LIMITS[plan];
    const montant = planInfo.prix;

    if (isProduction()) {
      return rejectDemoProviderInProduction(res, 'Free Money');
    }

    // Mode DÉMO
    const reference = `FREE-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    let abonnement;
    if (subscriptionType === 'renouveler') {
      abonnement = await createConfirmedRenewal({
        abonnement: actif,
        modePaiement: 'FREE_MONEY',
        telephone,
        reference,
      });
    } else {
      await prisma.abonnement.updateMany({
        where: { boutiqueId: req.boutiqueId, statut: 'ACTIF' },
        data: { statut: 'EXPIRE' },
      });

      const dateDebut = new Date();
      const dateFin = new Date();
      dateFin.setMonth(dateFin.getMonth() + 1);

      abonnement = await prisma.abonnement.create({
        data: {
          plan,
          statut: 'ACTIF',
          montant,
          dateDebut,
          dateFin,
          boutiqueId: req.boutiqueId,
          paiements: {
            create: {
              montant,
              modePaiement: 'FREE_MONEY',
              statut: 'CONFIRME',
              telephone,
              reference,
            },
          },
        },
        include: { paiements: true },
      });

      await prisma.boutique.update({
        where: { id: req.boutiqueId },
        data: { plan },
      });
    }

    res.json({
      success: true,
      message: `Paiement Free Money confirmé ! Plan ${planInfo.nom} activé.`,
      data: { abonnement, reference },
    });
  } catch (error) {
    logger.error('Erreur initiateFreeMoneyPayment', error);
    return sendError(res, 'Erreur paiement Free Money', 500, { code: 'FREE_MONEY_PAYMENT_FAILED' });
  }
};

// ============================================
// Statut paiement générique
// ============================================

// GET /api/payments/status/:paiementId — Statut d'un paiement
const getPaymentStatus = async (req, res) => {
  try {
    const { paiementId } = req.params;
    const paiement = await prisma.paiementAbonnement.findFirst({
      where: {
        id: parseInt(paiementId),
        abonnement: { boutiqueId: req.boutiqueId },
      },
      include: { abonnement: { select: { plan: true, statut: true, dateFin: true } } },
    });

    if (!paiement) {
      return notFound(res, 'Paiement non trouvé', { code: 'PAYMENT_NOT_FOUND' });
    }

    res.json({ success: true, data: paiement });
  } catch (error) {
    logger.error('Erreur getPaymentStatus', error);
    return sendError(res, 'Erreur serveur', 500, { code: 'PAYMENT_STATUS_FETCH_FAILED' });
  }
};

module.exports = {
  createStripeSession,
  stripeWebhook,
  verifyStripeSession,
  initiateWavePayment,
  waveWebhook,
  initiateOrangeMoneyPayment,
  orangeMoneyWebhook,
  initiateFreeMoneyPayment,
  getPaymentStatus,
};

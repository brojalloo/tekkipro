// Contrôleur Abonnements
const prisma = require('../../config/database');
const { badRequest, error: sendError } = require('../../common/utils/response');
const logger = require('../../common/utils/logger');
const { PLAN_LIMITS } = require('../../middleware/auth.middleware');
const {
  isAutomatedSubscriptionPaymentMode,
  isManualSubscriptionPaymentMode,
  normalizePaymentMode,
} = require('../../common/constants/paymentModes');

const validateLegacySubscriptionMode = (modePaiement, actionLabel) => {
  const normalizedMode = normalizePaymentMode(modePaiement);

  if (!normalizedMode) {
    return { status: 400, message: 'Mode de paiement requis' };
  }

  if (isAutomatedSubscriptionPaymentMode(normalizedMode)) {
    return {
      status: 400,
      message: `Le mode de paiement ${normalizedMode} doit passer par /api/payments/* pour ${actionLabel}.`,
    };
  }

  if (!isManualSubscriptionPaymentMode(normalizedMode)) {
    return {
      status: 400,
      message: `Mode de paiement ${normalizedMode} non supporté pour ${actionLabel}.`,
    };
  }

  return { normalizedMode };
};

// GET /api/abonnements — Infos abonnement actuel + historique
const getAbonnement = async (req, res) => {
  try {
    const boutique = await prisma.boutique.findUnique({
      where: { id: req.boutiqueId },
      select: { id: true, plan: true, nom: true },
    });

    // Abonnement actif
    const actif = await prisma.abonnement.findFirst({
      where: { boutiqueId: req.boutiqueId, statut: 'ACTIF' },
      include: { paiements: { orderBy: { createdAt: 'desc' } } },
      orderBy: { createdAt: 'desc' },
    });

    // Historique
    const historique = await prisma.abonnement.findMany({
      where: { boutiqueId: req.boutiqueId },
      include: { paiements: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // Compteurs actuels
    const now = new Date();
    const debutMois = new Date(now.getFullYear(), now.getMonth(), 1);

    const [nbUtilisateurs, nbProduits, nbClients, nbVentesMois, nbCategories] = await Promise.all([
      prisma.user.count({ where: { boutiqueId: req.boutiqueId, actif: true } }),
      prisma.produit.count({ where: { boutiqueId: req.boutiqueId, actif: true } }),
      prisma.client.count({ where: { boutiqueId: req.boutiqueId } }),
      prisma.vente.count({ where: { boutiqueId: req.boutiqueId, createdAt: { gte: debutMois }, statut: { not: 'ANNULEE' } } }),
      prisma.categorie.count({ where: { boutiqueId: req.boutiqueId } }),
    ]);

    const limites = PLAN_LIMITS[boutique.plan];

    res.json({
      success: true,
      data: {
        plan: boutique.plan,
        planNom: limites.nom,
        abonnementActif: actif,
        historique,
        utilisation: {
          utilisateurs: { actuel: nbUtilisateurs, limite: limites.utilisateurs },
          produits: { actuel: nbProduits, limite: limites.produits },
          clients: { actuel: nbClients, limite: limites.clients },
          ventesParMois: { actuel: nbVentesMois, limite: limites.ventesParMois },
          categories: { actuel: nbCategories, limite: limites.categories },
        },
        planFeatures: {
          fournisseurs: limites.fournisseurs,
          employes: limites.employes,
          multiBoutique: limites.multiBoutique,
          exportPdf: limites.exportPdf,
          statsAvancees: limites.statsAvancees,
        },
        plans: PLAN_LIMITS,
      },
    });
  } catch (error) {
    logger.error('Erreur getAbonnement', error);
    return sendError(res, 'Erreur serveur', 500, { code: 'SUBSCRIPTION_FETCH_FAILED' });
  }
};

// POST /api/abonnements/souscrire — Souscrire ou changer de plan
const souscrire = async (req, res) => {
  try {
    const { plan, modePaiement, reference, telephone } = req.body;

    if (!plan || !['PRO', 'BUSINESS'].includes(plan)) {
      return badRequest(res, 'Plan invalide', { code: 'INVALID_PLAN' });
    }
    const paymentModeValidation = validateLegacySubscriptionMode(modePaiement, 'cette souscription');
    if (paymentModeValidation.message) {
      return sendError(res, paymentModeValidation.message, paymentModeValidation.status, { code: 'INVALID_PAYMENT_MODE' });
    }

    const montant = PLAN_LIMITS[plan].prix;
    const dateDebut = new Date();
    const dateFin = new Date();
    dateFin.setMonth(dateFin.getMonth() + 1);

    // Expirer les anciens abonnements actifs
    await prisma.abonnement.updateMany({
      where: { boutiqueId: req.boutiqueId, statut: 'ACTIF' },
      data: { statut: 'EXPIRE' },
    });

    // Créer le nouvel abonnement avec paiement
    const abonnement = await prisma.abonnement.create({
      data: {
        plan,
        montant,
        dateDebut,
        dateFin,
        boutiqueId: req.boutiqueId,
        paiements: {
          create: {
            montant,
            modePaiement: paymentModeValidation.normalizedMode,
            reference: reference || null,
            telephone: telephone || null,
          },
        },
      },
      include: { paiements: true },
    });

    // Mettre à jour le plan de la boutique
    await prisma.boutique.update({
      where: { id: req.boutiqueId },
      data: { plan },
    });

    res.json({
      success: true,
      message: `Abonnement ${PLAN_LIMITS[plan].nom} activé avec succès !`,
      data: abonnement,
    });
  } catch (error) {
    logger.error('Erreur souscrire', error);
    return sendError(res, 'Erreur serveur', 500, { code: 'SUBSCRIPTION_CREATE_FAILED' });
  }
};

// POST /api/abonnements/renouveler — Renouveler l'abonnement en cours
const renouveler = async (req, res) => {
  try {
    const { modePaiement, reference, telephone } = req.body;

    const paymentModeValidation = validateLegacySubscriptionMode(modePaiement, 'ce renouvellement');
    if (paymentModeValidation.message) {
      return sendError(res, paymentModeValidation.message, paymentModeValidation.status, { code: 'INVALID_PAYMENT_MODE' });
    }

    const actif = await prisma.abonnement.findFirst({
      where: { boutiqueId: req.boutiqueId, statut: 'ACTIF' },
      orderBy: { createdAt: 'desc' },
    });

    if (!actif) {
      return badRequest(res, 'Aucun abonnement actif à renouveler', { code: 'NO_ACTIVE_SUBSCRIPTION' });
    }

    // Prolonger d'un mois à partir de la fin actuelle
    const nouvelleFin = new Date(actif.dateFin);
    nouvelleFin.setMonth(nouvelleFin.getMonth() + 1);

    const abonnement = await prisma.abonnement.update({
      where: { id: actif.id },
      data: {
        dateFin: nouvelleFin,
        paiements: {
          create: {
            montant: actif.montant,
            modePaiement: paymentModeValidation.normalizedMode,
            reference: reference || null,
            telephone: telephone || null,
          },
        },
      },
      include: { paiements: { orderBy: { createdAt: 'desc' } } },
    });

    res.json({
      success: true,
      message: 'Abonnement renouvelé avec succès !',
      data: abonnement,
    });
  } catch (error) {
    logger.error('Erreur renouveler', error);
    return sendError(res, 'Erreur serveur', 500, { code: 'SUBSCRIPTION_RENEW_FAILED' });
  }
};

// POST /api/abonnements/annuler — Annuler et repasser en Gratuit
const annuler = async (req, res) => {
  try {
    await prisma.abonnement.updateMany({
      where: { boutiqueId: req.boutiqueId, statut: 'ACTIF' },
      data: { statut: 'ANNULE' },
    });

    await prisma.boutique.update({
      where: { id: req.boutiqueId },
      data: { plan: 'GRATUIT' },
    });

    res.json({ success: true, message: 'Abonnement annulé. Vous êtes repassé au plan Gratuit.' });
  } catch (error) {
    logger.error('Erreur annuler abonnement', error);
    return sendError(res, 'Erreur serveur', 500, { code: 'SUBSCRIPTION_CANCEL_FAILED' });
  }
};

module.exports = { getAbonnement, souscrire, renouveler, annuler };

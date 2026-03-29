// Middleware d'authentification JWT
const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const { error: sendError, forbidden, unauthorized } = require('../common/utils/response');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return unauthorized(res, 'Accès non autorisé', { code: 'AUTH_REQUIRED' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { boutique: { include: { childBoutiques: { select: { id: true, nom: true, slug: true } } } } },
    });

    if (!user || !user.actif) {
      return unauthorized(res, 'Utilisateur non trouvé ou désactivé', { code: 'USER_INACTIVE_OR_MISSING' });
    }

    // Bloquer si boutique suspendue ou supprimée (sauf SUPERADMIN qui n'a pas de boutique)
    if (user.boutique && (user.boutique.statut === 'SUSPENDUE' || user.boutique.deletedAt)) {
      return forbidden(res, 'Boutique suspendue ou supprimée', { code: 'BOUTIQUE_INACTIVE' });
    }

    req.user = user;
    req.boutiqueId = user.boutiqueId;

    // Multi-boutique: si header X-Boutique-Id présent, vérifier l'accès et switcher
    const headerBoutiqueId = req.header('X-Boutique-Id');
    if (headerBoutiqueId) {
      const targetId = parseInt(headerBoutiqueId);
      if (!isNaN(targetId) && targetId !== user.boutiqueId) {
        // Vérifier que l'user a accès à cette boutique (enfant de sa boutique principale)
        const mainBoutiqueId = user.boutique.parentBoutiqueId || user.boutiqueId;
        const allowed = await prisma.boutique.findFirst({
          where: {
            id: targetId,
            OR: [
              { id: mainBoutiqueId },
              { parentBoutiqueId: mainBoutiqueId },
            ],
          },
        });
        if (allowed && user.boutique.plan === 'BUSINESS') {
          req.boutiqueId = targetId;
        }
      }
    }

    next();
  } catch (error) {
    return unauthorized(res, 'Token invalide', { code: 'INVALID_TOKEN' });
  }
};

// Middleware pour vérifier le rôle ADMIN
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return forbidden(res, 'Accès réservé aux administrateurs', { code: 'ADMIN_ONLY' });
  }
  next();
};

// Middleware pour vérifier le rôle SUPERADMIN
const superAdminOnly = (req, res, next) => {
  if (req.user.role !== 'SUPERADMIN') {
    return forbidden(res, 'Accès réservé au super-administrateur', { code: 'SUPERADMIN_ONLY' });
  }
  next();
};

// Limites par plan
const PLAN_LIMITS = {
  GRATUIT: {
    nom: 'Starter',
    prix: 0,
    utilisateurs: 1,
    produits: 50,
    clients: 30,
    ventesParMois: 100,
    categories: 5,
    fournisseurs: false,
    employes: false,
    multiBoutique: false,
    exportPdf: false,
    statsAvancees: false,
  },
  PRO: {
    nom: 'Pro',
    prix: 5000,
    utilisateurs: 5,
    produits: 999999,
    clients: 999999,
    ventesParMois: 999999,
    categories: 999999,
    fournisseurs: true,
    employes: true,
    multiBoutique: false,
    exportPdf: true,
    statsAvancees: true,
  },
  BUSINESS: {
    nom: 'Business',
    prix: 10000,
    utilisateurs: 999999,
    produits: 999999,
    clients: 999999,
    ventesParMois: 999999,
    categories: 999999,
    fournisseurs: true,
    employes: true,
    multiBoutique: true,
    exportPdf: true,
    statsAvancees: true,
  },
};

// Middleware générique : exiger un plan minimum
const requirePlan = (...allowedPlans) => {
  return async (req, res, next) => {
    try {
      const boutique = await prisma.boutique.findUnique({ where: { id: req.boutiqueId } });
      if (!allowedPlans.includes(boutique.plan)) {
        const planNames = allowedPlans.map(p => PLAN_LIMITS[p].nom).join(' ou ');
        return forbidden(res, `Cette fonctionnalité est réservée au plan ${planNames}. Passez à un plan supérieur.`, {
          code: 'PLAN_UPGRADE_REQUIRED',
          upgrade: true,
          requiredPlan: allowedPlans[0],
        });
      }
      next();
    } catch (error) {
      return sendError(res, 'Erreur vérification plan', 500, { code: 'PLAN_CHECK_FAILED' });
    }
  };
};

const getPlanDisplayName = (plan) => PLAN_LIMITS[plan]?.nom || plan;

// Middleware pour vérifier les limites du plan (produits)
const checkPlanProduits = async (req, res, next) => {
  try {
    const boutique = await prisma.boutique.findUnique({ where: { id: req.boutiqueId } });
    const limite = PLAN_LIMITS[boutique.plan].produits;
    const planName = getPlanDisplayName(boutique.plan);
    const count = await prisma.produit.count({ where: { boutiqueId: req.boutiqueId, actif: true } });
    if (count >= limite) {
      return forbidden(res, `Limite du plan ${planName} atteinte (${limite} produits). Passez à un plan supérieur.`, {
        code: 'PLAN_UPGRADE_REQUIRED',
        upgrade: true,
      });
    }
    next();
  } catch (error) {
    return sendError(res, 'Erreur vérification plan', 500, { code: 'PLAN_CHECK_FAILED' });
  }
};

// Middleware pour vérifier les limites du plan (utilisateurs)
const checkPlanUtilisateurs = async (req, res, next) => {
  try {
    const boutique = await prisma.boutique.findUnique({ where: { id: req.boutiqueId } });
    const limite = PLAN_LIMITS[boutique.plan].utilisateurs;
    const planName = getPlanDisplayName(boutique.plan);
    const count = await prisma.user.count({ where: { boutiqueId: req.boutiqueId, actif: true } });
    if (count >= limite) {
      return forbidden(res, `Limite du plan ${planName} atteinte (${limite} utilisateur${limite > 1 ? 's' : ''}). Passez à un plan supérieur.`, {
        code: 'PLAN_UPGRADE_REQUIRED',
        upgrade: true,
      });
    }
    next();
  } catch (error) {
    return sendError(res, 'Erreur vérification plan', 500, { code: 'PLAN_CHECK_FAILED' });
  }
};

// Middleware pour vérifier les limites du plan (clients)
const checkPlanClients = async (req, res, next) => {
  try {
    const boutique = await prisma.boutique.findUnique({ where: { id: req.boutiqueId } });
    const limite = PLAN_LIMITS[boutique.plan].clients;
    const planName = getPlanDisplayName(boutique.plan);
    const count = await prisma.client.count({ where: { boutiqueId: req.boutiqueId } });
    if (count >= limite) {
      return forbidden(res, `Limite du plan ${planName} atteinte (${limite} clients). Passez à un plan supérieur.`, {
        code: 'PLAN_UPGRADE_REQUIRED',
        upgrade: true,
      });
    }
    next();
  } catch (error) {
    return sendError(res, 'Erreur vérification plan', 500, { code: 'PLAN_CHECK_FAILED' });
  }
};

// Middleware pour vérifier les limites du plan (ventes par mois)
const checkPlanVentes = async (req, res, next) => {
  try {
    const boutique = await prisma.boutique.findUnique({ where: { id: req.boutiqueId } });
    const limite = PLAN_LIMITS[boutique.plan].ventesParMois;
    const planName = getPlanDisplayName(boutique.plan);
    // Compter les ventes du mois en cours
    const now = new Date();
    const debutMois = new Date(now.getFullYear(), now.getMonth(), 1);
    const count = await prisma.vente.count({
      where: {
        boutiqueId: req.boutiqueId,
        createdAt: { gte: debutMois },
        statut: { not: 'ANNULEE' },
      },
    });
    if (count >= limite) {
      return forbidden(res, `Limite du plan ${planName} atteinte (${limite} ventes/mois). Passez à un plan supérieur.`, {
        code: 'PLAN_UPGRADE_REQUIRED',
        upgrade: true,
      });
    }
    next();
  } catch (error) {
    return sendError(res, 'Erreur vérification plan', 500, { code: 'PLAN_CHECK_FAILED' });
  }
};

// Middleware pour vérifier les limites du plan (catégories)
const checkPlanCategories = async (req, res, next) => {
  try {
    const boutique = await prisma.boutique.findUnique({ where: { id: req.boutiqueId } });
    const limite = PLAN_LIMITS[boutique.plan].categories;
    const planName = getPlanDisplayName(boutique.plan);
    const count = await prisma.categorie.count({ where: { boutiqueId: req.boutiqueId } });
    if (count >= limite) {
      return forbidden(res, `Limite du plan ${planName} atteinte (${limite} catégories). Passez à un plan supérieur.`, {
        code: 'PLAN_UPGRADE_REQUIRED',
        upgrade: true,
      });
    }
    next();
  } catch (error) {
    return sendError(res, 'Erreur vérification plan', 500, { code: 'PLAN_CHECK_FAILED' });
  }
};

module.exports = { auth, adminOnly, superAdminOnly, PLAN_LIMITS, requirePlan, checkPlanProduits, checkPlanUtilisateurs, checkPlanClients, checkPlanVentes, checkPlanCategories };

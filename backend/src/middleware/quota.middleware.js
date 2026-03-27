// backend/src/middleware/quota.middleware.js
'use strict';

const prisma = require('../config/database');
const { PLAN_LIMITS } = require('./auth.middleware');

/**
 * Returns { used, limit } for a given quota type.
 * limit = 999999 for PRO/BUSINESS plans (no real limit).
 */
const getQuotaUsage = async (boutiqueId, quotaType) => {
  const boutique = await prisma.boutique.findUnique({
    where: { id: boutiqueId },
    select: { plan: true },
  });
  const plan = boutique?.plan || 'GRATUIT';
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.GRATUIT;

  switch (quotaType) {
    case 'Ventes': {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const used = await prisma.vente.count({
        where: { boutiqueId, createdAt: { gte: startOfMonth }, statut: { not: 'ANNULEE' } },
      });
      return { used, limit: limits.ventesParMois };
    }
    case 'Produits': {
      const used = await prisma.produit.count({ where: { boutiqueId, actif: true } });
      return { used, limit: limits.produits };
    }
    case 'Clients': {
      const used = await prisma.client.count({ where: { boutiqueId } });
      return { used, limit: limits.clients };
    }
    default:
      return { used: 0, limit: null };
  }
};

/**
 * Middleware factory. Applied after the main handler on POST routes.
 * Injects X-Quota-<Type>-Used, X-Quota-<Type>-Limit, X-Plan-Tier in the response.
 */
const attachQuotaHeaders = (quotaType) => async (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = async function (body) {
    if (res.statusCode < 400 && req.boutiqueId) {
      try {
        const { used, limit } = await getQuotaUsage(req.boutiqueId, quotaType);
        res.setHeader(`X-Quota-${quotaType}-Used`, String(used));
        res.setHeader(`X-Quota-${quotaType}-Limit`, String(limit));
        res.setHeader('X-Plan-Tier', req.user?.boutique?.plan || 'GRATUIT');
      } catch (_) {
        // Non-blocking: quota headers are optional
      }
    }
    return originalJson(body);
  };

  next();
};

module.exports = { attachQuotaHeaders, getQuotaUsage };

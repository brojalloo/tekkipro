// Service Cron — Gestion automatique des abonnements + alertes produits
const cron = require('node-cron');
const prisma = require('../config/database');
const { sendSubscriptionExpiryEmail } = require('./email.service');
const logger = require('../common/utils/logger');

// Vérifier et expirer les abonnements + alertes produits — tous les jours à 2h du matin
const startSubscriptionCron = () => {
  cron.schedule('0 2 * * *', async () => {
    logger.info('[CRON] Vérification des abonnements et produits...');
    try {
      await expireOverdueSubscriptions();
      await sendExpiryReminders();
      await alertExpiredProducts();
      logger.info('[CRON] Vérification terminée avec succès');
    } catch (error) {
      logger.error('[CRON] Erreur critique', error);
    }
  });

  logger.info('[CRON] Cron abonnements + produits activé (quotidien à 02:00)');
};

// Expirer les abonnements dont la dateFin est dépassée
const expireOverdueSubscriptions = async () => {
  const now = new Date();

  const expired = await prisma.abonnement.findMany({
    where: {
      statut: 'ACTIF',
      dateFin: { lt: now },
    },
    include: {
      boutique: {
        include: {
          users: { where: { role: 'ADMIN' }, take: 1 },
        },
      },
    },
  });

  for (const abo of expired) {
    // Marquer l'abonnement comme expiré
    await prisma.abonnement.update({
      where: { id: abo.id },
      data: { statut: 'EXPIRE' },
    });

    // Repasser au GRATUIT seulement si aucun autre abonnement actif n'existe
    const autreAboActif = await prisma.abonnement.findFirst({
      where: { boutiqueId: abo.boutiqueId, statut: 'ACTIF', id: { not: abo.id } },
    });
    if (!autreAboActif) {
      await prisma.boutique.update({
        where: { id: abo.boutiqueId },
        data: { plan: 'GRATUIT' },
      });
    }

    logger.info('[CRON] Abonnement expiré', { aboId: abo.id, boutique: abo.boutique.nom });

    // Notifier l'admin
    const admin = abo.boutique.users[0];
    if (admin) {
      sendSubscriptionExpiryEmail(admin, abo.boutique, 0).catch(err => {
        logger.error('[CRON] Erreur email expiration', { boutiqueId: abo.boutiqueId, err: err.message });
      });
    }
  }

  if (expired.length > 0) {
    logger.info('[CRON] Abonnements expirés traités', { count: expired.length });
  }
};

// Envoyer des rappels avant expiration (7 jours, 3 jours, 1 jour)
const sendExpiryReminders = async () => {
  const reminderDays = [7, 3, 1];

  for (const days of reminderDays) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days);

    // Trouver les abonnements qui expirent ce jour-là (marge de 24h)
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const expiring = await prisma.abonnement.findMany({
      where: {
        statut: 'ACTIF',
        dateFin: { gte: startOfDay, lte: endOfDay },
      },
      include: {
        boutique: {
          include: {
            users: { where: { role: 'ADMIN' }, take: 1 },
          },
        },
      },
    });

    for (const abo of expiring) {
      const admin = abo.boutique.users[0];
      if (admin) {
        sendSubscriptionExpiryEmail(admin, abo.boutique, days).catch(err => {
          logger.error('[CRON] Erreur email rappel', { boutiqueId: abo.boutiqueId, err: err.message });
        });
      }
    }

    if (expiring.length > 0) {
      logger.info('[CRON] Rappels expiration envoyés', { count: expiring.length, dansJours: days });
    }
  }
};

// Alerter sur les produits périmés ou proches de péremption
const alertExpiredProducts = async () => {
  const now = new Date();

  // Récupérer tous les produits actifs avec une date de péremption
  const produits = await prisma.produit.findMany({
    where: {
      actif: true,
      datePeremption: { not: null },
    },
    select: {
      id: true,
      nom: true,
      datePeremption: true,
      alertePeremptionJours: true,
      boutiqueId: true,
      boutique: {
        select: {
          nom: true,
          users: { where: { role: 'ADMIN' }, take: 1, select: { email: true, nom: true, prenom: true } },
        },
      },
    },
  });

  const expires = [];
  const alerts = [];

  for (const produit of produits) {
    const datePeremption = new Date(produit.datePeremption);
    const joursRestants = Math.ceil((datePeremption - now) / (1000 * 60 * 60 * 24));
    const seuilAlerte = produit.alertePeremptionJours ?? 30;

    if (joursRestants <= 0) {
      expires.push({ ...produit, joursRestants });
    } else if (joursRestants <= seuilAlerte) {
      alerts.push({ ...produit, joursRestants });
    }
  }

  if (expires.length > 0) {
    logger.warn('[CRON] Produits périmés détectés', { count: expires.length });
  }
  if (alerts.length > 0) {
    logger.warn('[CRON] Produits proches de péremption', { count: alerts.length });
  }

  // Désactiver les produits périmés depuis plus de 0 jours (optionnel selon la config)
  if (process.env.AUTO_DEACTIVATE_EXPIRED_PRODUCTS === 'true' && expires.length > 0) {
    const expiredIds = expires.map(p => p.id);
    await prisma.produit.updateMany({
      where: { id: { in: expiredIds } },
      data: { actif: false },
    });
    logger.info('[CRON] Produits périmés désactivés', { count: expiredIds.length });
  }
};

module.exports = { startSubscriptionCron, expireOverdueSubscriptions, sendExpiryReminders, alertExpiredProducts };

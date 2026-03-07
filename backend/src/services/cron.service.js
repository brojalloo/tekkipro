// Service Cron — Gestion automatique des abonnements
const cron = require('node-cron');
const prisma = require('../config/database');
const { sendSubscriptionExpiryEmail } = require('./email.service');

// Vérifier et expirer les abonnements dépassés — tous les jours à 2h du matin
const startSubscriptionCron = () => {
  // Exécuter à 02:00 chaque jour
  cron.schedule('0 2 * * *', async () => {
    console.log('[CRON] Vérification des abonnements...');
    try {
      await expireOverdueSubscriptions();
      await sendExpiryReminders();
      console.log('[CRON] Vérification terminée avec succès');
    } catch (error) {
      console.error('[CRON] Erreur:', error);
    }
  });

  console.log('📅 Cron abonnements activé (quotidien à 02:00)');
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

    // Repasser la boutique au plan GRATUIT
    await prisma.boutique.update({
      where: { id: abo.boutiqueId },
      data: { plan: 'GRATUIT' },
    });

    console.log(`[CRON] Abonnement #${abo.id} expiré — Boutique ${abo.boutique.nom} repassée en GRATUIT`);

    // Notifier l'admin
    const admin = abo.boutique.users[0];
    if (admin) {
      sendSubscriptionExpiryEmail(admin, abo.boutique, 0).catch(err => {
        console.error(`[CRON] Erreur email expiration boutique ${abo.boutiqueId}:`, err.message);
      });
    }
  }

  if (expired.length > 0) {
    console.log(`[CRON] ${expired.length} abonnement(s) expiré(s)`);
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
          console.error(`[CRON] Erreur email rappel boutique ${abo.boutiqueId}:`, err.message);
        });
      }
    }

    if (expiring.length > 0) {
      console.log(`[CRON] ${expiring.length} rappel(s) envoyé(s) — expiration dans ${days} jour(s)`);
    }
  }
};

module.exports = { startSubscriptionCron, expireOverdueSubscriptions, sendExpiryReminders };

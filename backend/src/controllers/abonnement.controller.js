// Contrôleur Abonnements
const prisma = require('../config/database');
const { PLAN_LIMITS } = require('../middleware/auth.middleware');

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
    console.error('Erreur getAbonnement:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// POST /api/abonnements/souscrire — Souscrire ou changer de plan
const souscrire = async (req, res) => {
  try {
    const { plan, modePaiement, reference, telephone } = req.body;

    if (!plan || !['PRO', 'BUSINESS'].includes(plan)) {
      return res.status(400).json({ success: false, message: 'Plan invalide' });
    }
    if (!modePaiement) {
      return res.status(400).json({ success: false, message: 'Mode de paiement requis' });
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
            modePaiement,
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
    console.error('Erreur souscrire:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// POST /api/abonnements/renouveler — Renouveler l'abonnement en cours
const renouveler = async (req, res) => {
  try {
    const { modePaiement, reference, telephone } = req.body;

    const actif = await prisma.abonnement.findFirst({
      where: { boutiqueId: req.boutiqueId, statut: 'ACTIF' },
      orderBy: { createdAt: 'desc' },
    });

    if (!actif) {
      return res.status(400).json({ success: false, message: 'Aucun abonnement actif à renouveler' });
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
            modePaiement,
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
    console.error('Erreur renouveler:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
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
    console.error('Erreur annuler:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

module.exports = { getAbonnement, souscrire, renouveler, annuler };

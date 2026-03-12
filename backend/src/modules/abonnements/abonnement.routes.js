// Routes Abonnements
const router = require('express').Router();
const ctrl = require('./abonnement.controller');
const { auth, adminOnly, PLAN_LIMITS } = require('../../middleware/auth.middleware');
const prisma = require('../../config/database');

// GET /api/abonnements/plan-info — Limites du plan actuel (pour tout utilisateur connecté)
router.get('/plan-info', auth, async (req, res) => {
  try {
    const boutique = await prisma.boutique.findUnique({ where: { id: req.boutiqueId } });
    const plan = boutique.plan;
    const limites = PLAN_LIMITS[plan];

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

    res.json({
      success: true,
      data: {
        plan,
        planNom: limites.nom,
        limites: {
          utilisateurs: limites.utilisateurs,
          produits: limites.produits,
          clients: limites.clients,
          ventesParMois: limites.ventesParMois,
          categories: limites.categories,
        },
        utilisation: {
          utilisateurs: nbUtilisateurs,
          produits: nbProduits,
          clients: nbClients,
          ventesParMois: nbVentesMois,
          categories: nbCategories,
        },
        features: {
          fournisseurs: limites.fournisseurs,
          employes: limites.employes,
          multiBoutique: limites.multiBoutique,
          exportPdf: limites.exportPdf,
          statsAvancees: limites.statsAvancees,
        },
      },
    });
  } catch (error) {
    logger.error('Erreur plan-info', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

router.get('/', auth, ctrl.getAbonnement);
router.post('/souscrire', auth, adminOnly, ctrl.souscrire);
router.post('/renouveler', auth, adminOnly, ctrl.renouveler);
router.post('/annuler', auth, adminOnly, ctrl.annuler);

module.exports = router;

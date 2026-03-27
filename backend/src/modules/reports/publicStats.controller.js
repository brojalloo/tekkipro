// Statistiques publiques pour la landing page (pas d'auth requise)
const prisma = require('../../config/database');
const logger = require('../../common/utils/logger');

const getPublicStats = async (req, res) => {
  try {
    const [boutiques, ventes, produits, users] = await Promise.all([
      prisma.boutique.count(),
      prisma.vente.count(),
      prisma.produit.count(),
      prisma.user.count(),
    ]);

    // Calculer le chiffre d'affaires total
    const caResult = await prisma.vente.aggregate({
      _sum: { montantTotal: true },
      where: { statut: { not: 'ANNULEE' } },
    });
    const chiffreAffaires = caResult._sum.montantTotal || 0;

    res.json({
      success: true,
      data: {
        boutiques,
        ventes,
        produits,
        utilisateurs: users,
        chiffreAffaires,
      },
    });
  } catch (error) {
    logger.error('Erreur stats publiques', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

module.exports = { getPublicStats };

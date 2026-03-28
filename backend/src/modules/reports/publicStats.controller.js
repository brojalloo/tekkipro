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

    res.json({
      success: true,
      data: {
        boutiques,
        ventes,
        produits,
        utilisateurs: users,
      },
    });
  } catch (error) {
    logger.error('Erreur stats publiques', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

module.exports = { getPublicStats };

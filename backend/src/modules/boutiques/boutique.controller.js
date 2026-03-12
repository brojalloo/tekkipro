// Contrôleur Boutique
const prisma = require('../../config/database');
const { badRequest, created, error: sendError, notFound, forbidden } = require('../../common/utils/response');
const logger = require('../../common/utils/logger');

const getInfo = async (req, res) => {
  try {
    const boutique = await prisma.boutique.findUnique({
      where: { id: req.boutiqueId },
      include: { _count: { select: { users: true, produits: true, ventes: true, clients: true } } },
    });
    res.json({ success: true, data: boutique });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

const updateInfo = async (req, res) => {
  try {
    const { nom, adresse, telephone, email, devise, ninea } = req.body;
    const data = {};
    if (nom !== undefined) data.nom = nom;
    if (adresse !== undefined) data.adresse = adresse;
    if (telephone !== undefined) data.telephone = telephone;
    if (email !== undefined) data.email = email;
    if (devise !== undefined) data.devise = devise;
    if (ninea !== undefined) data.ninea = ninea;
    const boutique = await prisma.boutique.update({
      where: { id: req.boutiqueId },
      data,
    });
    res.json({ success: true, message: 'Boutique mise à jour', data: boutique });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ===== MULTI-BOUTIQUE (plan BUSINESS) =====

// Lister toutes les boutiques de l'admin (principale + enfants)
const getMesBoutiques = async (req, res) => {
  try {
    const mainBoutiqueId = req.user.boutique.parentBoutiqueId || req.user.boutiqueId;
    const boutiques = await prisma.boutique.findMany({
      where: {
        OR: [
          { id: mainBoutiqueId },
          { parentBoutiqueId: mainBoutiqueId },
        ],
      },
      include: {
        _count: { select: { users: true, produits: true, ventes: true, clients: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ success: true, data: boutiques });
  } catch (error) {
    logger.error('Erreur getMesBoutiques', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Créer une nouvelle boutique enfant (BUSINESS seulement)
const createBoutique = async (req, res) => {
  try {
    const mainBoutique = req.user.boutique;
    const mainBoutiqueId = mainBoutique.parentBoutiqueId || mainBoutique.id;

    // Vérifier plan BUSINESS
    const parentBoutique = mainBoutique.parentBoutiqueId
      ? await prisma.boutique.findUnique({ where: { id: mainBoutiqueId } })
      : mainBoutique;

    if (parentBoutique.plan !== 'BUSINESS') {
      return res.status(403).json({
        success: false,
        message: 'La fonctionnalité multi-boutiques est réservée au plan Business.',
        upgrade: true,
      });
    }

    const { nom, slug, adresse, telephone, email } = req.body;

    if (!nom || !slug) {
      return res.status(400).json({ success: false, message: 'Le nom et le slug sont requis.' });
    }

    // Vérifier unicité slug
    const existingSlug = await prisma.boutique.findUnique({ where: { slug } });
    if (existingSlug) {
      return res.status(400).json({ success: false, message: 'Ce slug est déjà pris.' });
    }

    // Vérifier unicité email si fourni
    if (email) {
      const existingEmail = await prisma.boutique.findUnique({ where: { email } });
      if (existingEmail) {
        return res.status(400).json({ success: false, message: 'Cet email est déjà utilisé.' });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const newBoutique = await tx.boutique.create({
        data: {
          nom,
          slug,
          adresse: adresse || null,
          telephone: telephone || null,
          email: email || null,
          plan: parentBoutique.plan,
          devise: parentBoutique.devise,
          parentBoutiqueId: mainBoutiqueId,
        },
      });

      // Créer les catégories par défaut
      const cats = ['Alimentation', 'Boissons', 'Cosmétiques', 'Quincaillerie', 'Divers'];
      for (const cat of cats) {
        await tx.categorie.create({ data: { nom: cat, boutiqueId: newBoutique.id } });
      }

      return newBoutique;
    });

    res.status(201).json({
      success: true,
      message: `Boutique "${result.nom}" créée avec succès`,
      data: result,
    });
  } catch (error) {
    logger.error('Erreur createBoutique', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la création' });
  }
};

// Supprimer une boutique enfant
const deleteBoutique = async (req, res) => {
  try {
    const { id } = req.params;
    const boutiqueId = parseInt(id);
    const mainBoutiqueId = req.user.boutique.parentBoutiqueId || req.user.boutiqueId;

    // Empêcher suppression de la boutique principale
    if (boutiqueId === mainBoutiqueId) {
      return res.status(400).json({ success: false, message: 'Impossible de supprimer la boutique principale.' });
    }

    // Vérifier que c'est bien une boutique enfant
    const boutique = await prisma.boutique.findFirst({
      where: { id: boutiqueId, parentBoutiqueId: mainBoutiqueId },
    });

    if (!boutique) {
      return res.status(404).json({ success: false, message: 'Boutique non trouvée.' });
    }

    // Supprimer les données liées dans une transaction
    await prisma.$transaction(async (tx) => {
      // Supprimer les détails de ventes
      await tx.venteDetail.deleteMany({ where: { vente: { boutiqueId } } });
      // Supprimer les remboursements des dettes
      await tx.remboursement.deleteMany({ where: { dette: { vente: { boutiqueId } } } });
      // Supprimer les dettes
      await tx.dette.deleteMany({ where: { vente: { boutiqueId } } });
      // Supprimer les ventes
      await tx.vente.deleteMany({ where: { boutiqueId } });
      // Supprimer les fractions
      await tx.fractionProduit.deleteMany({ where: { produit: { boutiqueId } } });
      // Supprimer les entrées stock
      await tx.entreeStock.deleteMany({ where: { boutiqueId } });
      // Supprimer les produits
      await tx.produit.deleteMany({ where: { boutiqueId } });
      // Supprimer les catégories
      await tx.categorie.deleteMany({ where: { boutiqueId } });
      // Supprimer les clients
      await tx.client.deleteMany({ where: { boutiqueId } });
      // Supprimer les fournisseurs
      await tx.fournisseur.deleteMany({ where: { boutiqueId } });
      // Supprimer les paiements d'abonnement
      await tx.paiementAbonnement.deleteMany({ where: { abonnement: { boutiqueId } } });
      // Supprimer les abonnements
      await tx.abonnement.deleteMany({ where: { boutiqueId } });
      // Supprimer les utilisateurs de cette boutique
      await tx.user.deleteMany({ where: { boutiqueId } });
      // Supprimer la boutique
      await tx.boutique.delete({ where: { id: boutiqueId } });
    });

    res.json({ success: true, message: 'Boutique et toutes ses données supprimées.' });
  } catch (error) {
    logger.error('Erreur deleteBoutique', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la suppression' });
  }
};

module.exports = { getInfo, updateInfo, getMesBoutiques, createBoutique, deleteBoutique };

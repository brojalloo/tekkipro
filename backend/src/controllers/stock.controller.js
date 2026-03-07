// Contrôleur Stock - Système de conversion d'unités
const prisma = require('../config/database');

// Entrée de stock (approvisionnement)
const entreeStock = async (req, res) => {
  try {
    const { produitId, quantite, prixAchat, fournisseurId, uniteVenteId } = req.body;

    const produit = await prisma.produit.findFirst({
      where: { id: parseInt(produitId), boutiqueId: req.boutiqueId },
      include: { unitesVente: true },
    });

    if (!produit) {
      return res.status(404).json({ success: false, message: 'Produit non trouvé' });
    }

    const qtyUser = parseFloat(quantite);
    let quantiteBase, uniteNom;

    if (uniteVenteId) {
      // Entrée dans une unité de vente spécifique
      const unite = produit.unitesVente.find(u => u.id === parseInt(uniteVenteId));
      if (!unite) {
        return res.status(400).json({ success: false, message: 'Unité de vente non trouvée' });
      }
      quantiteBase = qtyUser * unite.facteurConversion;
      uniteNom = unite.nom;
    } else {
      // Entrée en unité de base
      quantiteBase = qtyUser;
      uniteNom = produit.uniteBase;
    }

    const result = await prisma.$transaction(async (tx) => {
      // Mettre à jour le stock du produit (toujours en unité de base)
      const updatedProduit = await tx.produit.update({
        where: { id: parseInt(produitId) },
        data: {
          stock: { increment: quantiteBase },
          prixAchat: prixAchat ? parseFloat(prixAchat) : undefined,
        },
      });

      // Enregistrer l'entrée
      const entree = await tx.entreeStock.create({
        data: {
          quantite: qtyUser,
          quantiteBase,
          prixAchat: parseFloat(prixAchat || produit.prixAchat),
          uniteNom,
          produitId: parseInt(produitId),
          fournisseurId: fournisseurId ? parseInt(fournisseurId) : null,
          boutiqueId: req.boutiqueId,
        },
        include: { produit: { select: { nom: true, stock: true, uniteBase: true } }, fournisseur: { select: { nom: true } } },
      });

      return entree;
    });

    res.status(201).json({
      success: true,
      message: 'Stock mis à jour',
      data: result,
    });
  } catch (error) {
    console.error('Erreur entreeStock:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Historique des entrées de stock
const getHistorique = async (req, res) => {
  try {
    const { produitId, fournisseurId, dateDebut, dateFin } = req.query;

    const where = { boutiqueId: req.boutiqueId };
    if (produitId) where.produitId = parseInt(produitId);
    if (fournisseurId) where.fournisseurId = parseInt(fournisseurId);
    if (dateDebut || dateFin) {
      where.createdAt = {};
      if (dateDebut) where.createdAt.gte = new Date(dateDebut);
      if (dateFin) where.createdAt.lte = new Date(dateFin + 'T23:59:59.999Z');
    }

    const entrees = await prisma.entreeStock.findMany({
      where,
      include: {
        produit: { select: { nom: true, uniteBase: true } },
        fournisseur: { select: { nom: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: entrees });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Inventaire complet
const getInventaire = async (req, res) => {
  try {
    const produits = await prisma.produit.findMany({
      where: { boutiqueId: req.boutiqueId, actif: true },
      select: {
        id: true, nom: true, stock: true, stockAlerte: true, uniteBase: true,
        prixAchat: true, prixVente: true,
        categorie: { select: { nom: true } },
        unitesVente: { orderBy: { estDefaut: 'desc' } },
      },
      orderBy: { nom: 'asc' },
    });

    const inventaire = produits.map(p => {
      // Calculer la valeur du stock : utiliser le prix d'achat de l'unité par défaut si disponible
      const defaultUnit = p.unitesVente.find(u => u.estDefaut);
      const prixAchatBase = defaultUnit && defaultUnit.prixAchat
        ? defaultUnit.prixAchat / defaultUnit.facteurConversion
        : (p.prixAchat || 0);

      return {
        ...p,
        valeurStock: p.stock * prixAchatBase,
        enAlerte: p.stock <= p.stockAlerte,
      };
    });

    const totalValeur = inventaire.reduce((sum, p) => sum + p.valeurStock, 0);

    res.json({
      success: true,
      data: {
        produits: inventaire,
        totalProduits: inventaire.length,
        totalValeurStock: totalValeur,
        produitsEnAlerte: inventaire.filter(p => p.enAlerte).length,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

module.exports = { entreeStock, getHistorique, getInventaire };

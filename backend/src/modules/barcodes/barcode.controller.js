// Module Barcodes — Controller
const prisma = require('../../config/database');
const logger = require('../../common/utils/logger');

// GET /api/barcodes/lookup/:code
// Lookup rapide d'un produit par code-barres
async function lookupByBarcode(req, res) {
  try {
    const { code } = req.params;
    const boutiqueId = req.boutiqueId;

    // 1. Chercher dans la table product_barcodes (nouvelle)
    const entry = await prisma.productBarcode.findFirst({
      where: { barcode: code, boutiqueId },
      include: {
        produit: {
          include: { unitesVente: true },
        },
      },
    });

    if (entry) {
      return res.json({
        success: true,
        source: 'product_barcodes',
        data: {
          produit: entry.produit,
          uniteId: entry.uniteId,
        },
      });
    }

    // 2. Fallback — chercher dans Produit.codeBarre (ancien champ)
    const produit = await prisma.produit.findFirst({
      where: { codeBarre: code, boutiqueId, actif: true },
      include: { unitesVente: true },
    });

    if (produit) {
      return res.json({
        success: true,
        source: 'produit_legacy',
        data: { produit, uniteId: null },
      });
    }

    return res.status(404).json({ success: false, message: 'Produit introuvable pour ce code-barres' });
  } catch (err) {
    logger.error('lookupByBarcode', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
}

// GET /api/barcodes/produit/:produitId
// Lister tous les codes-barres d'un produit
async function getByProduit(req, res) {
  try {
    const produitId = parseInt(req.params.produitId);
    const boutiqueId = req.boutiqueId;

    const barcodes = await prisma.productBarcode.findMany({
      where: { produitId, boutiqueId },
      orderBy: { isPrimary: 'desc' },
    });

    res.json({ success: true, data: barcodes });
  } catch (err) {
    logger.error('getByProduit', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
}

// POST /api/barcodes/produit/:produitId
// Ajouter un code-barres à un produit
async function addBarcode(req, res) {
  try {
    const produitId = parseInt(req.params.produitId);
    const boutiqueId = req.boutiqueId;
    const { barcode, uniteId, isPrimary } = req.body;

    if (!barcode) {
      return res.status(400).json({ success: false, message: 'Le code-barres est requis' });
    }

    // Vérifier unicité dans la boutique
    const existing = await prisma.productBarcode.findFirst({
      where: { barcode, boutiqueId },
    });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Ce code-barres est déjà utilisé dans cette boutique' });
    }

    // Si isPrimary, retirer l'ancien primary de ce produit
    if (isPrimary) {
      await prisma.productBarcode.updateMany({
        where: { produitId, boutiqueId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const created = await prisma.productBarcode.create({
      data: { barcode, produitId, boutiqueId, uniteId: uniteId || null, isPrimary: isPrimary || false },
    });

    res.status(201).json({ success: true, data: created });
  } catch (err) {
    logger.error('addBarcode', err);
    if (err.code === 'P2002') {
      return res.status(409).json({ success: false, message: 'Code-barres déjà utilisé dans cette boutique' });
    }
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
}

// DELETE /api/barcodes/:id
// Supprimer un code-barres
async function removeBarcode(req, res) {
  try {
    const id = parseInt(req.params.id);
    const boutiqueId = req.boutiqueId;

    const existing = await prisma.productBarcode.findFirst({ where: { id, boutiqueId } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Code-barres introuvable' });
    }

    await prisma.productBarcode.delete({ where: { id } });
    res.json({ success: true, message: 'Code-barres supprimé' });
  } catch (err) {
    logger.error('removeBarcode', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
}

module.exports = { lookupByBarcode, getByProduit, addBarcode, removeBarcode };


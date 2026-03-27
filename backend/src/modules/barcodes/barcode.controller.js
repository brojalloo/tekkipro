// Module Barcodes — Controller
const prisma = require('../../config/database');
const logger = require('../../common/utils/logger');
const { badRequest, conflict, created, error: sendError, notFound, success } = require('../../common/utils/response');

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

    return notFound(res, 'Produit introuvable pour ce code-barres', { code: 'BARCODE_NOT_FOUND' });
  } catch (err) {
    logger.error('lookupByBarcode', err);
    return sendError(res, 'Erreur serveur', 500, { code: 'BARCODE_LOOKUP_FAILED' });
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

    return success(res, barcodes);
  } catch (err) {
    logger.error('getByProduit', err);
    return sendError(res, 'Erreur serveur', 500, { code: 'BARCODES_FETCH_FAILED' });
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
      return badRequest(res, 'Le code-barres est requis', { code: 'BARCODE_REQUIRED' });
    }

    // Vérifier unicité dans la boutique
    const existing = await prisma.productBarcode.findFirst({
      where: { barcode, boutiqueId },
    });
    if (existing) {
      return conflict(res, 'Ce code-barres est déjà utilisé dans cette boutique', { code: 'BARCODE_DUPLICATE' });
    }

    // Si isPrimary, retirer l'ancien primary de ce produit
    if (isPrimary) {
      await prisma.productBarcode.updateMany({
        where: { produitId, boutiqueId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const newBarcode = await prisma.productBarcode.create({
      data: { barcode, produitId, boutiqueId, uniteId: uniteId || null, isPrimary: isPrimary || false },
    });

    return created(res, newBarcode, 'Code-barres ajouté');
  } catch (err) {
    logger.error('addBarcode', err);
    if (err.code === 'P2002') {
      return conflict(res, 'Code-barres déjà utilisé dans cette boutique', { code: 'BARCODE_DUPLICATE' });
    }
    return sendError(res, 'Erreur serveur', 500, { code: 'BARCODE_ADD_FAILED' });
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
      return notFound(res, 'Code-barres introuvable', { code: 'BARCODE_NOT_FOUND' });
    }

    await prisma.productBarcode.delete({ where: { id } });
    return success(res, null, 200, 'Code-barres supprimé');
  } catch (err) {
    logger.error('removeBarcode', err);
    return sendError(res, 'Erreur serveur', 500, { code: 'BARCODE_REMOVE_FAILED' });
  }
}

module.exports = { lookupByBarcode, getByProduit, addBarcode, removeBarcode };


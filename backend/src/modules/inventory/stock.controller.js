// Contrôleur Stock - Système de conversion d'unités
const prisma = require('../../config/database');
const { badRequest, created, error: sendError, notFound } = require('../../common/utils/response');
const { getPeremptionStatus, hasPeremptionAlert } = require('../../common/utils/peremption');
const { parsePagination, paginatedResponse } = require('../../common/utils/pagination');
const logger = require('../../common/utils/logger');
const { logAudit } = require('../../common/utils/auditLog');

const hasValue = (value) => value !== undefined && value !== null && value !== '';

const getClosestUnitByPrice = (units = [], targets = [], priceField = 'prix') => {
  const validTargets = targets
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0);

  const pricedUnits = units.filter((u) => {
    const unitPrice = Number(u[priceField]);
    return Number(u.facteurConversion) > 0 && Number.isFinite(unitPrice) && unitPrice > 0;
  });

  if (!validTargets.length || !pricedUnits.length) {
    return null;
  }

  return [...pricedUnits].sort((a, b) => {
    const scoreA = Math.min(...validTargets.map((target) => Math.abs(Number(a[priceField]) - target)));
    const scoreB = Math.min(...validTargets.map((target) => Math.abs(Number(b[priceField]) - target)));

    if (scoreA !== scoreB) return scoreA - scoreB;

    return Number(a.facteurConversion) - Number(b.facteurConversion);
  })[0] || null;
};

const getReferenceUnit = (produit) => {
  const validUnits = (produit.unitesVente || []).filter((u) => Number(u.facteurConversion) > 0);
  const defaultUnit = validUnits.find(u => u.estDefaut);
  if (defaultUnit) return defaultUnit;

  const purchaseUnit = getClosestUnitByPrice(validUnits, [produit.prixAchat, produit.prixVente], 'prixAchat');
  if (purchaseUnit) return purchaseUnit;

  const saleUnit = getClosestUnitByPrice(validUnits, [produit.prixVente, produit.prixAchat], 'prix');
  if (saleUnit) return saleUnit;

  return [...validUnits].sort((a, b) => Number(a.facteurConversion) - Number(b.facteurConversion))[0] || null;
};

const getPrixAchatBaseForInventaire = (produit) => {
  const referenceUnit = getReferenceUnit(produit);

  if (hasValue(referenceUnit?.prixAchat) && referenceUnit.facteurConversion > 0) {
    return referenceUnit.prixAchat / referenceUnit.facteurConversion;
  }

  if (referenceUnit?.facteurConversion > 1) {
    return (produit.prixAchat || 0) / referenceUnit.facteurConversion;
  }

  return produit.prixAchat || 0;
};

// Entrée de stock (approvisionnement)
const entreeStock = async (req, res) => {
  try {
    const { produitId, quantite, prixAchat, fournisseurId, uniteVenteId } = req.body;

    const produit = await prisma.produit.findFirst({
      where: { id: parseInt(produitId), boutiqueId: req.boutiqueId },
      include: { unitesVente: true },
    });

    if (!produit) {
      return notFound(res, 'Produit non trouvé', { code: 'PRODUCT_NOT_FOUND' });
    }

    const qtyUser = parseFloat(quantite);
    let quantiteBase, uniteNom, unite = null;

    if (uniteVenteId) {
      // Entrée dans une unité de vente spécifique
      unite = produit.unitesVente.find(u => u.id === parseInt(uniteVenteId));
      if (!unite) {
        return badRequest(res, 'Unité de vente non trouvée', { code: 'UNIT_NOT_FOUND' });
      }
      quantiteBase = qtyUser * unite.facteurConversion;
      uniteNom = unite.nom;
    } else {
      // Entrée en unité de base
      quantiteBase = qtyUser;
      uniteNom = produit.uniteBase;
    }

    const parsedPrixAchat = hasValue(prixAchat) ? parseFloat(prixAchat) : null;
    const prixAchatBase = parsedPrixAchat !== null
      ? (unite?.facteurConversion ? parsedPrixAchat / unite.facteurConversion : parsedPrixAchat)
      : null;
    const prixAchatEntree = parsedPrixAchat !== null
      ? parsedPrixAchat
      : (unite?.prixAchat ?? (unite?.facteurConversion ? (produit.prixAchat || 0) * unite.facteurConversion : (produit.prixAchat || 0)));

    const result = await prisma.$transaction(async (tx) => {
      // Mettre à jour le stock du produit (toujours en unité de base)
      // On récupère le produit mis à jour pour avoir le stock exact dans la transaction
      const produitMisAJour = await tx.produit.update({
        where: { id: parseInt(produitId) },
        data: {
          stock: { increment: quantiteBase },
          prixAchat: prixAchatBase !== null ? prixAchatBase : undefined,
        },
      });

      // Validation de sécurité : si un fournisseurId est fourni, il doit appartenir à cette boutique
      if (fournisseurId) {
        const fournisseurOwner = await tx.fournisseur.findFirst({
          where: { id: parseInt(fournisseurId), boutiqueId: req.boutiqueId },
        });
        if (!fournisseurOwner) {
          throw new Error('Fournisseur non trouvé ou n\'appartient pas à cette boutique');
        }
      }

      // Enregistrer l'entrée dans l'historique
      const entree = await tx.entreeStock.create({
        data: {
          quantite: qtyUser,
          quantiteBase,
          prixAchat: prixAchatEntree,
          uniteNom,
          produitId: parseInt(produitId),
          fournisseurId: fournisseurId ? parseInt(fournisseurId) : null,
          boutiqueId: req.boutiqueId,
        },
        include: { produit: { select: { nom: true, stock: true, uniteBase: true } }, fournisseur: { select: { nom: true } } },
      });

      // Stock Ledger — mouvement entrant
      await tx.stockMovement.create({
        data: {
          type: 'IN',
          quantiteBase,
          uniteNom,
          facteurConv: unite?.facteurConversion ?? 1,
          coutUnitaire: prixAchatEntree,
          referenceType: 'ENTREE_STOCK',
          referenceId: entree.id,
          produitId: parseInt(produitId),
          boutiqueId: req.boutiqueId,
          userId: req.user?.id ?? null,
        },
      });

      // Mettre à jour StockBalance
      await tx.stockBalance.upsert({
        where: { produitId: parseInt(produitId) },
        update: { stockBase: { increment: quantiteBase }, dernierMouvement: new Date() },
        create: {
          produitId: parseInt(produitId),
          boutiqueId: req.boutiqueId,
          stockBase: produitMisAJour.stock, // valeur exacte post-update dans la transaction
          dernierMouvement: new Date(),
        },
      });

      return entree;
    });

    logAudit(prisma, {
      action: 'STOCK_ADJUST',
      entite: 'stock',
      entiteId: result.produitId,
      message: `Entree stock: +${qtyUser} ${uniteNom} de "${produit.nom}"`,
      userId: req.user?.id,
      boutiqueId: req.boutiqueId,
    });
    return created(res, result, 'Stock mis a jour');
  } catch (error) {
    logger.error('Erreur entreeStock', error);
    return sendError(res, 'Erreur serveur', 500, { code: 'STOCK_ENTRY_FAILED' });
  }
};

// Historique des entrées de stock (avec pagination)
const getHistorique = async (req, res) => {
  try {
    const { produitId, fournisseurId, dateDebut, dateFin } = req.query;
    const { page, limit, skip, take } = parsePagination(req.query);

    const where = { boutiqueId: req.boutiqueId };
    if (produitId) where.produitId = parseInt(produitId);
    if (fournisseurId) where.fournisseurId = parseInt(fournisseurId);
    if (dateDebut || dateFin) {
      where.createdAt = {};
      if (dateDebut) where.createdAt.gte = new Date(dateDebut);
      if (dateFin) where.createdAt.lte = new Date(dateFin + 'T23:59:59.999Z');
    }

    const [entrees, total] = await prisma.$transaction([
      prisma.entreeStock.findMany({
        where,
        include: {
          produit: { select: { nom: true, uniteBase: true } },
          fournisseur: { select: { nom: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.entreeStock.count({ where }),
    ]);

    res.json(paginatedResponse(entrees, total, page, limit));
  } catch (error) {
    logger.error('Erreur getHistorique stock', error);
    return sendError(res, 'Erreur serveur', 500, { code: 'STOCK_HISTORY_FETCH_FAILED' });
  }
};

// Inventaire complet (paginé)
const getInventaire = async (req, res) => {
  try {
    const { page, limit, skip, take } = parsePagination(req.query);
    const where = { boutiqueId: req.boutiqueId, actif: true };

    const [produits, total] = await prisma.$transaction([
      prisma.produit.findMany({
        where,
        select: {
          id: true, nom: true, stock: true, stockAlerte: true, uniteBase: true,
          prixAchat: true, prixVente: true, codeBarre: true, datePeremption: true, alertePeremptionJours: true,
          categorie: { select: { nom: true } },
          unitesVente: { orderBy: { estDefaut: 'desc' } },
          _count: { select: { venteDetails: true } },
        },
        orderBy: { nom: 'asc' },
        skip,
        take,
      }),
      prisma.produit.count({ where }),
    ]);

    const inventaire = produits.map(p => {
      const prixAchatBase = getPrixAchatBaseForInventaire(p);
      const peremption = getPeremptionStatus(p);
      const enAlerteStock = p.stock <= p.stockAlerte;

      return {
        ...p,
        ...peremption,
        valeurStock: p.stock * prixAchatBase,
        enAlerteStock,
        enAlerte: enAlerteStock || hasPeremptionAlert(p),
        utiliseDansVentes: p._count.venteDetails > 0,
        nombreVentes: p._count.venteDetails,
        peutSupprimer: p._count.venteDetails === 0,
      };
    });

    // Valeur totale du stock sur toutes les pages
    const allStockValues = await prisma.produit.findMany({
      where,
      select: { stock: true, prixAchat: true },
    });
    const totalValeurStock = allStockValues.reduce((sum, p) => sum + p.stock * p.prixAchat, 0);
    const produitsEnAlerte = inventaire.filter(p => p.enAlerte).length;

    res.json({
      success: true,
      data: {
        produits: inventaire,
        totalProduits: total,
        totalValeurStock,
        produitsEnAlerte,
      },
      pagination: {
        page, limit, total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    logger.error('Erreur getInventaire', error);
    return sendError(res, 'Erreur serveur', 500, { code: 'INVENTORY_FETCH_FAILED' });
  }
};

module.exports = { entreeStock, getHistorique, getInventaire };

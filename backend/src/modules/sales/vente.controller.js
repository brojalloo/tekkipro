// Contrôleur Ventes - Système de conversion d'unités
class BusinessError extends Error {}

const prisma = require('../../config/database');
const { badRequest, created, error: sendError, notFound } = require('../../common/utils/response');
const { parsePagination, paginatedResponse } = require('../../common/utils/pagination');
const logger = require('../../common/utils/logger');

// Générer un numéro de vente unique
const generateNumeroVente = () => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = require('crypto').randomBytes(4).toString('hex').toUpperCase();
  return `VNT-${dateStr}-${rand}`;
};

// Créer une vente
const create = async (req, res) => {
  try {
    const { details, clientId, modePaiement, montantPaye } = req.body;

    // details = [{ produitId, quantite, uniteVenteId? }, ...]
    // If uniteVenteId is provided: sell in that unit (quantite × facteurConversion = base qty)
    // If no uniteVenteId: sell in base unit directly (quantite = base qty)

    if (!details || details.length === 0) {
      return badRequest(res, 'Aucun produit dans la vente', { code: 'SALE_DETAILS_REQUIRED' });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Vérifier l'ownership du client en premier, avant toute écriture en base
      if (clientId) {
        const clientOwner = await tx.client.findFirst({
          where: { id: parseInt(clientId), boutiqueId: req.boutiqueId },
        });
        if (!clientOwner) {
          throw new BusinessError('Client non trouvé ou n\'appartient pas à cette boutique');
        }
      }

      let montantTotal = 0;
      const venteDetails = [];
      // Accumuler les données de mouvement pour écriture après création de la vente
      const mouvementsData = [];

      for (const item of details) {
        const produit = await tx.produit.findFirst({
          where: { id: parseInt(item.produitId), boutiqueId: req.boutiqueId },
          include: { unitesVente: true },
        });

        if (!produit) {
          throw new BusinessError(`Produit #${item.produitId} non trouvé`);
        }

        let quantiteBase, prixUnitaire, uniteNom, facteurConv = 1;
        const quantiteUser = parseFloat(item.quantite || 1);

        if (item.uniteVenteId) {
          const unite = produit.unitesVente.find(u => u.id === parseInt(item.uniteVenteId));
          if (!unite) throw new BusinessError(`Unité de vente non trouvée pour ${produit.nom}`);
          quantiteBase = quantiteUser * unite.facteurConversion;
          prixUnitaire = unite.prix;
          uniteNom = unite.nom;
          facteurConv = unite.facteurConversion;
        } else {
          quantiteBase = quantiteUser;
          prixUnitaire = produit.prixVente;
          uniteNom = produit.uniteBase;
        }

        if (produit.stock < quantiteBase) {
          const stockInfo = item.uniteVenteId && uniteNom
            ? `Stock: ${produit.stock} ${produit.uniteBase} (≈ ${Math.floor(produit.stock / (quantiteBase / quantiteUser))} ${uniteNom})`
            : `Stock: ${produit.stock} ${produit.uniteBase}`;
          throw new BusinessError(`Stock insuffisant pour ${produit.nom}. ${stockInfo}`);
        }

        const sousTotal = prixUnitaire * quantiteUser;
        montantTotal += sousTotal;

        await tx.produit.update({
          where: { id: produit.id },
          data: { stock: { decrement: quantiteBase } },
        });

        // Mettre à jour StockBalance
        await tx.stockBalance.upsert({
          where: { produitId: produit.id },
          update: { stockBase: { decrement: quantiteBase }, dernierMouvement: new Date() },
          create: {
            produitId: produit.id,
            boutiqueId: req.boutiqueId,
            stockBase: Math.max(0, produit.stock - quantiteBase),
            dernierMouvement: new Date(),
          },
        });

        venteDetails.push({ produitId: produit.id, quantite: quantiteUser, quantiteBase, prixUnitaire, sousTotal, uniteNom });
        mouvementsData.push({ produitId: produit.id, quantiteBase, uniteNom, facteurConv, coutUnitaire: prixUnitaire });
      }

      const paiementMode = modePaiement || 'CASH';
      const payeRaw = (montantPaye !== undefined && montantPaye !== null && montantPaye !== '')
        ? parseFloat(montantPaye)
        : (paiementMode === 'CREDIT' ? 0 : montantTotal);
      const paye = Math.min(payeRaw, montantTotal);
      let statut = 'COMPLETEE';

      if (paiementMode === 'CREDIT' || paye < montantTotal) {
        statut = 'EN_CREDIT';
        if (!clientId) throw new BusinessError('Un client est requis pour une vente à crédit');
      }

      const vente = await tx.vente.create({
        data: {
          numero: generateNumeroVente(),
          montantTotal,
          montantPaye: paye,
          modePaiement: paiementMode,
          statut,
          clientId: clientId ? parseInt(clientId) : null,
          userId: req.user.id,
          boutiqueId: req.boutiqueId,
          details: { create: venteDetails },
        },
        include: {
          details: { include: { produit: { select: { nom: true, uniteBase: true } } } },
          client: true,
          user: { select: { nom: true, prenom: true } },
        },
      });

      if (statut === 'EN_CREDIT') {
        await tx.dette.create({
          data: {
            montantTotal,
            montantPaye: paye,
            montantRestant: montantTotal - paye,
            clientId: parseInt(clientId),
            venteId: vente.id,
          },
        });
      }

      // Écrire les mouvements de stock (Stock Ledger)
      await tx.stockMovement.createMany({
        data: mouvementsData.map(m => ({
          type: 'SALE',
          quantiteBase: m.quantiteBase,
          uniteNom: m.uniteNom,
          facteurConv: m.facteurConv,
          coutUnitaire: m.coutUnitaire,
          referenceType: 'VENTE',
          referenceId: vente.id,
          produitId: m.produitId,
          boutiqueId: req.boutiqueId,
          userId: req.user.id,
        })),
      });

      return vente;
    });

    return created(res, result, 'Vente enregistrée');
  } catch (error) {
    if (error instanceof BusinessError) {
      return badRequest(res, error.message, { code: 'SALE_CREATE_FAILED' });
    }
    logger.error('Erreur create vente', error);
    return sendError(res, 'Erreur lors de la création de la vente', 500, { code: 'SALE_CREATE_FAILED' });
  }
};

// Lister les ventes (avec pagination)
const getAll = async (req, res) => {
  try {
    const { dateDebut, dateFin, statut, userId } = req.query;
    const { page, limit, skip, take } = parsePagination(req.query);

    const where = { boutiqueId: req.boutiqueId };

    if (dateDebut || dateFin) {
      where.createdAt = {};
      if (dateDebut) where.createdAt.gte = new Date(dateDebut);
      if (dateFin) where.createdAt.lte = new Date(dateFin + 'T23:59:59.999Z');
    }
    if (statut) where.statut = statut;
    if (userId) where.userId = parseInt(userId);

    const [ventes, total] = await prisma.$transaction([
      prisma.vente.findMany({
        where,
        include: {
          details: { include: { produit: { select: { nom: true, uniteBase: true } } } },
          client: { select: { nom: true, prenom: true } },
          user: { select: { nom: true, prenom: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.vente.count({ where }),
    ]);

    res.json(paginatedResponse(ventes, total, page, limit));
  } catch (error) {
    logger.error('Erreur getAll ventes', error);
    return sendError(res, 'Erreur serveur', 500, { code: 'SALES_FETCH_FAILED' });
  }
};

// Obtenir une vente par ID
const getById = async (req, res) => {
  try {
    const vente = await prisma.vente.findFirst({
      where: { id: parseInt(req.params.id), boutiqueId: req.boutiqueId },
      include: {
        details: { include: { produit: true } },
        client: true,
        user: { select: { nom: true, prenom: true } },
        dette: { include: { remboursements: true } },
      },
    });

    if (!vente) {
      return notFound(res, 'Vente non trouvée', { code: 'SALE_NOT_FOUND' });
    }

    res.json({ success: true, data: vente });
  } catch (error) {
    return sendError(res, 'Erreur serveur', 500, { code: 'SALE_FETCH_FAILED' });
  }
};

// Annuler une vente (remettre le stock en unité de base)
const annuler = async (req, res) => {
  try {
    const { id } = req.params;

    const vente = await prisma.vente.findFirst({
      where: { id: parseInt(id), boutiqueId: req.boutiqueId },
      include: { details: true },
    });

    if (!vente) {
      return notFound(res, 'Vente non trouvée', { code: 'SALE_NOT_FOUND' });
    }

    if (vente.statut === 'ANNULEE') {
      return badRequest(res, 'Vente déjà annulée', { code: 'SALE_ALREADY_CANCELLED' });
    }

    await prisma.$transaction(async (tx) => {
      // Remettre le stock + écrire StockMovement RETURN
      for (const detail of vente.details) {
        const qtyToRestore = detail.quantiteBase || detail.quantite;

        await tx.produit.update({
          where: { id: detail.produitId },
          data: { stock: { increment: qtyToRestore } },
        });

        // Mettre à jour StockBalance
        await tx.stockBalance.upsert({
          where: { produitId: detail.produitId },
          update: { stockBase: { increment: qtyToRestore }, dernierMouvement: new Date() },
          create: {
            produitId: detail.produitId,
            boutiqueId: req.boutiqueId,
            stockBase: qtyToRestore,
            dernierMouvement: new Date(),
          },
        });

        // Écrire le mouvement de retour (Stock Ledger)
        await tx.stockMovement.create({
          data: {
            type: 'RETURN',
            quantiteBase: qtyToRestore,
            uniteNom: detail.uniteNom,
            coutUnitaire: detail.prixUnitaire || 0,
            referenceType: 'VENTE',
            referenceId: vente.id,
            note: 'Annulation de vente',
            produitId: detail.produitId,
            boutiqueId: req.boutiqueId,
            userId: req.user.id,
          },
        });
      }

      await tx.vente.update({
        where: { id: parseInt(id) },
        data: { statut: 'ANNULEE' },
      });

      const dettes = await tx.dette.findMany({
        where: { venteId: parseInt(id) },
        select: { id: true },
      });

      if (dettes.length > 0) {
        const detteIds = dettes.map(d => d.id);
        await tx.remboursement.deleteMany({ where: { detteId: { in: detteIds } } });
        await tx.dette.deleteMany({ where: { id: { in: detteIds } } });
      }
    });

    res.json({ success: true, message: 'Vente annulée, stock restauré' });
  } catch (error) {
    logger.error('Erreur annuler vente', error);
    return sendError(res, 'Erreur serveur', 500, { code: 'SALE_CANCEL_FAILED' });
  }
};

module.exports = { create, getAll, getById, annuler };

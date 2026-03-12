// Contrôleur Dettes (Crédit client)
const prisma = require('../../config/database');
const { badRequest, error: sendError, notFound } = require('../../common/utils/response');
const { parsePagination, paginatedResponse } = require('../../common/utils/pagination');
const logger = require('../../common/utils/logger');

// Lister toutes les dettes de la boutique (avec pagination)
const getAll = async (req, res) => {
  try {
    const { statut, clientId } = req.query;
    const { page, limit, skip, take } = parsePagination(req.query);

    const where = { vente: { boutiqueId: req.boutiqueId } };
    if (statut) where.statut = statut;
    if (clientId) where.clientId = parseInt(clientId);

    const [dettes, total] = await prisma.$transaction([
      prisma.dette.findMany({
        where,
        include: {
          client: { select: { id: true, nom: true, prenom: true, telephone: true } },
          vente: {
            select: {
              numero: true,
              montantTotal: true,
              montantPaye: true,
              createdAt: true,
              details: { include: { produit: { select: { nom: true } } } },
            },
          },
          remboursements: { orderBy: { createdAt: 'desc' } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.dette.count({ where }),
    ]);

    // Agrégats sur la page courante (EN_COURS seulement, filtrés sur toute la boutique)
    const aggResult = await prisma.dette.aggregate({
      where: { vente: { boutiqueId: req.boutiqueId }, statut: 'EN_COURS' },
      _sum: { montantRestant: true },
      _count: { _all: true },
    });

    res.json({
      ...paginatedResponse(dettes, total, page, limit),
      totalDettes: aggResult._sum.montantRestant ?? 0,
      nombreEnCours: aggResult._count._all,
    });
  } catch (error) {
    logger.error('Erreur getAll dettes', error);
    return sendError(res, 'Erreur serveur', 500, { code: 'DEBTS_FETCH_FAILED' });
  }
};

// Rembourser une dette (partiel ou total)
const rembourser = async (req, res) => {
  try {
    const { id } = req.params;
    const { montant } = req.body;

    const dette = await prisma.dette.findFirst({
      where: { id: parseInt(id), vente: { boutiqueId: req.boutiqueId } },
      include: { vente: true, client: true },
    });

    if (!dette) {
      return notFound(res, 'Dette non trouvée', { code: 'DEBT_NOT_FOUND' });
    }

    if (dette.statut === 'PAYEE') {
      return badRequest(res, 'Cette dette est déjà payée', { code: 'DEBT_ALREADY_PAID' });
    }

    const montantRemboursement = parseFloat(montant);
    if (!Number.isFinite(montantRemboursement) || montantRemboursement <= 0 || montantRemboursement > dette.montantRestant) {
      return badRequest(res, `Montant invalide. Restant: ${dette.montantRestant} FCFA`, { code: 'DEBT_INVALID_AMOUNT' });
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.remboursement.create({
        data: { montant: montantRemboursement, detteId: parseInt(id) },
      });

      const newMontantPaye    = dette.montantPaye + montantRemboursement;
      const newMontantRestant = dette.montantRestant - montantRemboursement;
      const newStatut         = newMontantRestant <= 0 ? 'PAYEE' : 'EN_COURS';

      const updatedDette = await tx.dette.update({
        where: { id: parseInt(id) },
        data: {
          montantPaye: newMontantPaye,
          montantRestant: Math.max(0, newMontantRestant),
          statut: newStatut,
        },
        include: { client: true, remboursements: true },
      });

      await tx.vente.update({
        where: { id: dette.venteId },
        data: {
          montantPaye: { increment: montantRemboursement },
          statut: newStatut === 'PAYEE' ? 'COMPLETEE' : 'EN_CREDIT',
        },
      });

      return updatedDette;
    });

    res.json({
      success: true,
      message: result.statut === 'PAYEE' ? 'Dette entièrement remboursée' : 'Remboursement enregistré',
      data: result,
    });
  } catch (error) {
    logger.error('Erreur rembourser dette', error);
    return sendError(res, 'Erreur serveur', 500, { code: 'DEBT_REPAY_FAILED' });
  }
};

module.exports = { getAll, rembourser };

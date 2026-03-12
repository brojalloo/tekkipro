// Contrôleur Fournisseurs
const prisma = require('../../config/database');
const { badRequest, created, error: sendError, notFound } = require('../../common/utils/response');
const { parsePagination, paginatedResponse } = require('../../common/utils/pagination');
const logger = require('../../common/utils/logger');

const getAll = async (req, res) => {
  try {
    const { search } = req.query;
    const { page, limit, skip, take } = parsePagination(req.query);

    const where = { boutiqueId: req.boutiqueId };

    if (search) {
      where.OR = [
        { nom: { contains: search, mode: 'insensitive' } },
        { telephone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [fournisseurs, total] = await prisma.$transaction([
      prisma.fournisseur.findMany({
        where,
        include: { _count: { select: { produits: true, entreeStocks: true } } },
        orderBy: { nom: 'asc' },
        skip,
        take,
      }),
      prisma.fournisseur.count({ where }),
    ]);

    res.json(paginatedResponse(fournisseurs, total, page, limit));
  } catch (error) {
    logger.error('Erreur getAll fournisseurs', error);
    return sendError(res, 'Erreur serveur', 500, { code: 'SUPPLIERS_FETCH_FAILED' });
  }
};

const getById = async (req, res) => {
  try {
    const fournisseur = await prisma.fournisseur.findFirst({
      where: { id: parseInt(req.params.id), boutiqueId: req.boutiqueId },
      include: {
        produits: { select: { id: true, nom: true, prixAchat: true, stock: true, uniteBase: true } },
        entreeStocks: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: { produit: { select: { nom: true } } },
        },
      },
    });

    if (!fournisseur) {
      return notFound(res, 'Fournisseur non trouvé', { code: 'SUPPLIER_NOT_FOUND' });
    }

    res.json({ success: true, data: fournisseur });
  } catch (error) {
    logger.error('Erreur getById fournisseur', error);
    return sendError(res, 'Erreur serveur', 500, { code: 'SUPPLIER_FETCH_FAILED' });
  }
};

const create = async (req, res) => {
  try {
    const { nom, telephone, adresse, email } = req.body;

    if (!nom || nom.trim() === '') {
      return badRequest(res, 'Le nom du fournisseur est obligatoire', { code: 'SUPPLIER_NAME_REQUIRED' });
    }

    const fournisseur = await prisma.fournisseur.create({
      data: {
        nom: nom.trim(),
        telephone: telephone?.trim() || null,
        adresse: adresse?.trim() || null,
        email: email?.trim() || null,
        boutiqueId: req.boutiqueId,
      },
    });

    return created(res, fournisseur, 'Fournisseur ajouté');
  } catch (error) {
    logger.error('Erreur create fournisseur', error);
    return sendError(res, error.message || 'Erreur serveur', 500, { code: 'SUPPLIER_CREATE_FAILED' });
  }
};

const update = async (req, res) => {
  try {
    const existing = await prisma.fournisseur.findFirst({
      where: { id: parseInt(req.params.id), boutiqueId: req.boutiqueId },
    });

    if (!existing) {
      return notFound(res, 'Fournisseur non trouvé', { code: 'SUPPLIER_NOT_FOUND' });
    }

    const { nom, telephone, adresse, email } = req.body;

    const fournisseur = await prisma.fournisseur.update({
      where: { id: parseInt(req.params.id) },
      data: { nom, telephone, adresse, email },
    });

    res.json({ success: true, message: 'Fournisseur mis à jour', data: fournisseur });
  } catch (error) {
    logger.error('Erreur update fournisseur', error);
    return sendError(res, error.message || 'Erreur serveur', 500, { code: 'SUPPLIER_UPDATE_FAILED' });
  }
};

const remove = async (req, res) => {
  try {
    const existing = await prisma.fournisseur.findFirst({
      where: { id: parseInt(req.params.id), boutiqueId: req.boutiqueId },
    });

    if (!existing) {
      return notFound(res, 'Fournisseur non trouvé', { code: 'SUPPLIER_NOT_FOUND' });
    }

    await prisma.fournisseur.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true, message: 'Fournisseur supprimé' });
  } catch (error) {
    logger.error('Erreur remove fournisseur', error);
    const msg = error.code === 'P2003'
      ? 'Impossible: ce fournisseur a des produits ou entrées de stock associés'
      : (error.message || 'Erreur serveur');
    return sendError(res, msg, 500, { code: 'SUPPLIER_REMOVE_FAILED' });
  }
};

module.exports = { getAll, getById, create, update, remove };

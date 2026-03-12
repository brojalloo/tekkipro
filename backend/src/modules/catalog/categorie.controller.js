// Contrôleur Catégories
const prisma = require('../../config/database');
const { badRequest, created, conflict, error: sendError, notFound } = require('../../common/utils/response');
const logger = require('../../common/utils/logger');

// Catégories = liste courte (max ~50 par boutique), pas besoin de pagination
const getAll = async (req, res) => {
  try {
    const categories = await prisma.categorie.findMany({
      where: { boutiqueId: req.boutiqueId },
      include: { _count: { select: { produits: true } } },
      orderBy: { nom: 'asc' },
    });
    res.json({ success: true, data: categories });
  } catch (error) {
    logger.error('Erreur getAll categories', error);
    return sendError(res, 'Erreur serveur', 500, { code: 'CATEGORIES_FETCH_FAILED' });
  }
};

const create = async (req, res) => {
  try {
    const { nom } = req.body;
    const categorie = await prisma.categorie.create({
      data: { nom, boutiqueId: req.boutiqueId },
    });
    return created(res, categorie, 'Catégorie créée');
  } catch (error) {
    if (error.code === 'P2002') {
      return conflict(res, 'Cette catégorie existe déjà', { code: 'CATEGORY_DUPLICATE' });
    }
    logger.error('Erreur create categorie', error);
    return sendError(res, 'Erreur serveur', 500, { code: 'CATEGORY_CREATE_FAILED' });
  }
};

const update = async (req, res) => {
  try {
    const existing = await prisma.categorie.findFirst({
      where: { id: parseInt(req.params.id), boutiqueId: req.boutiqueId },
    });

    if (!existing) {
      return notFound(res, 'Catégorie non trouvée', { code: 'CATEGORY_NOT_FOUND' });
    }

    const { nom } = req.body;
    const categorie = await prisma.categorie.update({
      where: { id: parseInt(req.params.id) },
      data: { nom },
    });
    res.json({ success: true, message: 'Catégorie mise à jour', data: categorie });
  } catch (error) {
    if (error.code === 'P2002') {
      return conflict(res, 'Ce nom de catégorie est déjà utilisé', { code: 'CATEGORY_DUPLICATE' });
    }
    logger.error('Erreur update categorie', error);
    return sendError(res, 'Erreur serveur', 500, { code: 'CATEGORY_UPDATE_FAILED' });
  }
};

const remove = async (req, res) => {
  try {
    const existing = await prisma.categorie.findFirst({
      where: { id: parseInt(req.params.id), boutiqueId: req.boutiqueId },
    });

    if (!existing) {
      return notFound(res, 'Catégorie non trouvée', { code: 'CATEGORY_NOT_FOUND' });
    }

    await prisma.categorie.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true, message: 'Catégorie supprimée' });
  } catch (error) {
    if (error.code === 'P2003') {
      return badRequest(res, 'Impossible: des produits utilisent cette catégorie', { code: 'CATEGORY_IN_USE' });
    }
    logger.error('Erreur remove categorie', error);
    return sendError(res, 'Erreur serveur', 500, { code: 'CATEGORY_REMOVE_FAILED' });
  }
};

module.exports = { getAll, create, update, remove };

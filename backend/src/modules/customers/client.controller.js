// Contrôleur Clients
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
        { prenom: { contains: search, mode: 'insensitive' } },
        { telephone: { contains: search } },
      ];
    }

    const [clients, total] = await prisma.$transaction([
      prisma.client.findMany({
        where,
        include: {
          dettes: { where: { statut: 'EN_COURS' }, select: { montantRestant: true } },
          _count: { select: { ventes: true } },
        },
        orderBy: { nom: 'asc' },
        skip,
        take,
      }),
      prisma.client.count({ where }),
    ]);

    const data = clients.map(c => ({
      ...c,
      totalDettes: c.dettes.reduce((sum, d) => sum + d.montantRestant, 0),
      nombreVentes: c._count.ventes,
    }));

    res.json(paginatedResponse(data, total, page, limit));
  } catch (error) {
    logger.error('Erreur getAll clients', error);
    return sendError(res, 'Erreur serveur', 500, { code: 'CLIENTS_FETCH_FAILED' });
  }
};

const getById = async (req, res) => {
  try {
    const client = await prisma.client.findFirst({
      where: { id: parseInt(req.params.id), boutiqueId: req.boutiqueId },
      include: {
        dettes: { include: { remboursements: true, vente: true } },
        ventes: {
          include: { details: { include: { produit: { select: { nom: true } } } } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!client) {
      return notFound(res, 'Client non trouvé', { code: 'CLIENT_NOT_FOUND' });
    }

    res.json({ success: true, data: client });
  } catch (error) {
    logger.error('Erreur getById client', error);
    return sendError(res, 'Erreur serveur', 500, { code: 'CLIENT_FETCH_FAILED' });
  }
};

const create = async (req, res) => {
  try {
    const { nom, prenom, telephone, adresse } = req.body;

    if (!nom || nom.trim() === '') {
      return badRequest(res, 'Le nom du client est obligatoire', { code: 'CLIENT_NAME_REQUIRED' });
    }

    const client = await prisma.client.create({
      data: {
        nom: nom.trim(),
        prenom: prenom?.trim() || null,
        telephone: telephone?.trim() || null,
        adresse: adresse?.trim() || null,
        boutiqueId: req.boutiqueId,
      },
    });

    return created(res, client, 'Client ajouté');
  } catch (error) {
    logger.error('Erreur create client', error);
    return sendError(res, error.message || 'Erreur lors de la création du client', 500, { code: 'CLIENT_CREATE_FAILED' });
  }
};

const update = async (req, res) => {
  try {
    const existing = await prisma.client.findFirst({
      where: { id: parseInt(req.params.id), boutiqueId: req.boutiqueId },
    });

    if (!existing) {
      return notFound(res, 'Client non trouvé', { code: 'CLIENT_NOT_FOUND' });
    }

    const { nom, prenom, telephone, adresse } = req.body;

    if (!nom || nom.trim() === '') {
      return badRequest(res, 'Le nom du client est obligatoire', { code: 'CLIENT_NAME_REQUIRED' });
    }

    const client = await prisma.client.update({
      where: { id: parseInt(req.params.id) },
      data: {
        nom: nom.trim(),
        prenom: prenom?.trim() || null,
        telephone: telephone?.trim() || null,
        adresse: adresse?.trim() || null,
      },
    });

    res.json({ success: true, message: 'Client mis à jour', data: client });
  } catch (error) {
    logger.error('Erreur update client', error);
    return sendError(res, error.message || 'Erreur lors de la mise à jour', 500, { code: 'CLIENT_UPDATE_FAILED' });
  }
};

const remove = async (req, res) => {
  try {
    const existing = await prisma.client.findFirst({
      where: { id: parseInt(req.params.id), boutiqueId: req.boutiqueId },
    });

    if (!existing) {
      return notFound(res, 'Client non trouvé', { code: 'CLIENT_NOT_FOUND' });
    }

    await prisma.client.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true, message: 'Client supprimé' });
  } catch (error) {
    logger.error('Erreur remove client', error);
    const msg = error.code === 'P2003'
      ? 'Impossible: le client a des ventes ou dettes associées'
      : (error.message || 'Erreur serveur');
    return sendError(res, msg, 500, { code: 'CLIENT_REMOVE_FAILED' });
  }
};

module.exports = { getAll, getById, create, update, remove };

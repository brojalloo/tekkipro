// Contrôleur Super-Admin
const prisma = require('../../config/database');
const { success, notFound, error: sendError, badRequest } = require('../../common/utils/response');
const { parsePagination, paginatedResponse } = require('../../common/utils/pagination');
const { logAudit } = require('../../common/utils/auditLog');
const logger = require('../../common/utils/logger');

// Inclure les données de base de chaque boutique
const BOUTIQUE_INCLUDE = {
  _count: { select: { users: true, ventes: true } },
  abonnements: {
    where: { statut: 'ACTIF' },
    orderBy: { createdAt: 'desc' },
    take: 1,
    select: { id: true, plan: true, dateDebut: true, dateFin: true, montant: true, statut: true },
  },
};

// GET /api/superadmin/boutiques
const getBoutiques = async (req, res) => {
  try {
    const { page, limit, skip, take } = parsePagination(req.query);
    const { plan, statut, q } = req.query;

    const where = { deletedAt: null };
    if (plan) where.plan = plan;
    if (statut) where.statut = statut;
    if (q) where.nom = { contains: q, mode: 'insensitive' };

    const [boutiques, total] = await prisma.$transaction([
      prisma.boutique.findMany({ where, include: BOUTIQUE_INCLUDE, orderBy: { createdAt: 'desc' }, skip, take }),
      prisma.boutique.count({ where }),
    ]);

    const data = boutiques.map(b => ({
      id: b.id,
      nom: b.nom,
      email: b.email,
      plan: b.plan,
      statut: b.statut,
      createdAt: b.createdAt,
      nbUsers: b._count.users,
      nbVentes: b._count.ventes,
      abonnementActif: b.abonnements[0] || null,
    }));

    res.json(paginatedResponse(data, total, page, limit));
  } catch (err) {
    logger.error('Erreur getBoutiques superadmin', err);
    return sendError(res, 'Erreur serveur', 500, { code: 'SUPERADMIN_FETCH_FAILED' });
  }
};

// GET /api/superadmin/boutiques/:id
const getBoutique = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const boutique = await prisma.boutique.findFirst({
      where: { id, deletedAt: null },
      include: {
        ...BOUTIQUE_INCLUDE,
        abonnements: {
          orderBy: { createdAt: 'desc' },
          select: { id: true, plan: true, dateDebut: true, dateFin: true, montant: true, statut: true, createdAt: true },
        },
      },
    });

    if (!boutique) return notFound(res, 'Boutique introuvable');

    return success(res, {
      id: boutique.id,
      nom: boutique.nom,
      email: boutique.email,
      telephone: boutique.telephone,
      slug: boutique.slug,
      plan: boutique.plan,
      statut: boutique.statut,
      createdAt: boutique.createdAt,
      nbUsers: boutique._count.users,
      nbVentes: boutique._count.ventes,
      abonnements: boutique.abonnements,
    });
  } catch (err) {
    logger.error('Erreur getBoutique superadmin', err);
    return sendError(res, 'Erreur serveur', 500, { code: 'SUPERADMIN_FETCH_FAILED' });
  }
};

// POST /api/superadmin/boutiques/:id/plan
const changePlan = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { plan, dateFin, montant } = req.body;

    if (!plan || !['GRATUIT', 'PRO', 'BUSINESS'].includes(plan)) {
      return badRequest(res, 'Plan invalide');
    }

    const boutique = await prisma.boutique.findFirst({ where: { id, deletedAt: null } });
    if (!boutique) return notFound(res, 'Boutique introuvable');

    const ancienPlan = boutique.plan;

    await prisma.$transaction(async (tx) => {
      // Expirer l'abonnement actif existant
      await tx.abonnement.updateMany({
        where: { boutiqueId: id, statut: 'ACTIF' },
        data: { statut: 'EXPIRE' },
      });

      // Créer le nouvel abonnement (sauf GRATUIT)
      if (plan !== 'GRATUIT') {
        if (!dateFin) throw new Error('dateFin requis pour plan payant');
        await tx.abonnement.create({
          data: {
            boutiqueId: id,
            plan,
            statut: 'ACTIF',
            dateDebut: new Date(),
            dateFin: new Date(dateFin),
            montant: montant || 0,
          },
        });
      }

      // Mettre à jour le plan de la boutique
      await tx.boutique.update({ where: { id }, data: { plan } });
    });

    logAudit(prisma, {
      action: 'UPDATE',
      entite: 'boutique',
      entiteId: id,
      message: `Plan changé: ${ancienPlan} → ${plan} (par superadmin id:${req.user.id})`,
      userId: req.user.id,
      boutiqueId: id,
    });

    return success(res, null, 200, 'Plan mis à jour');
  } catch (err) {
    logger.error('Erreur changePlan superadmin', err);
    if (err.message === 'dateFin requis pour plan payant') return badRequest(res, err.message);
    return sendError(res, 'Erreur serveur', 500, { code: 'SUPERADMIN_PLAN_FAILED' });
  }
};

// PATCH /api/superadmin/boutiques/:id/statut
const toggleStatut = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const boutique = await prisma.boutique.findFirst({ where: { id, deletedAt: null } });
    if (!boutique) return notFound(res, 'Boutique introuvable');

    const nouveauStatut = boutique.statut === 'ACTIVE' ? 'SUSPENDUE' : 'ACTIVE';
    await prisma.boutique.update({ where: { id }, data: { statut: nouveauStatut } });

    logAudit(prisma, {
      action: 'UPDATE',
      entite: 'boutique',
      entiteId: id,
      message: `Boutique ${nouveauStatut === 'SUSPENDUE' ? 'suspendue' : 'réactivée'} (par superadmin id:${req.user.id})`,
      userId: req.user.id,
      boutiqueId: id,
    });

    return success(res, { statut: nouveauStatut }, 200, `Boutique ${nouveauStatut === 'SUSPENDUE' ? 'suspendue' : 'réactivée'}`);
  } catch (err) {
    logger.error('Erreur toggleStatut superadmin', err);
    return sendError(res, 'Erreur serveur', 500, { code: 'SUPERADMIN_STATUT_FAILED' });
  }
};

// DELETE /api/superadmin/boutiques/:id
const softDelete = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const boutique = await prisma.boutique.findFirst({ where: { id, deletedAt: null } });
    if (!boutique) return notFound(res, 'Boutique introuvable ou déjà supprimée');

    await prisma.boutique.update({ where: { id }, data: { deletedAt: new Date() } });

    logAudit(prisma, {
      action: 'DELETE',
      entite: 'boutique',
      entiteId: id,
      message: `Boutique supprimée (soft delete) par superadmin id:${req.user.id}`,
      userId: req.user.id,
      boutiqueId: id,
    });

    return success(res, null, 200, 'Boutique supprimée');
  } catch (err) {
    logger.error('Erreur softDelete superadmin', err);
    return sendError(res, 'Erreur serveur', 500, { code: 'SUPERADMIN_DELETE_FAILED' });
  }
};

module.exports = { getBoutiques, getBoutique, changePlan, toggleStatut, softDelete };

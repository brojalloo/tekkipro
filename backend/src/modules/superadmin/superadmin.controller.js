// Contrôleur Super-Admin
const prisma = require('../../config/database');
const bcrypt = require('bcryptjs');
const { success, notFound, error: sendError, badRequest, conflict, created } = require('../../common/utils/response');
const { parsePagination, paginatedResponse } = require('../../common/utils/pagination');
const { logAudit } = require('../../common/utils/auditLog');
const logger = require('../../common/utils/logger');

const PASSWORD_MIN_LENGTH = 8;
const isStrongPassword = (password) => {
  if (typeof password !== 'string' || password.length < PASSWORD_MIN_LENGTH) return false;
  return /[a-z]/.test(password) && /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password);
};
const getPasswordValidationMessage = () =>
  `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères, avec une minuscule, une majuscule, un chiffre et un caractère spécial`;

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

// GET /api/superadmin/stats
const getStats = async (req, res) => {
  try {
    const debutMois = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const [total, actives, suspendues, gratuit, pro, business, nouveauxCeMois] = await prisma.$transaction([
      prisma.boutique.count({ where: { deletedAt: null } }),
      prisma.boutique.count({ where: { deletedAt: null, statut: 'ACTIVE' } }),
      prisma.boutique.count({ where: { deletedAt: null, statut: 'SUSPENDUE' } }),
      prisma.boutique.count({ where: { deletedAt: null, plan: 'GRATUIT' } }),
      prisma.boutique.count({ where: { deletedAt: null, plan: 'PRO' } }),
      prisma.boutique.count({ where: { deletedAt: null, plan: 'BUSINESS' } }),
      prisma.boutique.count({ where: { deletedAt: null, createdAt: { gte: debutMois } } }),
    ]);

    return success(res, {
      total,
      actives,
      suspendues,
      parPlan: { GRATUIT: gratuit, PRO: pro, BUSINESS: business },
      nouveauxCeMois,
    });
  } catch (err) {
    logger.error('Erreur getStats superadmin', err);
    return sendError(res, 'Erreur serveur', 500, { code: 'SUPERADMIN_STATS_FAILED' });
  }
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

// POST /api/superadmin/admins
const createAdmin = async (req, res) => {
  try {
    const { prenom, nom, email, password } = req.body;
    if (!prenom || !nom || !email || !password) {
      return badRequest(res, 'Tous les champs sont requis');
    }
    if (!isStrongPassword(password)) {
      return badRequest(res, getPasswordValidationMessage(), { code: 'WEAK_PASSWORD' });
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return conflict(res, 'Cet email est déjà utilisé', { code: 'EMAIL_ALREADY_USED' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        prenom,
        nom,
        email,
        password: hashedPassword,
        role: 'SUPERADMIN',
        actif: true,
        emailVerifie: true,
        boutiqueId: null,
      },
      select: { id: true, prenom: true, nom: true, email: true, role: true, createdAt: true },
    });

    logAudit(prisma, {
      action: 'CREATE',
      entite: 'user',
      entiteId: user.id,
      message: `Nouveau SUPERADMIN créé: ${email} (par superadmin id:${req.user.id})`,
      userId: req.user.id,
      boutiqueId: null,
    });

    return created(res, user, 'Compte SUPERADMIN créé');
  } catch (err) {
    logger.error('Erreur createAdmin superadmin', err);
    return sendError(res, 'Erreur serveur', 500, { code: 'SUPERADMIN_CREATE_ADMIN_FAILED' });
  }
};

// GET /api/superadmin/boutiques/export
const exportBoutiques = async (req, res) => {
  try {
    const { plan, statut, q } = req.query;
    const where = { deletedAt: null };
    if (plan) where.plan = plan;
    if (statut) where.statut = statut;
    if (q) where.nom = { contains: q, mode: 'insensitive' };

    const boutiques = await prisma.boutique.findMany({
      where,
      include: {
        _count: { select: { users: true, ventes: true } },
        abonnements: {
          where: { statut: 'ACTIF' },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { dateFin: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const header = 'id,nom,email,plan,statut,nbUsers,nbVentes,createdAt,abonnement_dateFin';
    const rows = boutiques.map(b => {
      const dateFin = b.abonnements[0]?.dateFin ? new Date(b.abonnements[0].dateFin).toISOString() : '';
      const nom = `"${(b.nom || '').replace(/"/g, '""')}"`;
      const email = `"${(b.email || '').replace(/"/g, '""')}"`;
      return [b.id, nom, email, b.plan, b.statut, b._count.users, b._count.ventes, new Date(b.createdAt).toISOString(), dateFin].join(',');
    });

    const csv = [header, ...rows].join('\n');
    const date = new Date().toISOString().slice(0, 10);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="boutiques-${date}.csv"`);
    return res.send(csv);
  } catch (err) {
    logger.error('Erreur exportBoutiques superadmin', err);
    return sendError(res, 'Erreur serveur', 500, { code: 'SUPERADMIN_EXPORT_FAILED' });
  }
};

// GET /api/superadmin/audit-logs
const getAuditLogs = async (req, res) => {
  try {
    const { page, limit, skip, take } = parsePagination(req.query);
    const { boutiqueId, action, entite, from, to } = req.query;

    const where = {};
    if (boutiqueId) where.boutiqueId = parseInt(boutiqueId);
    if (action) where.action = action;
    if (entite) where.entite = entite;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [logs, total] = await prisma.$transaction([
      prisma.auditLog.findMany({
        where,
        include: {
          boutique: { select: { id: true, nom: true } },
          user: { select: { id: true, prenom: true, nom: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json(paginatedResponse(logs, total, page, limit));
  } catch (err) {
    logger.error('Erreur getAuditLogs superadmin', err);
    return sendError(res, 'Erreur serveur', 500, { code: 'SUPERADMIN_AUDIT_LOGS_FAILED' });
  }
};

module.exports = { getBoutiques, getBoutique, changePlan, toggleStatut, softDelete, getStats, createAdmin, exportBoutiques, getAuditLogs };

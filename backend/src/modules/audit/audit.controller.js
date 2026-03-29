// Contrôleur Audit
const prisma = require('../../config/database');
const { error: sendError } = require('../../common/utils/response');
const { parsePagination, paginatedResponse } = require('../../common/utils/pagination');
const logger = require('../../common/utils/logger');

const getAuditLogs = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const { page, limit, skip, take } = parsePagination(req.query);

    const where = { boutiqueId: req.boutiqueId };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate + 'T23:59:59.999Z');
    }

    const [logs, total] = await prisma.$transaction([
      prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { nom: true, prenom: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.auditLog.count({ where }),
    ]);

    const data = logs.map(log => ({
      id: log.id,
      action: log.action,
      entite: log.entite,
      message: log.message,
      utilisateur: log.user
        ? { nom: `${log.user.prenom} ${log.user.nom}`, email: log.user.email }
        : null,
      createdAt: log.createdAt,
    }));

    res.json(paginatedResponse(data, total, page, limit));
  } catch (error) {
    logger.error('Erreur getAuditLogs', error);
    return sendError(res, 'Erreur serveur', 500, { code: 'AUDIT_FETCH_FAILED' });
  }
};

module.exports = { getAuditLogs };

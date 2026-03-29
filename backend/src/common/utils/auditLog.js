// Utilitaire d'audit — enregistre un log sans jamais faire échouer l'action principale
const logger = require('./logger');

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{ action: string, entite: string, entiteId?: number, message: string, userId?: number, boutiqueId: number }} params
 */
const logAudit = async (prisma, { action, entite, entiteId, message, userId, boutiqueId }) => {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        entite,
        entiteId: entiteId ?? null,
        message,
        userId: userId ?? null,
        boutiqueId,
      },
    });
  } catch (err) {
    logger.error('[AUDIT] Echec enregistrement log', { action, entite, err: err.message });
  }
};

module.exports = { logAudit };

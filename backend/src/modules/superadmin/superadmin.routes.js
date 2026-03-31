// Routes Super-Admin
const router = require('express').Router();
const ctrl = require('./superadmin.controller');
const { auth, superAdminOnly } = require('../../middleware/auth.middleware');
const { createRateLimiter } = require('../../middleware/security.middleware');
const { validateBoutiqueId, validateChangePlan, validateCreateAdmin, validateAuditLogsQuery, validateBoutiquesQuery } = require('./superadmin.validation');

// Rate limiter spécifique aux routes super-admin (60 req/min par utilisateur)
const superAdminRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  message: 'Trop de requêtes, réessayez dans une minute.',
  keyGenerator: (req) => `superadmin:${req.user?.id || req.ip || 'anonymous'}`,
});

router.use(auth, superAdminOnly, superAdminRateLimiter);

router.get('/stats',                  ctrl.getStats);
router.get('/dashboard',              ctrl.getDashboard);
router.get('/boutiques',              validateBoutiquesQuery, ctrl.getBoutiques);
router.get('/boutiques/export',       validateBoutiquesQuery, ctrl.exportBoutiques);
router.get('/audit-logs',             validateAuditLogsQuery, ctrl.getAuditLogs);
router.get('/boutiques/:id',          validateBoutiqueId, ctrl.getBoutique);
router.post('/boutiques/:id/plan',    validateChangePlan, ctrl.changePlan);
router.patch('/boutiques/:id/statut', validateBoutiqueId, ctrl.toggleStatut);
router.delete('/boutiques/:id',       validateBoutiqueId, ctrl.softDelete);
router.post('/admins',                validateCreateAdmin, ctrl.createAdmin);

module.exports = router;

// Routes Super-Admin
const router = require('express').Router();
const ctrl = require('./superadmin.controller');
const { auth, superAdminOnly } = require('../../middleware/auth.middleware');
const { validateBoutiqueId, validateChangePlan, validateCreateAdmin, validateAuditLogsQuery, validateBoutiquesQuery } = require('./superadmin.validation');

router.use(auth, superAdminOnly);

router.get('/stats',                  ctrl.getStats);
router.get('/boutiques',              validateBoutiquesQuery, ctrl.getBoutiques);
router.get('/boutiques/export',       validateBoutiquesQuery, ctrl.exportBoutiques);
router.get('/audit-logs',             validateAuditLogsQuery, ctrl.getAuditLogs);
router.get('/boutiques/:id',          validateBoutiqueId, ctrl.getBoutique);
router.post('/boutiques/:id/plan',    validateChangePlan, ctrl.changePlan);
router.patch('/boutiques/:id/statut', validateBoutiqueId, ctrl.toggleStatut);
router.delete('/boutiques/:id',       validateBoutiqueId, ctrl.softDelete);
router.post('/admins',                validateCreateAdmin, ctrl.createAdmin);

module.exports = router;

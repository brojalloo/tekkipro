// Routes Super-Admin
const router = require('express').Router();
const ctrl = require('./superadmin.controller');
const { auth, superAdminOnly } = require('../../middleware/auth.middleware');

router.use(auth, superAdminOnly);

router.get('/stats',                  ctrl.getStats);
router.get('/boutiques',              ctrl.getBoutiques);
router.get('/boutiques/export',       ctrl.exportBoutiques);
router.get('/audit-logs',             ctrl.getAuditLogs);
router.get('/boutiques/:id',          ctrl.getBoutique);
router.post('/boutiques/:id/plan',    ctrl.changePlan);
router.patch('/boutiques/:id/statut', ctrl.toggleStatut);
router.delete('/boutiques/:id',       ctrl.softDelete);
router.post('/admins',                ctrl.createAdmin);

module.exports = router;

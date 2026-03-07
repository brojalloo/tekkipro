// Routes Factures
const router = require('express').Router();
const ctrl = require('../controllers/facture.controller');
const { auth, requirePlan } = require('../middleware/auth.middleware');

router.get('/:id/pdf', auth, requirePlan('PRO', 'BUSINESS'), ctrl.genererFacture);

module.exports = router;

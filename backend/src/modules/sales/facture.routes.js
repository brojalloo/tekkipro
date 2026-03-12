// Routes Factures
const router = require('express').Router();
const ctrl = require('./facture.controller');
const { auth, requirePlan } = require('../../middleware/auth.middleware');
const { handleValidationErrors } = require('../../middleware/validation.middleware');
const { factureIdValidation } = require('./facture.validation');

router.get('/:id/pdf', auth, requirePlan('PRO', 'BUSINESS'), factureIdValidation, handleValidationErrors, ctrl.genererFacture);

module.exports = router;

// Routes Ventes
const router = require('express').Router();
const ctrl = require('./vente.controller');
const { auth, adminOnly, checkPlanVentes } = require('../../middleware/auth.middleware');
const { handleValidationErrors } = require('../../middleware/validation.middleware');
const { createSaleValidation, listSalesValidation, saleIdValidation } = require('./vente.validation');
const { attachQuotaHeaders } = require('../../middleware/quota.middleware');

router.post('/', auth, checkPlanVentes, createSaleValidation, handleValidationErrors, ctrl.create, attachQuotaHeaders('Ventes'));
router.get('/', auth, listSalesValidation, handleValidationErrors, ctrl.getAll);
router.get('/:id', auth, saleIdValidation, handleValidationErrors, ctrl.getById);
router.patch('/:id/annuler', auth, adminOnly, saleIdValidation, handleValidationErrors, ctrl.annuler);

module.exports = router;

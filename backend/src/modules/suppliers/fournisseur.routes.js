// Routes Fournisseurs
const router = require('express').Router();
const ctrl = require('./fournisseur.controller');
const { auth, adminOnly, requirePlan } = require('../../middleware/auth.middleware');
const { handleValidationErrors } = require('../../middleware/validation.middleware');
const {
  createSupplierValidation,
  fournisseurIdValidation,
  updateSupplierValidation,
} = require('./fournisseur.validation');

router.get('/', auth, requirePlan('PRO', 'BUSINESS'), ctrl.getAll);
router.get('/:id', auth, requirePlan('PRO', 'BUSINESS'), fournisseurIdValidation, handleValidationErrors, ctrl.getById);
router.post('/', auth, adminOnly, requirePlan('PRO', 'BUSINESS'), createSupplierValidation, handleValidationErrors, ctrl.create);
router.put('/:id', auth, adminOnly, requirePlan('PRO', 'BUSINESS'), updateSupplierValidation, handleValidationErrors, ctrl.update);
router.delete('/:id', auth, adminOnly, requirePlan('PRO', 'BUSINESS'), fournisseurIdValidation, handleValidationErrors, ctrl.remove);

module.exports = router;

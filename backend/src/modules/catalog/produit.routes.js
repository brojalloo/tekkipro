// Routes Produits
const router = require('express').Router();
const ctrl = require('./produit.controller');
const { auth, adminOnly, checkPlanProduits } = require('../../middleware/auth.middleware');
const { handleValidationErrors } = require('../../middleware/validation.middleware');
const {
  createProductValidation,
  createUnitValidation,
  listProductsValidation,
  productIdValidation,
  updateProductValidation,
  updateUnitValidation,
  unitIdValidation,
} = require('./produit.validation');
const { attachQuotaHeaders } = require('../../middleware/quota.middleware');

router.get('/', auth, listProductsValidation, handleValidationErrors, ctrl.getAll);
router.get('/alertes', auth, ctrl.getAlertesStock);
router.get('/:id', auth, productIdValidation, handleValidationErrors, ctrl.getById);
router.post('/', auth, adminOnly, checkPlanProduits, createProductValidation, handleValidationErrors, ctrl.create, attachQuotaHeaders('Produits'));
router.put('/:id', auth, adminOnly, updateProductValidation, handleValidationErrors, ctrl.update);
router.delete('/:id', auth, adminOnly, productIdValidation, handleValidationErrors, ctrl.remove);

// Unités de vente
router.post('/:produitId/unites', auth, adminOnly, createUnitValidation, handleValidationErrors, ctrl.addUniteVente);
router.put('/unites/:uniteId', auth, adminOnly, updateUnitValidation, handleValidationErrors, ctrl.updateUniteVente);
router.delete('/unites/:uniteId', auth, adminOnly, unitIdValidation, handleValidationErrors, ctrl.removeUniteVente);

module.exports = router;

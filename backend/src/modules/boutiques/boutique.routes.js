// Routes Boutique
const router = require('express').Router();
const ctrl = require('./boutique.controller');
const { auth, adminOnly } = require('../../middleware/auth.middleware');
const { handleValidationErrors } = require('../../middleware/validation.middleware');
const {
  boutiqueIdValidation,
  createBoutiqueValidation,
  updateBoutiqueValidation,
} = require('./boutique.validation');

router.get('/', auth, ctrl.getInfo);
router.put('/', auth, adminOnly, updateBoutiqueValidation, handleValidationErrors, ctrl.updateInfo);

// Multi-boutique (plan BUSINESS)
router.get('/mes-boutiques', auth, adminOnly, ctrl.getMesBoutiques);
router.post('/nouvelle', auth, adminOnly, createBoutiqueValidation, handleValidationErrors, ctrl.createBoutique);
router.delete('/:id', auth, adminOnly, boutiqueIdValidation, handleValidationErrors, ctrl.deleteBoutique);

module.exports = router;

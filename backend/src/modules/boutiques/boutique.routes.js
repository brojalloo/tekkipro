// Routes Boutique
const router = require('express').Router();
const ctrl = require('./boutique.controller');
const { auth, adminOnly } = require('../../middleware/auth.middleware');
const { handleValidationErrors } = require('../../middleware/validation.middleware');
const { createRateLimiter } = require('../../middleware/security.middleware');
const {
  boutiqueIdValidation,
  createBoutiqueValidation,
  updateBoutiqueValidation,
} = require('./boutique.validation');

const uploadRateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: "Trop d'uploads. Reessayez dans quelques minutes.",
  keyGenerator: (req) => `upload:${req.user?.id || req.ip}`,
});

router.get('/', auth, ctrl.getInfo);
router.put('/', auth, adminOnly, updateBoutiqueValidation, handleValidationErrors, ctrl.updateInfo);
router.post('/logo', auth, adminOnly, uploadRateLimiter, ctrl.uploadLogo);

// Multi-boutique (plan BUSINESS)
router.get('/mes-boutiques', auth, adminOnly, ctrl.getMesBoutiques);
router.post('/nouvelle', auth, adminOnly, createBoutiqueValidation, handleValidationErrors, ctrl.createBoutique);
router.delete('/:id', auth, adminOnly, boutiqueIdValidation, handleValidationErrors, ctrl.deleteBoutique);

module.exports = router;

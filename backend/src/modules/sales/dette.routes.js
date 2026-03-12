// Routes Dettes
const router = require('express').Router();
const ctrl = require('./dette.controller');
const { auth } = require('../../middleware/auth.middleware');
const { handleValidationErrors } = require('../../middleware/validation.middleware');
const { listDettesValidation, rembourserDetteValidation } = require('./dette.validation');

router.get('/', auth, listDettesValidation, handleValidationErrors, ctrl.getAll);
router.post('/:id/rembourser', auth, rembourserDetteValidation, handleValidationErrors, ctrl.rembourser);

module.exports = router;

// Routes Stock
const router = require('express').Router();
const ctrl = require('./stock.controller');
const { auth, adminOnly } = require('../../middleware/auth.middleware');
const { handleValidationErrors } = require('../../middleware/validation.middleware');
const { stockEntryValidation, stockHistoryValidation } = require('./stock.validation');

router.post('/entree', auth, adminOnly, stockEntryValidation, handleValidationErrors, ctrl.entreeStock);
router.get('/historique', auth, stockHistoryValidation, handleValidationErrors, ctrl.getHistorique);
router.get('/inventaire', auth, ctrl.getInventaire);

module.exports = router;

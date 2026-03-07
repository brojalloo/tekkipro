// Routes Stock
const router = require('express').Router();
const ctrl = require('../controllers/stock.controller');
const { auth, adminOnly } = require('../middleware/auth.middleware');

router.post('/entree', auth, adminOnly, ctrl.entreeStock);
router.get('/historique', auth, ctrl.getHistorique);
router.get('/inventaire', auth, ctrl.getInventaire);

module.exports = router;

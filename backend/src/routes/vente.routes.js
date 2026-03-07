// Routes Ventes
const router = require('express').Router();
const ctrl = require('../controllers/vente.controller');
const { auth, adminOnly, checkPlanVentes } = require('../middleware/auth.middleware');

router.post('/', auth, checkPlanVentes, ctrl.create);
router.get('/', auth, ctrl.getAll);
router.get('/:id', auth, ctrl.getById);
router.patch('/:id/annuler', auth, adminOnly, ctrl.annuler);

module.exports = router;

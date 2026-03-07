// Routes Fournisseurs
const router = require('express').Router();
const ctrl = require('../controllers/fournisseur.controller');
const { auth, adminOnly, requirePlan } = require('../middleware/auth.middleware');

router.get('/', auth, requirePlan('PRO', 'BUSINESS'), ctrl.getAll);
router.get('/:id', auth, requirePlan('PRO', 'BUSINESS'), ctrl.getById);
router.post('/', auth, adminOnly, requirePlan('PRO', 'BUSINESS'), ctrl.create);
router.put('/:id', auth, adminOnly, requirePlan('PRO', 'BUSINESS'), ctrl.update);
router.delete('/:id', auth, adminOnly, requirePlan('PRO', 'BUSINESS'), ctrl.remove);

module.exports = router;

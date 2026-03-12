// Routes Catégories
const router = require('express').Router();
const ctrl = require('./categorie.controller');
const { auth, adminOnly, checkPlanCategories } = require('../../middleware/auth.middleware');

router.get('/', auth, ctrl.getAll);
router.post('/', auth, adminOnly, checkPlanCategories, ctrl.create);
router.put('/:id', auth, adminOnly, ctrl.update);
router.delete('/:id', auth, adminOnly, ctrl.remove);

module.exports = router;

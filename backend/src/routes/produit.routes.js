// Routes Produits
const router = require('express').Router();
const ctrl = require('../controllers/produit.controller');
const { auth, adminOnly, checkPlanProduits } = require('../middleware/auth.middleware');

router.get('/', auth, ctrl.getAll);
router.get('/alertes', auth, ctrl.getAlertesStock);
router.get('/:id', auth, ctrl.getById);
router.post('/', auth, adminOnly, checkPlanProduits, ctrl.create);
router.put('/:id', auth, adminOnly, ctrl.update);
router.delete('/:id', auth, adminOnly, ctrl.remove);

// Unités de vente
router.post('/:produitId/unites', auth, adminOnly, ctrl.addUniteVente);
router.put('/unites/:uniteId', auth, adminOnly, ctrl.updateUniteVente);
router.delete('/unites/:uniteId', auth, adminOnly, ctrl.removeUniteVente);

module.exports = router;

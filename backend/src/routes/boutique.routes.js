// Routes Boutique
const router = require('express').Router();
const ctrl = require('../controllers/boutique.controller');
const { auth, adminOnly } = require('../middleware/auth.middleware');

router.get('/', auth, ctrl.getInfo);
router.put('/', auth, adminOnly, ctrl.updateInfo);

// Multi-boutique (plan BUSINESS)
router.get('/mes-boutiques', auth, adminOnly, ctrl.getMesBoutiques);
router.post('/nouvelle', auth, adminOnly, ctrl.createBoutique);
router.delete('/:id', auth, adminOnly, ctrl.deleteBoutique);

module.exports = router;

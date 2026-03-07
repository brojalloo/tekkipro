// Routes Clients
const router = require('express').Router();
const ctrl = require('../controllers/client.controller');
const { auth, checkPlanClients } = require('../middleware/auth.middleware');

router.get('/', auth, ctrl.getAll);
router.get('/:id', auth, ctrl.getById);
router.post('/', auth, checkPlanClients, ctrl.create);
router.put('/:id', auth, ctrl.update);
router.delete('/:id', auth, ctrl.remove);

module.exports = router;
